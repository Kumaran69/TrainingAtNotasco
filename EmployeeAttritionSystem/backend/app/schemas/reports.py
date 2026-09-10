"""Pydantic schemas for report responses."""

from pydantic import BaseModel
from typing import Optional


class DepartmentCount(BaseModel):
    """Department employee count."""
    department: str
    count: int
    percentage: float


class SalaryStats(BaseModel):
    """Salary statistics."""
    average: float
    highest: float
    lowest: float
    median: float
    total_payroll: float


class DepartmentSalary(BaseModel):
    """Department-wise salary breakdown."""
    department: str
    average_salary: float
    min_salary: float
    max_salary: float
    employee_count: int


class TopEmployee(BaseModel):
    """Top employee by salary."""
    employee_id: str
    name: str
    department: str
    salary: float
    position: Optional[str] = None


class RiskSummary(BaseModel):
    """Attrition risk summary."""
    high_count: int
    medium_count: int
    low_count: int
    total: int
    high_percentage: float
    medium_percentage: float
    low_percentage: float


class AttritionReport(BaseModel):
    """Complete attrition report."""
    total_employees: int
    attrited_count: int
    active_count: int
    attrition_percentage: float
    department_counts: list[DepartmentCount]
    salary_stats: SalaryStats
    department_salaries: list[DepartmentSalary]
    top_paid: list[TopEmployee]
    low_satisfaction_count: int
    risk_summary: RiskSummary


class DashboardStats(BaseModel):
    """Real-time dashboard statistics."""
    total_employees: int
    active_employees: int
    average_salary: float
    attrition_rate: float
    high_risk_count: int
    avg_satisfaction: float
    avg_attendance: float
    departments: list[DepartmentCount]
