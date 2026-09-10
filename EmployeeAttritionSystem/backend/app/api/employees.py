"""Employee CRUD API routes — Tasks 2, 4, 7, 8."""

import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import io

from app.database import get_db
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.services.employee_manager import EmployeeManager
from app.services.risk_calculator import RiskCalculator
from app.services.report_generator import ReportGenerator
from app.core.dependencies import get_current_user
from app.core.exceptions import (
    DuplicateEmployeeError,
    EmployeeNotFoundError,
    InvalidAgeError,
    InvalidSalaryError,
    InvalidDepartmentError,
)
from app.models.user import User
from app.websocket_manager import manager

router = APIRouter(prefix="/api/employees", tags=["Employees"])


@router.get("/")
async def list_employees(
    query: Optional[str] = Query(None, description="Search by name, ID, or position"),
    department: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    min_salary: Optional[float] = Query(None),
    max_salary: Optional[float] = Query(None),
    attrition_status: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List/search employees with filters and pagination (Task 2)."""
    emp_manager = EmployeeManager(db)
    employees, total = await emp_manager.search_employees(
        query=query,
        department=department,
        risk_level=risk_level,
        min_salary=min_salary,
        max_salary=max_salary,
        attrition_status=attrition_status,
        skip=skip,
        limit=limit,
    )
    return {
        "employees": [EmployeeResponse.model_validate(e) for e in employees],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single employee by ID (Task 2)."""
    try:
        emp_manager = EmployeeManager(db)
        employee = await emp_manager.get_employee(employee_id)
        return EmployeeResponse.model_validate(employee)
    except EmployeeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new employee (Task 2) with validation (Task 4)."""
    try:
        emp_manager = EmployeeManager(db)
        employee = await emp_manager.add_employee(data)

        # Broadcast real-time event
        emp_data = EmployeeResponse.model_validate(employee).model_dump()
        await manager.broadcast(
            "employee_added",
            emp_data,
            user=current_user.full_name,
        )

        # If high risk, send risk alert
        if employee.risk_level == "High":
            await manager.broadcast_risk_alert(emp_data)

        # Broadcast stats update
        report_gen = ReportGenerator(db)
        stats = await report_gen.get_dashboard_stats()
        await manager.broadcast_stats_update(stats)

        return EmployeeResponse.model_validate(employee)

    except DuplicateEmployeeError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
    except InvalidAgeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except InvalidSalaryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except InvalidDepartmentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an employee's data (Task 2) with validation (Task 4)."""
    try:
        emp_manager = EmployeeManager(db)
        employee = await emp_manager.update_employee(employee_id, data)

        # Broadcast real-time event
        emp_data = EmployeeResponse.model_validate(employee).model_dump()
        await manager.broadcast(
            "employee_updated",
            emp_data,
            user=current_user.full_name,
        )

        # If risk changed to high, send alert
        if employee.risk_level == "High":
            await manager.broadcast_risk_alert(emp_data)

        # Broadcast stats update
        report_gen = ReportGenerator(db)
        stats = await report_gen.get_dashboard_stats()
        await manager.broadcast_stats_update(stats)

        return EmployeeResponse.model_validate(employee)

    except EmployeeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except InvalidAgeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except InvalidSalaryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except InvalidDepartmentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an employee (Task 2)."""
    try:
        emp_manager = EmployeeManager(db)
        info = await emp_manager.delete_employee(employee_id)

        # Broadcast real-time event
        await manager.broadcast(
            "employee_deleted",
            info,
            user=current_user.full_name,
        )

        # Broadcast stats update
        report_gen = ReportGenerator(db)
        stats = await report_gen.get_dashboard_stats()
        await manager.broadcast_stats_update(stats)

        return {"message": f"Employee {info['name']} deleted successfully", **info}

    except EmployeeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


# ---- Task 7: Export/Import ----

@router.get("/data/export")
async def export_employees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all employees to JSON (Task 7)."""
    emp_manager = EmployeeManager(db)
    employees = await emp_manager.get_all_employees()
    data = [e.to_dict() for e in employees]

    # Broadcast export event
    await manager.broadcast("data_exported", {"count": len(data)}, user=current_user.full_name)

    json_str = json.dumps({"employees": data, "total": len(data)}, indent=2, default=str)
    return StreamingResponse(
        io.BytesIO(json_str.encode()),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=employees.json"},
    )


@router.post("/data/import")
async def import_employees(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import employees from JSON file (Task 7)."""
    try:
        content = await file.read()
        data = json.loads(content)
        employees_data = data.get("employees", data) if isinstance(data, dict) else data

        emp_manager = EmployeeManager(db)
        result = await emp_manager.bulk_import(employees_data)

        # Broadcast import event
        await manager.broadcast("data_imported", result, user=current_user.full_name)

        # Broadcast stats update
        report_gen = ReportGenerator(db)
        stats = await report_gen.get_dashboard_stats()
        await manager.broadcast_stats_update(stats)

        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
