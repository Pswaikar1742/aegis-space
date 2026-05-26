"""
AegiSpace — Demo Inventory helper

POST /api/v1/inventory/demo → Create or return a demo inventory item for UI-driven demos
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.db import SQLiteWrapper as Client  # SQLite-backed

from app.core.db import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


class DemoInventoryCreate(BaseModel):
    branch_id: UUID
    external_id: str = Field(..., description="Frontend demo space id (e.g., hot_desk_1)")
    name: str
    type: str
    capacity: int = 1
    monthly_rate: float = 0.0


@router.post("/demo")
async def create_demo_inventory(
    payload: DemoInventoryCreate,
    db: Client = Depends(get_supabase_client),
):
    """Create a demo inventory item if none exists with the same name + branch.

    This is best-effort and intended for demo flows. It will return the existing
    row if one is found by name+branch, otherwise insert and return the created row.
    """
    try:
        # Try find existing by name + branch
        existing = db.table("inventory_items").select("*").eq("branch_id", str(payload.branch_id)).eq("name", payload.name).limit(1).execute()
        existing_data = getattr(existing, "data", None)
        if existing_data:
            return existing_data[0]

        row = {
            "branch_id": str(payload.branch_id),
            "name": payload.name,
            "type": payload.type,
            "capacity": payload.capacity,
            "monthly_rate": payload.monthly_rate,
            "status": "available",
        }

        resp = db.table("inventory_items").insert(row).execute()
        data = getattr(resp, "data", None)
        if data:
            return data[0]

        raise HTTPException(status_code=500, detail="Failed to create demo inventory")

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create demo inventory")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Upstream database error: {exc}") from exc
