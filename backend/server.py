from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Smart Expense Tracker")
api_router = APIRouter(prefix="/api")

# ----- Categorization Rules -----
CATEGORY_RULES = {
    "Food & Dining": ["restaurant", "cafe", "coffee", "starbucks", "mcdonald", "kfc", "pizza", "dominos", "burger", "food", "swiggy", "zomato", "ubereats", "doordash", "grubhub", "chipotle", "subway", "dinner", "lunch", "breakfast", "bakery"],
    "Transport": ["uber", "lyft", "taxi", "cab", "ola", "gas", "fuel", "petrol", "parking", "metro", "subway", "bus", "train", "flight", "airline", "toll"],
    "Shopping": ["amazon", "flipkart", "ebay", "walmart", "target", "costco", "mall", "store", "shop", "clothes", "clothing", "nike", "adidas", "zara", "h&m", "myntra"],
    "Groceries": ["grocery", "supermarket", "kroger", "safeway", "trader", "whole foods", "aldi", "bigbasket", "instacart", "vegetables", "fruits"],
    "Entertainment": ["netflix", "spotify", "hulu", "disney", "movie", "cinema", "concert", "theatre", "youtube", "prime video", "hbo", "game", "steam", "playstation", "xbox"],
    "Utilities": ["electric", "electricity", "water", "gas bill", "internet", "wifi", "phone", "mobile", "verizon", "att", "comcast", "utility"],
    "Health": ["pharmacy", "doctor", "hospital", "medical", "medicine", "cvs", "walgreens", "clinic", "dental", "gym", "fitness"],
    "Rent & Housing": ["rent", "mortgage", "landlord", "apartment", "housing", "hoa"],
    "Travel": ["hotel", "airbnb", "booking", "expedia", "trip", "vacation", "resort", "flight"],
    "Education": ["udemy", "coursera", "book", "tuition", "school", "college", "course"],
    "Subscriptions": ["subscription", "membership", "adobe", "notion", "figma", "github", "slack"],
}

def categorize(description: str) -> str:
    if not description:
        return "Other"
    desc = description.lower()
    for cat, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw in desc:
                return cat
    return "Other"

DEFAULT_CATEGORIES = list(CATEGORY_RULES.keys()) + ["Other"]

# ----- Models -----
class ExpenseBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    description: str
    amount: float
    category: Optional[str] = None
    date: str  # ISO date string YYYY-MM-DD
    notes: Optional[str] = ""
    receipt: Optional[str] = None  # base64 data URL

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    receipt: Optional[str] = None

class Expense(ExpenseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BudgetBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category: str
    amount: float
    period: str = "monthly"  # monthly for now

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    amount: Optional[float] = None

class Budget(BudgetBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CategorizeRequest(BaseModel):
    description: str

# ----- Routes -----
@api_router.get("/")
async def root():
    return {"message": "Smart Expense Tracker API"}

@api_router.get("/categories")
async def get_categories():
    return {"categories": DEFAULT_CATEGORIES}

@api_router.post("/categorize")
async def categorize_endpoint(req: CategorizeRequest):
    return {"category": categorize(req.description)}

# --- Expenses ---
@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    if not payload.category:
        payload.category = categorize(payload.description)
    expense = Expense(**payload.model_dump())
    await db.expenses.insert_one(expense.model_dump())
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
):
    query = {}
    if category and category != "All":
        query["category"] = category
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    if search:
        query["description"] = {"$regex": search, "$options": "i"}
    docs = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return docs

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    doc = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    return doc

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, payload: ExpenseUpdate):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "description" in update_data and "category" not in update_data:
        update_data["category"] = categorize(update_data["description"])
    result = await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    doc = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    return doc

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"success": True}

@api_router.get("/expenses/export/csv")
async def export_csv():
    docs = await db.expenses.find({}, {"_id": 0, "receipt": 0}).sort("date", -1).to_list(10000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Date", "Description", "Category", "Amount", "Notes"])
    for d in docs:
        writer.writerow([d.get("date", ""), d.get("description", ""), d.get("category", ""), d.get("amount", 0), d.get("notes", "")])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{datetime.now().strftime('%Y%m%d')}.csv"},
    )

# --- Budgets ---
@api_router.post("/budgets", response_model=Budget)
async def create_budget(payload: BudgetCreate):
    existing = await db.budgets.find_one({"category": payload.category})
    if existing:
        await db.budgets.update_one({"category": payload.category}, {"$set": {"amount": payload.amount}})
        doc = await db.budgets.find_one({"category": payload.category}, {"_id": 0})
        return doc
    budget = Budget(**payload.model_dump())
    await db.budgets.insert_one(budget.model_dump())
    return budget

@api_router.get("/budgets", response_model=List[Budget])
async def list_budgets():
    docs = await db.budgets.find({}, {"_id": 0}).to_list(200)
    return docs

@api_router.put("/budgets/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, payload: BudgetUpdate):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.budgets.update_one({"id": budget_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    doc = await db.budgets.find_one({"id": budget_id}, {"_id": 0})
    return doc

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    result = await db.budgets.delete_one({"id": budget_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"success": True}

# --- Dashboard summary ---
@api_router.get("/dashboard/summary")
async def dashboard_summary(month: Optional[str] = None):
    # month format YYYY-MM (defaults to current)
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    start = f"{month}-01"
    # end = last day; simpler: use next month prefix
    year, mon = map(int, month.split("-"))
    if mon == 12:
        end = f"{year+1}-01-01"
    else:
        end = f"{year}-{mon+1:02d}-01"

    # Current month expenses
    month_docs = await db.expenses.find(
        {"date": {"$gte": start, "$lt": end}}, {"_id": 0}
    ).to_list(10000)
    total_month = sum(d["amount"] for d in month_docs)

    # Category breakdown
    cat_breakdown = defaultdict(float)
    for d in month_docs:
        cat_breakdown[d.get("category", "Other")] += d["amount"]
    category_data = [{"category": k, "amount": round(v, 2)} for k, v in sorted(cat_breakdown.items(), key=lambda x: -x[1])]

    # Last 6 months trend
    trend = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        mstart = f"{y}-{m:02d}-01"
        if m == 12:
            mend = f"{y+1}-01-01"
        else:
            mend = f"{y}-{m+1:02d}-01"
        docs = await db.expenses.find(
            {"date": {"$gte": mstart, "$lt": mend}}, {"_id": 0, "amount": 1}
        ).to_list(10000)
        trend.append({
            "month": f"{y}-{m:02d}",
            "label": datetime(y, m, 1).strftime("%b"),
            "total": round(sum(d["amount"] for d in docs), 2),
        })

    # Budget vs actual
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(200)
    budget_status = []
    for b in budgets:
        spent = cat_breakdown.get(b["category"], 0)
        pct = (spent / b["amount"] * 100) if b["amount"] > 0 else 0
        budget_status.append({
            "id": b["id"],
            "category": b["category"],
            "budget": b["amount"],
            "spent": round(spent, 2),
            "remaining": round(b["amount"] - spent, 2),
            "percentage": round(pct, 1),
            "status": "over" if pct > 100 else ("warning" if pct >= 80 else "ok"),
        })

    # Recent expenses (top 5 across all)
    recent = await db.expenses.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)

    # Totals for comparison (previous month)
    prev_end = start
    prev_year = year
    prev_mon = mon - 1
    if prev_mon == 0:
        prev_mon = 12
        prev_year -= 1
    prev_start = f"{prev_year}-{prev_mon:02d}-01"
    prev_docs = await db.expenses.find(
        {"date": {"$gte": prev_start, "$lt": prev_end}}, {"_id": 0, "amount": 1}
    ).to_list(10000)
    total_prev = sum(d["amount"] for d in prev_docs)
    change_pct = ((total_month - total_prev) / total_prev * 100) if total_prev > 0 else 0

    return {
        "month": month,
        "total_month": round(total_month, 2),
        "total_prev": round(total_prev, 2),
        "change_pct": round(change_pct, 1),
        "transaction_count": len(month_docs),
        "category_breakdown": category_data,
        "monthly_trend": trend,
        "budget_status": budget_status,
        "recent_expenses": recent,
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
