"""
Centralized, typed configuration. Reads from environment variables / .env.
Using pydantic-settings means bad config (e.g. a non-integer rate limit)
fails loudly at startup instead of causing a confusing runtime error later.
"""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongo_uri: str = Field(default="mongodb://localhost:27017", alias="MONGO_URI")
    db_name: str = Field(default="railcart", alias="DB_NAME")

    # Master key used only to create/revoke API keys via /api/admin/keys.
    # Keep this out of source control -- it's the "root" credential.
    master_key: str = Field(default="", alias="RAILCART_MASTER_KEY")

    # Comma-separated list, e.g. "http://localhost:5173,https://myapp.com"
    allowed_origins: str = Field(default="*", alias="RAILCART_ALLOWED_ORIGINS")

    # Requests allowed per API key (or per IP, if unauthenticated) per
    # minute before a 429 is returned.
    rate_limit_per_minute: int = Field(default=120, alias="RAILCART_RATE_LIMIT_PER_MINUTE")

    log_level: str = Field(default="INFO", alias="RAILCART_LOG_LEVEL")

    # JWT auth for real user accounts. If left blank, a random secret is
    # generated at startup -- fine for local dev, but it means existing
    # tokens are invalidated every restart. Set a fixed value in .env for
    # anything beyond quick local testing.
    jwt_secret: str = Field(default="", alias="RAILCART_JWT_SECRET")
    jwt_expire_minutes: int = Field(default=1440, alias="RAILCART_JWT_EXPIRE_MINUTES")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    @property
    def origins_list(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
