"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://attrition_admin:attrition_secret_2024@db:5432/employee_attrition_db"

    # JWT
    SECRET_KEY: str = "super-secret-jwt-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # App
    APP_NAME: str = "Employee Attrition Prediction System"
    DEBUG: bool = True

    # Departments
    VALID_DEPARTMENTS: list[str] = [
        "Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
