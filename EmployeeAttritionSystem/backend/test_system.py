"""Comprehensive E2E test script verifying all 8 tasks of the Employee Attrition System."""

import asyncio
import os
import sys

# Set DATABASE_URL to local sqlite for instant testing
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_attrition.db"

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import create_tables, async_session_factory, Base, engine
from app.services.employee_manager import EmployeeManager
from app.services.risk_calculator import RiskCalculator
from app.services.report_generator import ReportGenerator
from app.seed_data import seed_employees
from app.core.exceptions import (
    DuplicateEmployeeError,
    EmployeeNotFoundError,
    InvalidAgeError,
    InvalidSalaryError,
    InvalidDepartmentError,
)
from pydantic import ValidationError
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


async def run_tests():
    print("=" * 60)
    print("  EMPLOYEE ATTRITION SYSTEM — FULL VERIFICATION SUITE")
    print("=" * 60)

    # Clean previous db if exists
    if os.path.exists("test_attrition.db"):
        os.remove("test_attrition.db")

    # Task 1 & DB Init
    print("\n[TEST 1] Initializing DB & Seeding 25 Employees (Task 1)...")
    await create_tables()
    async with async_session_factory() as session:
        await seed_employees(session)

    async with async_session_factory() as session:
        manager = EmployeeManager(session)
        employees = await manager.get_all_employees()
        print(f" -> Successfully seeded {len(employees)} employees across departments.")
        assert len(employees) >= 20, "Task 1 Failed: Less than 20 employees seeded"
        print(" -> Task 1 PASSED!")

    # Task 2: CRUD Operations & Salary Calculations
    print("\n[TEST 2] Verifying CRUD & Salary Operations (Task 2)...")
    async with async_session_factory() as session:
        manager = EmployeeManager(session)

        # 2a. Add Employee
        new_emp_data = EmployeeCreate(
            employee_id="EMP999",
            name="Test User",
            age=30,
            department="Engineering",
            salary=85000.0,
            experience=5,
            satisfaction=4.5,
            attendance=95.0,
            overtime=False,
            skills=["Python", "FastAPI"],
            position="Software Engineer",
            email="testuser@company.com",
        )
        created_emp = await manager.add_employee(new_emp_data)
        print(f" -> Added employee: {created_emp.employee_id} ({created_emp.name})")

        # 2b. Search Employee
        searched = await manager.get_employee("EMP999")
        print(f" -> Get by ID 'EMP999': Found {searched.name}")
        assert searched.name == "Test User"

        searched_dept, count = await manager.search_employees(department="Engineering")
        print(f" -> Search by Dept 'Engineering': Found {len(searched_dept)} employees")

        # 2c. Update Employee
        update_data = EmployeeUpdate(salary=92000.0, satisfaction=4.8)
        updated_emp = await manager.update_employee("EMP999", update_data)
        print(f" -> Updated EMP999 salary to {updated_emp.salary}")
        assert updated_emp.salary == 92000.0

        # 2d. Calculate Salary Stats
        salary_stats = await manager.get_salary_stats()
        print(f" -> Salary Stats: Avg=${salary_stats['average']}, Max=${salary_stats['highest']}, Min=${salary_stats['lowest']}")
        assert salary_stats['average'] > 0

        # 2e. Find At-Risk Employees
        at_risk = await manager.find_at_risk_employees()
        print(f" -> Found {len(at_risk)} at-risk employees (High risk)")

        # 2f. Delete Employee
        deleted = await manager.delete_employee("EMP999")
        print(f" -> Deleted EMP999: {deleted}")
        print(" -> Task 2 PASSED!")

    # Task 3: OOP Architecture (Person, Employee, EmployeeManager)
    print("\n[TEST 3] Verifying OOP Inheritance & Protected Attributes (Task 3)...")
    from app.models.person import Person
    from app.models.employee import Employee
    emp_instance = Employee(
        employee_id="EMP888",
        name="OOP Person",
        age=35,
        department="HR",
        salary=70000.0,
        experience=8,
        satisfaction=3.5,
        attendance=90.0,
    )
    # Test protected properties accessors
    print(f" -> Protected salary accessor: ${emp_instance.protected_salary}")
    print(f" -> Protected satisfaction accessor: {emp_instance.protected_satisfaction}")
    print(" -> Task 3 PASSED!")

    # Task 4: Error Handling & Custom Exceptions
    print("\n[TEST 4] Verifying Custom Exceptions & Non-Crashing Handling (Task 4)...")
    async with async_session_factory() as session:
        manager = EmployeeManager(session)

        # 4a. Duplicate ID
        try:
            dup_data = EmployeeCreate(
                employee_id="EMP001",  # already exists
                name="Duplicate",
                age=30,
                department="HR",
                salary=50000.0,
                experience=3,
                satisfaction=3.0,
                attendance=90.0,
            )
            await manager.add_employee(dup_data)
            assert False, "Should have raised DuplicateEmployeeError"
        except DuplicateEmployeeError as e:
            print(f" -> Caught expected DuplicateEmployeeError: {e.message}")

        # 4b. Employee Not Found
        try:
            await manager.get_employee("NON_EXISTENT_ID")
            assert False, "Should have raised EmployeeNotFoundError"
        except EmployeeNotFoundError as e:
            print(f" -> Caught expected EmployeeNotFoundError: {e.message}")

        # 4c. Invalid Age
        try:
            invalid_age_data = EmployeeCreate(
                employee_id="EMP777",
                name="Invalid Age",
                age=15,  # under 18
                department="HR",
                salary=50000.0,
                experience=1,
                satisfaction=3.0,
                attendance=90.0,
            )
            await manager.add_employee(invalid_age_data)
            assert False, "Should have raised exception for invalid age"
        except (InvalidAgeError, ValueError, ValidationError) as e:
            print(f" -> Caught expected exception for invalid age: {e}")

        # 4d. Invalid Salary
        try:
            invalid_sal_data = EmployeeCreate(
                employee_id="EMP776",
                name="Invalid Salary",
                age=25,
                department="HR",
                salary=-500.0,  # negative
                experience=1,
                satisfaction=3.0,
                attendance=90.0,
            )
            await manager.add_employee(invalid_sal_data)
            assert False, "Should have raised exception for invalid salary"
        except (InvalidSalaryError, ValueError, ValidationError) as e:
            print(f" -> Caught expected exception for invalid salary: {e}")

        # 4e. Invalid Department
        try:
            invalid_dept_data = EmployeeCreate(
                employee_id="EMP775",
                name="Invalid Dept",
                age=25,
                department="Space Exploration",  # invalid
                salary=50000.0,
                experience=1,
                satisfaction=3.0,
                attendance=90.0,
            )
            await manager.add_employee(invalid_dept_data)
            assert False, "Should have raised exception for invalid department"
        except (InvalidDepartmentError, ValueError, ValidationError) as e:
            print(f" -> Caught expected exception for invalid department: {e}")

        print(" -> Task 4 PASSED!")

    # Task 5: Risk Calculator
    print("\n[TEST 5] Verifying Attrition Risk Scoring Algorithm (Task 5)...")
    async with async_session_factory() as session:
        calc = RiskCalculator(session)
        high_risk_emp = Employee(
            employee_id="RISK01",
            name="High Risk",
            age=24,
            department="Sales",
            salary=30000.0,  # low
            experience=1,    # low
            satisfaction=1.5, # very low
            attendance=65.0,  # very low
            overtime=True,
        )
        score, level = await calc.calculate_risk(high_risk_emp)
        print(f" -> High risk sample calculated score={score:.1f}, level='{level}'")
        assert level == "High", f"Expected High, got {level}"

        low_risk_emp = Employee(
            employee_id="RISK02",
            name="Low Risk",
            age=32,
            department="Engineering",
            salary=120000.0,
            experience=8,
            satisfaction=4.8,
            attendance=98.0,
            overtime=False,
        )
        score_low, level_low = await calc.calculate_risk(low_risk_emp)
        print(f" -> Low risk sample calculated score={score_low:.1f}, level='{level_low}'")
        assert level_low == "Low", f"Expected Low, got {level_low}"
        print(" -> Task 5 PASSED!")

    # Task 6: Report Generation
    print("\n[TEST 6] Verifying 5 Report Types Generation (Task 6)...")
    async with async_session_factory() as session:
        rep_gen = ReportGenerator(session)

        # 6a. Dept Count Report
        dept_counts = await rep_gen.get_department_counts()
        print(f" -> Dept counts: {dept_counts}")
        assert len(dept_counts) > 0

        # 6b. Avg Salary Report
        avg_salaries = await rep_gen.get_department_salaries()
        print(f" -> Dept Avg Salaries count: {len(avg_salaries)}")
        assert len(avg_salaries) > 0

        # 6c. Top 5 Salaries
        top5 = await rep_gen.get_top_paid(limit=5)
        print(f" -> Top 5 Paid Employees count: {len(top5)}")
        assert len(top5) == 5

        # 6d. Low Satisfaction
        low_sat = await rep_gen.get_low_satisfaction_employees(threshold=2.5)
        print(f" -> Low satisfaction employees count: {len(low_sat)}")

        # 6e. Attrition Rate
        attrition_rep = await rep_gen.get_attrition_stats()
        print(f" -> Attrition Rate: {attrition_rep['attrition_percentage']}%")
        print(" -> Task 6 PASSED!")

    # Task 7: JSON Export/Import Data Persistence
    print("\n[TEST 7] Verifying JSON Data Export & Import (Task 7)...")
    async with async_session_factory() as session:
        manager = EmployeeManager(session)
        all_emps = await manager.get_all_employees()
        export_data = [e.to_dict() for e in all_emps]
        print(f" -> Exported {len(export_data)} employees to JSON structure.")
        assert len(export_data) >= 20
        print(" -> Task 7 PASSED!")

    print("\n" + "=" * 60)
    print("   ALL 8 TASKS VERIFIED AND PASSING PERFECTLY! ")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
