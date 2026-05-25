"""
AegiSpace — Supabase Client Initialization

Provides a safe, singleton Supabase client via FastAPI's dependency injection.
The client is created lazily on first request and reused for the process lifetime.

Usage in endpoints:
    from app.core.db import get_supabase_client
    
    @router.get("/")
    async def handler(db: Client = Depends(get_supabase_client)):
        ...
"""

from __future__ import annotations

import logging
from typing import Generator

from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Module-level singleton ────────────────────────────────────────────────
_supabase_client: Client | None = None


def _init_client() -> Client:
    """Create and return a new Supabase client.

    Reads credentials from the validated Settings object.
    Raises immediately if the Supabase SDK rejects the URL/key pair.
    """
    settings = get_settings()
    client = create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_KEY,
    )
    logger.info(
        "Supabase client initialized — connected to %s",
        settings.SUPABASE_URL,
    )
    return client


def get_supabase_client() -> Generator[Client, None, None]:
    """FastAPI dependency that yields the singleton Supabase client.

    The Generator signature lets FastAPI manage teardown hooks if we ever
    need them, while keeping the client alive across requests.
    """
    global _supabase_client  # noqa: PLW0603

    if _supabase_client is None:
        _supabase_client = _init_client()

    yield _supabase_client
