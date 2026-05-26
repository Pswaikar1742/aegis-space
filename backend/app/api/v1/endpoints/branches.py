"""
AegiSpace — Branches endpoint

GET /api/v1/branches → List branches
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import SQLiteWrapper as Client  # SQLite-backed

from app.core.db import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.get("", summary="List branches")
async def list_branches(db: Client = Depends(get_supabase_client)):
    try:
        resp = db.table("branches").select("*").order("name", desc=False).execute()
        data = getattr(resp, "data", None) or []
        return data
    except Exception as exc:
        logger.exception("Failed to fetch branches")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Upstream database error: {exc}") from exc
