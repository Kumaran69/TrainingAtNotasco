"""
ScholarLedger API
-------------------
Combines two classic file-handling exercises into one real-world student
dashboard: an expense tracker (plain text file) and a quiz score manager
(CSV file), unified behind a fast, cached FastAPI backend.

Run:
    uvicorn main:app --reload
"""
import logging
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from storage import ExpenseStore, ScoreStore
from models import (
    ExpenseCreate, Expense, ExpenseSummary,
    ScoreCreate, Score, ScoreSummary, DashboardSummary,
)

logging.basicConfig(level="INFO", format="%(asctime)s %(levelname)s :: %(message)s")
logger = logging.getLogger("scholarledger")

app = FastAPI(title="ScholarLedger API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

expense_store = ExpenseStore()
score_store = ScoreStore()


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


# ===========================================================
# EXPENSES
# ===========================================================

@app.post("/api/expenses", response_model=Expense)
async def add_expense(req: ExpenseCreate):
    entry = await expense_store.add(req.category.strip(), req.amount, req.date.strip())
    logger.info("Expense added: %s $%.2f on %s", entry["category"], entry["amount"], entry["date"])
    return entry


@app.get("/api/expenses", response_model=list[Expense])
async def list_expenses(
    category: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
):
    return expense_store.list_all(category=category, limit=limit, skip=skip)


@app.get("/api/expenses/summary", response_model=ExpenseSummary)
async def expense_summary():
    return ExpenseSummary(
        total=expense_store.total(),
        count=expense_store.count(),
        by_category=expense_store.total_by_category(),
    )


# ===========================================================
# QUIZ SCORES
# ===========================================================

@app.post("/api/scores", response_model=Score)
async def add_score(req: ScoreCreate):
    entry = await score_store.add(req.name.strip(), req.subject.strip(), req.score)
    logger.info("Score added: %s - %s: %.1f", entry["name"], entry["subject"], entry["score"])
    return entry


@app.get("/api/scores", response_model=list[Score])
async def list_scores(
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
):
    return score_store.list_all(limit=limit, skip=skip)


@app.get("/api/scores/search", response_model=list[Score])
async def search_scores(name: str = Query(..., min_length=1)):
    return score_store.search_by_name(name)


@app.get("/api/scores/summary", response_model=ScoreSummary)
async def score_summary():
    return ScoreSummary(
        average=score_store.average(),
        count=score_store.count(),
        by_subject=score_store.average_by_subject(),
    )


# ===========================================================
# COMBINED DASHBOARD
# ===========================================================

@app.get("/api/dashboard", response_model=DashboardSummary)
async def dashboard():
    """One call powers the home screen -- avoids two separate round trips
    for what is, from the user's perspective, a single view."""
    return DashboardSummary(
        expense_total=expense_store.total(),
        expense_count=expense_store.count(),
        quiz_average=score_store.average(),
        quiz_count=score_store.count(),
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
