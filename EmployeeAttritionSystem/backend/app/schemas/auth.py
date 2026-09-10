"""Pydantic schemas for authentication."""

from pydantic import BaseModel, Field, field_validator


class UserRegister(BaseModel):
    """Schema for user registration."""
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="admin")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip()


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True
