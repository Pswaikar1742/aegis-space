"""
AegiSpace — Application Configuration

Loads all environment variables with validation via pydantic-settings.
SQLite-backed — no external database credentials required.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Immutable, validated application settings sourced from environment."""

    # ── Legacy Supabase (optional — kept for backward compat) ─────────────
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # ── FastRouter LLM ────────────────────────────────────────────────────
    FASTROUTER_API_KEY: Optional[str] = None
    FASTROUTER_BASE_URL: str = "https://api.fastrouter.io/v1"
    FASTROUTER_MODEL: str = "gpt-4o"

    # ── Application ───────────────────────────────────────────────────────
    APP_NAME: str = "AegiSpace"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    PORT: int = 8080

    # ── CORS ──────────────────────────────────────────────────────────────
    # Local dev + Vercel production / preview deployments
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "https://aegispace.vercel.app",
        "https://aegis-space.vercel.app",
        "https://*.vercel.app",
    ]

    # Crucial: ignore extra keys in .env that aren't modeled here
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached, singleton Settings instance.

    lru_cache ensures the .env file is read exactly once per process,
    keeping startup fast and memory predictable.
    """
    return Settings()  # type: ignore[call-arg]
