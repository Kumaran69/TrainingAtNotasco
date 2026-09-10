"""Person base class — Task 3: OOP Inheritance.

Person serves as the parent class with protected attributes
that are accessed through getter/setter properties.
"""


class Person:
    """Base class representing a person with protected attributes.

    Attributes:
        _name (str): Protected name of the person.
        _age (int): Protected age of the person.
    """

    def __init__(self, name: str, age: int):
        self._name = name
        self._age = age

    @property
    def name(self) -> str:
        """Get the person's name."""
        return self._name

    @name.setter
    def name(self, value: str):
        """Set the person's name with validation."""
        if not value or not isinstance(value, str):
            raise ValueError("Name must be a non-empty string")
        if len(value.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        self._name = value.strip()

    @property
    def age(self) -> int:
        """Get the person's age."""
        return self._age

    @age.setter
    def age(self, value: int):
        """Set the person's age with validation."""
        if not isinstance(value, (int, float)):
            raise ValueError("Age must be a number")
        value = int(value)
        if value < 18 or value > 65:
            raise ValueError("Age must be between 18 and 65")
        self._age = value

    def get_info(self) -> dict:
        """Return person's basic information."""
        return {"name": self._name, "age": self._age}

    def __repr__(self) -> str:
        return f"Person(name='{self._name}', age={self._age})"
