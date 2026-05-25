"""
AegiSpace — API Gateway Entrypoint

The FastAPI application factory. Configures CORS, mounts the v1 router,
and exposes a health-check endpoint at the root.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import get_settings

# ── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Application factory — returns a fully configured FastAPI instance."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AegiSpace — Intelligent Coworking Space Management API",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(v1_router)

    # ── Health check ──────────────────────────────────────────────────────
    @app.get("/health", tags=["System"])
    async def health_check() -> dict:
        return {
            "status": "healthy",
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    logger.info(
        "%s v%s — API gateway ready", settings.APP_NAME, settings.APP_VERSION
    )

    return app


# ── Module-level app instance for `uvicorn app.main:app` ─────────────────
app = create_app()
