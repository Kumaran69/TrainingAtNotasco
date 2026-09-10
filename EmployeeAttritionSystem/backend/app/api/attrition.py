"""Attrition Risk API — Task 5."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.risk_calculator import RiskCalculator
from app.services.employee_manager import EmployeeManager
from app.services.report_generator import ReportGenerator
from app.core.dependencies import get_current_user
from app.core.exceptions import EmployeeNotFoundError
from app.models.user import User
from app.websocket_manager import manager
from fastapi import HTTPException, status

router = APIRouter(prefix="/api/attrition", tags=["Attrition Risk"])


@router.get("/risk")
async def get_risk_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get risk distribution overview (Task 5)."""
    report_gen = ReportGenerator(db)
    risk = await report_gen.get_risk_summary()

    # Also get at-risk employees
    emp_manager = EmployeeManager(db)
    high_risk = await emp_manager.find_at_risk_employees("High")
    medium_risk = await emp_manager.find_at_risk_employees("Medium")

    from app.schemas.employee import EmployeeResponse

    return {
        "summary": risk,
        "high_risk_employees": [EmployeeResponse.model_validate(e).model_dump() for e in high_risk],
        "medium_risk_employees": [EmployeeResponse.model_validate(e).model_dump() for e in medium_risk],
    }


@router.get("/risk/{employee_id}")
async def get_employee_risk(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed risk breakdown for a specific employee (Task 5)."""
    try:
        emp_manager = EmployeeManager(db)
        employee = await emp_manager.get_employee(employee_id)

        risk_calc = RiskCalculator(db)
        dept_avg = await risk_calc._get_department_avg_salary(employee.department)
        breakdown = risk_calc.get_risk_breakdown(employee, dept_avg)

        from app.schemas.employee import EmployeeResponse

        return {
            "employee": EmployeeResponse.model_validate(employee).model_dump(),
            "risk_breakdown": breakdown,
            "total_score": employee.risk_score,
            "risk_level": employee.risk_level,
        }
    except EmployeeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/recalculate")
async def recalculate_all_risks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recalculate risk scores for all employees (Task 5)."""
    risk_calc = RiskCalculator(db)
    updates = await risk_calc.calculate_all_risks()

    # Broadcast risk recalculation event
    changed = [u for u in updates if u["changed"]]
    await manager.broadcast(
        "risk_recalculated",
        {"total": len(updates), "changed": len(changed), "updates": changed[:10]},
        user=current_user.full_name,
    )

    # Send alerts for newly high-risk employees
    for u in changed:
        if u["new_level"] == "High":
            await manager.broadcast_risk_alert(u)

    return {
        "message": "Risk recalculation complete",
        "total_employees": len(updates),
        "changes": len(changed),
        "details": updates,
    }
