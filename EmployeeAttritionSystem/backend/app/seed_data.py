"""Seed data — Task 1.

Creates 25 realistic employees across 6 departments
with varied risk profiles, skills, and demographics.
Also creates the default admin user.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.employee import Employee
from app.models.user import User
from app.core.security import hash_password
from app.services.risk_calculator import RiskCalculator


SEED_EMPLOYEES = [
    {
        "employee_id": "EMP001", "name": "Rajesh Kumar", "age": 35, "department": "Engineering",
        "salary": 95000, "experience": 12, "satisfaction": 4.2, "attendance": 96,
        "overtime": False, "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "attrition_status": False, "email": "rajesh.kumar@company.com", "phone": "+91-9876543210",
        "position": "Senior Software Engineer",
    },
    {
        "employee_id": "EMP002", "name": "Priya Sharma", "age": 28, "department": "Marketing",
        "salary": 62000, "experience": 5, "satisfaction": 3.8, "attendance": 92,
        "overtime": True, "skills": ["SEO", "Content Strategy", "Google Analytics"],
        "attrition_status": False, "email": "priya.sharma@company.com", "phone": "+91-9876543211",
        "position": "Marketing Specialist",
    },
    {
        "employee_id": "EMP003", "name": "Amit Patel", "age": 42, "department": "Sales",
        "salary": 78000, "experience": 18, "satisfaction": 2.1, "attendance": 72,
        "overtime": True, "skills": ["CRM", "Negotiation", "B2B Sales"],
        "attrition_status": False, "email": "amit.patel@company.com", "phone": "+91-9876543212",
        "position": "Sales Manager",
    },
    {
        "employee_id": "EMP004", "name": "Sneha Reddy", "age": 31, "department": "HR",
        "salary": 58000, "experience": 7, "satisfaction": 4.5, "attendance": 98,
        "overtime": False, "skills": ["Recruitment", "Employee Relations", "HRIS"],
        "attrition_status": False, "email": "sneha.reddy@company.com", "phone": "+91-9876543213",
        "position": "HR Manager",
    },
    {
        "employee_id": "EMP005", "name": "Vikram Singh", "age": 26, "department": "Engineering",
        "salary": 55000, "experience": 1, "satisfaction": 1.8, "attendance": 68,
        "overtime": True, "skills": ["JavaScript", "React", "Node.js"],
        "attrition_status": False, "email": "vikram.singh@company.com", "phone": "+91-9876543214",
        "position": "Junior Developer",
    },
    {
        "employee_id": "EMP006", "name": "Neha Gupta", "age": 38, "department": "Finance",
        "salary": 88000, "experience": 14, "satisfaction": 3.5, "attendance": 94,
        "overtime": False, "skills": ["Financial Modeling", "Excel", "SAP", "Budgeting"],
        "attrition_status": False, "email": "neha.gupta@company.com", "phone": "+91-9876543215",
        "position": "Senior Financial Analyst",
    },
    {
        "employee_id": "EMP007", "name": "Arjun Mehta", "age": 24, "department": "Engineering",
        "salary": 48000, "experience": 1, "satisfaction": 2.0, "attendance": 75,
        "overtime": True, "skills": ["Java", "Spring Boot"],
        "attrition_status": False, "email": "arjun.mehta@company.com", "phone": "+91-9876543216",
        "position": "Software Engineer",
    },
    {
        "employee_id": "EMP008", "name": "Kavitha Nair", "age": 45, "department": "Operations",
        "salary": 72000, "experience": 20, "satisfaction": 3.2, "attendance": 90,
        "overtime": True, "skills": ["Supply Chain", "Logistics", "Six Sigma", "Lean"],
        "attrition_status": False, "email": "kavitha.nair@company.com", "phone": "+91-9876543217",
        "position": "Operations Director",
    },
    {
        "employee_id": "EMP009", "name": "Rohit Joshi", "age": 33, "department": "Sales",
        "salary": 67000, "experience": 9, "satisfaction": 4.0, "attendance": 93,
        "overtime": False, "skills": ["Account Management", "SaaS Sales", "Salesforce"],
        "attrition_status": False, "email": "rohit.joshi@company.com", "phone": "+91-9876543218",
        "position": "Account Executive",
    },
    {
        "employee_id": "EMP010", "name": "Divya Krishnan", "age": 29, "department": "Marketing",
        "salary": 54000, "experience": 4, "satisfaction": 1.5, "attendance": 65,
        "overtime": True, "skills": ["Social Media", "Brand Strategy"],
        "attrition_status": True, "email": "divya.krishnan@company.com", "phone": "+91-9876543219",
        "position": "Social Media Manager",
    },
    {
        "employee_id": "EMP011", "name": "Suresh Raman", "age": 50, "department": "Finance",
        "salary": 110000, "experience": 25, "satisfaction": 3.8, "attendance": 88,
        "overtime": False, "skills": ["Auditing", "Tax Planning", "Compliance", "Risk Management"],
        "attrition_status": False, "email": "suresh.raman@company.com", "phone": "+91-9876543220",
        "position": "CFO",
    },
    {
        "employee_id": "EMP012", "name": "Ananya Iyer", "age": 27, "department": "Engineering",
        "salary": 72000, "experience": 4, "satisfaction": 4.3, "attendance": 97,
        "overtime": False, "skills": ["Python", "Machine Learning", "TensorFlow", "Data Science"],
        "attrition_status": False, "email": "ananya.iyer@company.com", "phone": "+91-9876543221",
        "position": "ML Engineer",
    },
    {
        "employee_id": "EMP013", "name": "Karthik Subramanian", "age": 36, "department": "Operations",
        "salary": 65000, "experience": 10, "satisfaction": 2.5, "attendance": 78,
        "overtime": True, "skills": ["Project Management", "Agile", "JIRA"],
        "attrition_status": False, "email": "karthik.s@company.com", "phone": "+91-9876543222",
        "position": "Project Manager",
    },
    {
        "employee_id": "EMP014", "name": "Meera Desai", "age": 32, "department": "HR",
        "salary": 52000, "experience": 6, "satisfaction": 3.9, "attendance": 95,
        "overtime": False, "skills": ["Training", "Onboarding", "Performance Management"],
        "attrition_status": False, "email": "meera.desai@company.com", "phone": "+91-9876543223",
        "position": "Training Coordinator",
    },
    {
        "employee_id": "EMP015", "name": "Rahul Verma", "age": 23, "department": "Sales",
        "salary": 42000, "experience": 1, "satisfaction": 1.9, "attendance": 70,
        "overtime": True, "skills": ["Cold Calling", "Lead Generation"],
        "attrition_status": False, "email": "rahul.verma@company.com", "phone": "+91-9876543224",
        "position": "Sales Associate",
    },
    {
        "employee_id": "EMP016", "name": "Lakshmi Venkatesh", "age": 40, "department": "Engineering",
        "salary": 120000, "experience": 16, "satisfaction": 4.7, "attendance": 99,
        "overtime": False, "skills": ["System Architecture", "Cloud", "AWS", "Kubernetes", "Microservices"],
        "attrition_status": False, "email": "lakshmi.v@company.com", "phone": "+91-9876543225",
        "position": "Principal Architect",
    },
    {
        "employee_id": "EMP017", "name": "Sanjay Chauhan", "age": 34, "department": "Marketing",
        "salary": 70000, "experience": 8, "satisfaction": 3.1, "attendance": 85,
        "overtime": True, "skills": ["Digital Marketing", "PPC", "Email Marketing", "HubSpot"],
        "attrition_status": False, "email": "sanjay.c@company.com", "phone": "+91-9876543226",
        "position": "Digital Marketing Lead",
    },
    {
        "employee_id": "EMP018", "name": "Pooja Bhatt", "age": 30, "department": "Finance",
        "salary": 60000, "experience": 5, "satisfaction": 2.3, "attendance": 80,
        "overtime": True, "skills": ["Accounting", "QuickBooks", "Payroll"],
        "attrition_status": False, "email": "pooja.bhatt@company.com", "phone": "+91-9876543227",
        "position": "Accountant",
    },
    {
        "employee_id": "EMP019", "name": "Deepak Agarwal", "age": 48, "department": "Operations",
        "salary": 85000, "experience": 22, "satisfaction": 3.6, "attendance": 91,
        "overtime": False, "skills": ["Warehouse Management", "ERP", "Process Optimization"],
        "attrition_status": False, "email": "deepak.a@company.com", "phone": "+91-9876543228",
        "position": "Operations Manager",
    },
    {
        "employee_id": "EMP020", "name": "Ritu Saxena", "age": 25, "department": "HR",
        "salary": 45000, "experience": 2, "satisfaction": 4.1, "attendance": 94,
        "overtime": False, "skills": ["Recruitment", "Interviewing", "LinkedIn Sourcing"],
        "attrition_status": False, "email": "ritu.saxena@company.com", "phone": "+91-9876543229",
        "position": "Recruiter",
    },
    {
        "employee_id": "EMP021", "name": "Manoj Tiwari", "age": 37, "department": "Sales",
        "salary": 82000, "experience": 13, "satisfaction": 3.4, "attendance": 87,
        "overtime": True, "skills": ["Enterprise Sales", "Channel Partners", "Revenue Strategy"],
        "attrition_status": False, "email": "manoj.t@company.com", "phone": "+91-9876543230",
        "position": "Regional Sales Head",
    },
    {
        "employee_id": "EMP022", "name": "Swati Jain", "age": 22, "department": "Engineering",
        "salary": 40000, "experience": 0, "satisfaction": 3.7, "attendance": 92,
        "overtime": False, "skills": ["HTML", "CSS", "JavaScript", "React"],
        "attrition_status": False, "email": "swati.jain@company.com", "phone": "+91-9876543231",
        "position": "Frontend Intern",
    },
    {
        "employee_id": "EMP023", "name": "Arun Prasad", "age": 55, "department": "Finance",
        "salary": 130000, "experience": 30, "satisfaction": 2.8, "attendance": 82,
        "overtime": False, "skills": ["Strategic Planning", "M&A", "Investor Relations", "Board Reporting"],
        "attrition_status": True, "email": "arun.prasad@company.com", "phone": "+91-9876543232",
        "position": "VP Finance",
    },
    {
        "employee_id": "EMP024", "name": "Nisha Kapoor", "age": 29, "department": "Marketing",
        "salary": 58000, "experience": 3, "satisfaction": 1.6, "attendance": 60,
        "overtime": True, "skills": ["Content Writing", "Copywriting"],
        "attrition_status": True, "email": "nisha.kapoor@company.com", "phone": "+91-9876543233",
        "position": "Content Writer",
    },
    {
        "employee_id": "EMP025", "name": "Ganesh Kulkarni", "age": 41, "department": "Operations",
        "salary": 75000, "experience": 15, "satisfaction": 3.0, "attendance": 86,
        "overtime": True, "skills": ["Quality Assurance", "ISO Standards", "Vendor Management"],
        "attrition_status": False, "email": "ganesh.k@company.com", "phone": "+91-9876543234",
        "position": "QA Lead",
    },
]


async def seed_employees(session: AsyncSession):
    """Seed the database with initial employees and default admin user.

    Only seeds if the employees table is empty (first run).
    Default admin: admin@company.com / admin123
    """
    # Check if data already exists
    result = await session.execute(select(func.count(Employee.id)))
    count = result.scalar()

    # Create default admin user if missing
    existing_admin = await session.execute(
        select(User).where(User.email == "admin@company.com")
    )
    if not existing_admin.scalar_one_or_none():
        admin = User(
            email="admin@company.com",
            hashed_password=hash_password("admin123"),
            full_name="System Admin",
            role="admin",
        )
        session.add(admin)

    # Create default employee/viewer user if missing
    existing_user = await session.execute(
        select(User).where(User.email == "user@company.com")
    )
    if not existing_user.scalar_one_or_none():
        user = User(
            email="user@company.com",
            hashed_password=hash_password("user123"),
            full_name="Sarah Jenkins (Employee)",
            role="viewer",
        )
        session.add(user)

    await session.commit()

    if count and count > 0:
        return  # Employees already seeded
    risk_calc = RiskCalculator(session)

    # Seed employees
    for data in SEED_EMPLOYEES:
        employee = Employee(**data)

        # Calculate risk score
        score, level = await risk_calc.calculate_risk(employee)
        employee.risk_score = score
        employee.risk_level = level

        session.add(employee)

    await session.commit()
    print(f"[OK] Seeded {len(SEED_EMPLOYEES)} employees and default admin user")
