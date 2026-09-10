"""Analysis & Reports API — Task 6."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.report_generator import ReportGenerator
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/analysis", tags=["Analysis & Reports"])


@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get real-time dashboard statistics."""
    report_gen = ReportGenerator(db)
    return await report_gen.get_dashboard_stats()


@router.get("/reports")
async def get_full_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate complete attrition report (Task 6)."""
    report_gen = ReportGenerator(db)
    return await report_gen.get_full_report()


@router.get("/departments")
async def get_department_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Department-wise employee count (Task 6)."""
    report_gen = ReportGenerator(db)
    return {
        "counts": await report_gen.get_department_counts(),
        "salaries": await report_gen.get_department_salaries(),
    }


@router.get("/salary")
async def get_salary_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Salary statistics — avg, highest, lowest (Task 6)."""
    report_gen = ReportGenerator(db)
    return await report_gen.get_salary_stats()


@router.get("/top-paid")
async def get_top_paid(
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top N highest-paid employees (Task 6)."""
    report_gen = ReportGenerator(db)
    return await report_gen.get_top_paid(limit)


@router.get("/low-satisfaction")
async def get_low_satisfaction(
    threshold: float = 2.0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Low-satisfaction employees (Task 6)."""
    report_gen = ReportGenerator(db)
    return await report_gen.get_low_satisfaction_employees(threshold)


@router.get("/attrition")
async def get_attrition_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attrition percentage (Task 6)."""
    report_gen = ReportGenerator(db)
    return await report_gen.get_attrition_stats()
