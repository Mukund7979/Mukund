# Smart Expense Tracker — PRD

## Original problem statement
"Smart Expense Tracker"

## User choices (locked)
- Authentication: **None** (single-user local app)
- Categorization: **Rule-based only** (keyword dictionary, ~11 categories + Other)
- Core features: Add/Edit/Delete expenses, Dashboard charts, Budgets & alerts, Receipt image upload, CSV export
- Design: Dark Swiss Noir fintech dashboard (Outfit + Manrope + JetBrains Mono, 0px radius, monochrome + profit/loss/warning accents)

## Architecture
- **Backend**: FastAPI @ `/api/*`, MongoDB via `motor`. Collections: `expenses`, `budgets`. UUID string IDs.
- **Frontend**: React + Tailwind + Shadcn UI + Recharts + Phosphor Icons. Routes: `/`, `/expenses`, `/budgets`, `/insights`.
- **Persistence**: MongoDB (no local storage). Receipts stored as base64 data URLs inline.

## Personas
- Solo user tracking personal expenses, budgets, receipts.

## Implemented (Feb 2026)
- Backend endpoints: `/api/categories`, `/api/categorize`, `/api/expenses` (CRUD + filters), `/api/budgets` (CRUD, upsert by category), `/api/dashboard/summary` (totals, trend, categories, budget status, recent), `/api/expenses/export/csv`.
- Frontend pages: Dashboard, Expenses table w/ filters + search + edit/delete + receipt preview, Budgets (progress bars + alerts), Insights (bar chart + ranking).
- Auto-categorization on description blur.
- CSV export via sidebar.
- Dark Swiss Noir design applied end-to-end.

## Testing status
- iteration_1.json — 100% pass backend + frontend (initial MVP).

## Backlog / Next
- **P1**: OCR-based auto-fill of amount/merchant from uploaded receipts (Gemini Nano Banana vision).
- **P1**: Recurring expenses (monthly rent, subscriptions auto-added).
- **P2**: Multi-currency + FX conversion.
- **P2**: PDF report export.
- **P2**: Category customization (add/rename categories, edit keyword rules).
- **P2**: Data import (bank CSV mapping wizard).
- **P3**: PWA / mobile install.
