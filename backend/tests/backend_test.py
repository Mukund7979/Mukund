"""Backend regression tests for Smart Expense Tracker after refactor iteration."""
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback to reading frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1]
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

CURRENT_MONTH = datetime.now(timezone.utc).strftime("%Y-%m")
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def created_ids():
    return {"expenses": [], "budgets": []}


@pytest.fixture(scope="session", autouse=True)
def cleanup(session, created_ids):
    yield
    for eid in created_ids["expenses"]:
        try:
            session.delete(f"{API}/expenses/{eid}", timeout=10)
        except Exception:
            pass
    for bid in created_ids["budgets"]:
        try:
            session.delete(f"{API}/budgets/{bid}", timeout=10)
        except Exception:
            pass


# ----- Categorization -----
class TestCategories:
    def test_get_categories(self, session):
        r = session.get(f"{API}/categories", timeout=10)
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert "Food & Dining" in cats
        assert "Transport" in cats
        assert "Other" in cats
        assert len(cats) >= 12

    def test_categorize_uber(self, session):
        r = session.post(f"{API}/categorize", json={"description": "Uber airport"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["category"] == "Transport"

    def test_categorize_starbucks(self, session):
        r = session.post(f"{API}/categorize", json={"description": "Starbucks coffee"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["category"] == "Food & Dining"

    def test_categorize_unknown(self, session):
        r = session.post(f"{API}/categorize", json={"description": "asdf random xyz"}, timeout=10)
        assert r.json()["category"] == "Other"


# ----- Expenses CRUD -----
class TestExpensesCRUD:
    def test_create_auto_category(self, session, created_ids):
        payload = {
            "description": f"TEST_Uber airport {uuid.uuid4().hex[:6]}",
            "amount": 250.0,
            "date": TODAY,
            "notes": "regression test",
        }
        r = session.post(f"{API}/expenses", json=payload, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["category"] == "Transport"
        assert data["amount"] == 250.0
        assert data["description"] == payload["description"]
        assert "id" in data
        created_ids["expenses"].append(data["id"])

        # Verify persistence via GET
        r2 = session.get(f"{API}/expenses/{data['id']}", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["description"] == payload["description"]

    def test_create_explicit_category(self, session, created_ids):
        payload = {
            "description": "TEST_Manual entry",
            "amount": 99.5,
            "category": "Shopping",
            "date": TODAY,
        }
        r = session.post(f"{API}/expenses", json=payload, timeout=10)
        assert r.status_code == 200
        assert r.json()["category"] == "Shopping"
        created_ids["expenses"].append(r.json()["id"])

    def test_list_expenses_filter_category(self, session, created_ids):
        r = session.get(f"{API}/expenses", params={"category": "Transport"}, timeout=10)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # Our transport test expense should be in there
        ids = [x["id"] for x in rows]
        assert any(eid in ids for eid in created_ids["expenses"])
        for row in rows:
            assert row["category"] == "Transport"

    def test_list_expenses_search(self, session):
        r = session.get(f"{API}/expenses", params={"search": "TEST_Uber"}, timeout=10)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        for row in rows:
            assert "test_uber" in row["description"].lower()

    def test_update_expense(self, session, created_ids):
        eid = created_ids["expenses"][0]
        r = session.put(f"{API}/expenses/{eid}", json={"amount": 275.0}, timeout=10)
        assert r.status_code == 200
        assert r.json()["amount"] == 275.0

        # Verify persistence
        r2 = session.get(f"{API}/expenses/{eid}", timeout=10)
        assert r2.json()["amount"] == 275.0

    def test_update_recategorizes_on_description_change(self, session, created_ids):
        eid = created_ids["expenses"][1]
        r = session.put(
            f"{API}/expenses/{eid}",
            json={"description": "TEST_Netflix subscription"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["category"] == "Entertainment"

    def test_delete_expense(self, session, created_ids):
        # Create one to delete
        payload = {"description": "TEST_ToDelete", "amount": 1.0, "date": TODAY}
        r = session.post(f"{API}/expenses", json=payload, timeout=10)
        eid = r.json()["id"]
        d = session.delete(f"{API}/expenses/{eid}", timeout=10)
        assert d.status_code == 200
        assert d.json().get("success") is True
        # Verify 404
        g = session.get(f"{API}/expenses/{eid}", timeout=10)
        assert g.status_code == 404


# ----- Budgets -----
class TestBudgets:
    def test_create_budget(self, session, created_ids):
        r = session.post(
            f"{API}/budgets",
            json={"category": "Food & Dining", "amount": 5000.0, "period": "monthly"},
            timeout=10,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["category"] == "Food & Dining"
        assert data["amount"] == 5000.0
        assert "id" in data
        created_ids["budgets"].append(data["id"])

    def test_upsert_same_category(self, session, created_ids):
        # Second call with same category should update, not duplicate
        r = session.post(
            f"{API}/budgets",
            json={"category": "Food & Dining", "amount": 6000.0, "period": "monthly"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["amount"] == 6000.0

        # verify only one budget for that category
        lst = session.get(f"{API}/budgets", timeout=10).json()
        food_budgets = [b for b in lst if b["category"] == "Food & Dining"]
        assert len(food_budgets) == 1

    def test_list_budgets(self, session):
        r = session.get(f"{API}/budgets", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_delete_budget(self, session, created_ids):
        # create a budget just to delete
        r = session.post(
            f"{API}/budgets",
            json={"category": "Utilities", "amount": 2000.0},
            timeout=10,
        )
        bid = r.json()["id"]
        d = session.delete(f"{API}/budgets/{bid}", timeout=10)
        assert d.status_code == 200
        assert d.json().get("success") is True


# ----- Dashboard summary -----
class TestDashboard:
    def test_summary_shape(self, session):
        r = session.get(f"{API}/dashboard/summary", timeout=10)
        assert r.status_code == 200
        data = r.json()
        required = {
            "month",
            "total_month",
            "total_prev",
            "change_pct",
            "transaction_count",
            "category_breakdown",
            "monthly_trend",
            "budget_status",
            "recent_expenses",
        }
        assert required.issubset(data.keys()), f"missing: {required - set(data.keys())}"
        assert isinstance(data["category_breakdown"], list)
        assert isinstance(data["monthly_trend"], list)
        assert len(data["monthly_trend"]) == 6
        assert isinstance(data["budget_status"], list)
        assert isinstance(data["recent_expenses"], list)
        # Each trend entry has month/label/total
        for t in data["monthly_trend"]:
            assert "month" in t and "label" in t and "total" in t

    def test_summary_contains_current_month_expense(self, session, created_ids):
        r = session.get(f"{API}/dashboard/summary", timeout=10)
        data = r.json()
        # transaction_count should be >0 because of our created test expenses
        assert data["transaction_count"] >= 1
        # category_breakdown should contain Transport
        cats = [c["category"] for c in data["category_breakdown"]]
        assert "Transport" in cats or "Entertainment" in cats

    def test_summary_budget_status_shape(self, session):
        r = session.get(f"{API}/dashboard/summary", timeout=10)
        for b in r.json()["budget_status"]:
            assert set(b.keys()) >= {"id", "category", "budget", "spent", "remaining", "percentage", "status"}
            assert b["status"] in ("ok", "warning", "over")


# ----- CSV export -----
class TestCSVExport:
    def test_export_csv(self, session):
        r = session.get(f"{API}/expenses/export/csv", timeout=15)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        body = r.text
        assert "Date,Description,Category,Amount,Notes" in body.splitlines()[0]
