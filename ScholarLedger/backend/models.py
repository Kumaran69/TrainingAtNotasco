from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    category: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    date: str = Field(..., description="YYYY-MM-DD")


class Expense(BaseModel):
    id: int
    category: str
    amount: float
    date: str


class ExpenseSummary(BaseModel):
    total: float
    count: int
    by_category: dict[str, float]


class ScoreCreate(BaseModel):
    name: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    score: float = Field(..., ge=0)


class Score(BaseModel):
    id: int
    name: str
    subject: str
    score: float


class ScoreSummary(BaseModel):
    average: float
    count: int
    by_subject: dict[str, float]


class DashboardSummary(BaseModel):
    """Powers the combined home view -- one call instead of two round trips."""
    expense_total: float
    expense_count: int
    quiz_average: float
    quiz_count: int
