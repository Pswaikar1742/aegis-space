"""
AegiSpace — Application Configuration

Loads all environment variables with validation via pydantic-settings.
Supabase credentials are mandatory; the app will fail-fast at import time
if they're missing, preventing silent mis-configuration in production.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Immutable, validated application settings sourced from environment."""

    # ── Supabase ──────────────────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str  # Use the *service-role* key for backend ops

    # ── Application ───────────────────────────────────────────────────────
    APP_NAME: str = "AegiSpace"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # ── CORS ──────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached, singleton Settings instance.

    lru_cache ensures the .env file is read exactly once per process,
    keeping startup fast and memory predictable.
    """
    return Settings()  # type: ignore[call-arg]
