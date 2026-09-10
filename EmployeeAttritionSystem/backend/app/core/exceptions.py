"""Custom exceptions for Task 4 — robust error handling.

All custom exceptions are caught by global handlers in main.py
and return proper HTTP error responses. The app never crashes.
"""


class DuplicateEmployeeError(Exception):
    """Raised when trying to add an employee with an existing ID."""

    def __init__(self, employee_id: str):
        self.employee_id = employee_id
        self.message = f"Employee with ID '{employee_id}' already exists"
        super().__init__(self.message)


class EmployeeNotFoundError(Exception):
    """Raised when an employee is not found."""

    def __init__(self, employee_id: str):
        self.employee_id = employee_id
        self.message = f"Employee with ID '{employee_id}' not found"
        super().__init__(self.message)


class InvalidAgeError(Exception):
    """Raised when age is outside the valid range (18-65)."""

    def __init__(self, age: int):
        self.age = age
        self.message = f"Invalid age: {age}. Age must be between 18 and 65"
        super().__init__(self.message)


class InvalidSalaryError(Exception):
    """Raised when salary is negative or zero."""

    def __init__(self, salary: float):
        self.salary = salary
        self.message = f"Invalid salary: {salary}. Salary must be a positive number"
        super().__init__(self.message)


class InvalidDepartmentError(Exception):
    """Raised when department is not in the valid list."""

    VALID_DEPARTMENTS = [
        "Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"
    ]

    def __init__(self, department: str):
        self.department = department
        self.message = (
            f"Invalid department: '{department}'. "
            f"Must be one of: {', '.join(self.VALID_DEPARTMENTS)}"
        )
        super().__init__(self.message)


class InvalidInputError(Exception):
    """Raised for any other invalid user input."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class AuthenticationError(Exception):
    """Raised for authentication failures."""

    def __init__(self, message: str = "Invalid credentials"):
        self.message = message
        super().__init__(self.message)
