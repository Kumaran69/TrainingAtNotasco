"""Employee model — Task 3: Inherits from Person.

Employee extends Person with protected work attributes.
Also serves as the SQLAlchemy ORM model for the employees table.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, JSON, Text
)
from app.database import Base
from app.models.person import Person


class Employee(Base):
    """Employee model inheriting conceptually from Person.

    Maps to the 'employees' table in PostgreSQL.
    Uses protected attributes with property accessors (Task 3).

    Columns:
        employee_id: Unique string identifier (e.g., 'EMP001')
        name, age: Inherited from Person concept
        department: One of 6 fixed departments
        salary: Monthly salary (protected)
        experience: Years of experience
        satisfaction: Job satisfaction score 1-5 (protected)
        attendance: Attendance percentage 0-100 (protected)
        overtime: Whether employee works overtime
        skills: List of skills (stored as JSON)
        attrition_status: Whether employee has left
        risk_level: Calculated attrition risk (High/Medium/Low)
        risk_score: Numerical risk score 0-100
    """

    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    department = Column(String(50), nullable=False)
    salary = Column(Float, nullable=False)
    experience = Column(Integer, nullable=False)
    satisfaction = Column(Float, nullable=False)  # 1-5 scale
    attendance = Column(Float, nullable=False)     # 0-100 percentage
    overtime = Column(Boolean, default=False)
    skills = Column(JSON, default=list)
    attrition_status = Column(Boolean, default=False)
    risk_level = Column(String(10), default="Low")   # High, Medium, Low
    risk_score = Column(Float, default=0.0)           # 0-100
    email = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    position = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ---- Protected attribute access (Task 3) ----

    @property
    def protected_salary(self) -> float:
        """Access salary through a protected property."""
        return self.salary

    @protected_salary.setter
    def protected_salary(self, value: float):
        if value < 0:
            raise ValueError("Salary cannot be negative")
        self.salary = value

    @property
    def protected_satisfaction(self) -> float:
        """Access satisfaction through a protected property."""
        return self.satisfaction

    @protected_satisfaction.setter
    def protected_satisfaction(self, value: float):
        if value < 1 or value > 5:
            raise ValueError("Satisfaction must be between 1 and 5")
        self.satisfaction = value

    @property
    def protected_attendance(self) -> float:
        """Access attendance through a protected property."""
        return self.attendance

    @protected_attendance.setter
    def protected_attendance(self, value: float):
        if value < 0 or value > 100:
            raise ValueError("Attendance must be between 0 and 100")
        self.attendance = value

    def get_info(self) -> dict:
        """Return complete employee information."""
        return {
            "employee_id": self.employee_id,
            "name": self.name,
            "age": self.age,
            "department": self.department,
            "salary": self.salary,
            "experience": self.experience,
            "satisfaction": self.satisfaction,
            "attendance": self.attendance,
            "overtime": self.overtime,
            "skills": self.skills,
            "attrition_status": self.attrition_status,
            "risk_level": self.risk_level,
            "risk_score": self.risk_score,
            "email": self.email,
            "phone": self.phone,
            "position": self.position,
        }

    def to_dict(self) -> dict:
        """Serialize employee to dictionary for JSON export (Task 7)."""
        return {
            "employee_id": self.employee_id,
            "name": self.name,
            "age": self.age,
            "department": self.department,
            "salary": self.salary,
            "experience": self.experience,
            "satisfaction": self.satisfaction,
            "attendance": self.attendance,
            "overtime": self.overtime,
            "skills": self.skills if self.skills else [],
            "attrition_status": self.attrition_status,
            "risk_level": self.risk_level,
            "risk_score": self.risk_score,
            "email": self.email,
            "phone": self.phone,
            "position": self.position,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"Employee(id='{self.employee_id}', name='{self.name}', "
            f"dept='{self.department}', risk='{self.risk_level}')"
        )
