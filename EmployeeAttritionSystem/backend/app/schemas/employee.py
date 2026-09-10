"""Pydantic schemas for employee request/response validation."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class EmployeeCreate(BaseModel):
    """Schema for creating a new employee."""
    employee_id: str = Field(..., min_length=1, max_length=20, description="Unique employee ID (e.g., EMP001)")
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    age: int = Field(..., ge=18, le=65, description="Age (18-65)")
    department: str = Field(..., description="Department name")
    salary: float = Field(..., gt=0, description="Monthly salary")
    experience: int = Field(..., ge=0, le=45, description="Years of experience")
    satisfaction: float = Field(..., ge=1, le=5, description="Satisfaction score (1-5)")
    attendance: float = Field(..., ge=0, le=100, description="Attendance percentage (0-100)")
    overtime: bool = Field(default=False, description="Works overtime?")
    skills: list[str] = Field(default=[], description="List of skills")
    attrition_status: bool = Field(default=False, description="Has the employee left?")
    email: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    position: Optional[str] = Field(None, max_length=100)

    @field_validator("department")
    @classmethod
    def validate_department(cls, v):
        valid = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"]
        if v not in valid:
            raise ValueError(f"Invalid department. Must be one of: {', '.join(valid)}")
        return v

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v):
        if v and len(v) > 10:
            raise ValueError("Maximum 10 skills allowed")
        return [s.strip() for s in v if s.strip()]


class EmployeeUpdate(BaseModel):
    """Schema for updating an employee — all fields optional."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=18, le=65)
    department: Optional[str] = None
    salary: Optional[float] = Field(None, gt=0)
    experience: Optional[int] = Field(None, ge=0, le=45)
    satisfaction: Optional[float] = Field(None, ge=1, le=5)
    attendance: Optional[float] = Field(None, ge=0, le=100)
    overtime: Optional[bool] = None
    skills: Optional[list[str]] = None
    attrition_status: Optional[bool] = None
    email: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    position: Optional[str] = Field(None, max_length=100)

    @field_validator("department")
    @classmethod
    def validate_department(cls, v):
        if v is None:
            return v
        valid = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"]
        if v not in valid:
            raise ValueError(f"Invalid department. Must be one of: {', '.join(valid)}")
        return v


class EmployeeResponse(BaseModel):
    """Schema for employee API responses."""
    id: int
    employee_id: str
    name: str
    age: int
    department: str
    salary: float
    experience: int
    satisfaction: float
    attendance: float
    overtime: bool
    skills: list[str]
    attrition_status: bool
    risk_level: str
    risk_score: float
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeSearchQuery(BaseModel):
    """Schema for employee search parameters."""
    query: Optional[str] = None
    department: Optional[str] = None
    risk_level: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    attrition_status: Optional[bool] = None
