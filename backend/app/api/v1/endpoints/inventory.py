"""
AegiSpace — Inventory Endpoints

GET /api/v1/inventory         → List inventory items by branch (+ optional filters)
GET /api/v1/inventory/{id}    → Get a single inventory item by ID
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.db import SQLiteWrapper as Client  # SQLite-backed

from app.core.db import get_supabase_client
from app.models.inventory import InventoryItemOut, InventoryStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


# ── GET /api/v1/inventory ────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[InventoryItemOut],
    summary="List inventory items for a branch",
)
async def list_inventory(
    branch_id: UUID = Query(..., description="Branch to filter inventory by"),
    item_status: InventoryStatus | None = Query(
        default=None,
        alias="status",
        description="Optional status filter",
    ),
    min_capacity: int | None = Query(
        default=None,
        ge=1,
        description="Minimum seat/desk capacity",
    ),
    db: Client = Depends(get_supabase_client),
) -> list[InventoryItemOut]:
    """Fetch all inventory items for the given branch with optional filters.

    - Filters are pushed down to Supabase (server-side) for performance.
    - Returns an empty list (not 404) when no items match.
    """
    try:
        query = db.table("inventory_items").select("*").eq("branch_id", str(branch_id))

        if item_status is not None:
            query = query.eq("status", item_status.value)
        if min_capacity is not None:
            query = query.gte("capacity", min_capacity)

        response = query.execute()

        return [InventoryItemOut(**row) for row in response.data]

    except Exception as exc:
        logger.exception("Failed to fetch inventory for branch %s", branch_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc


# ── GET /api/v1/inventory/{item_id} ─────────────────────────────────────


@router.get(
    "/{item_id}",
    response_model=InventoryItemOut,
    summary="Get a single inventory item",
)
async def get_inventory_item(
    item_id: UUID,
    db: Client = Depends(get_supabase_client),
) -> InventoryItemOut:
    """Retrieve a single inventory item by its primary key."""
    try:
        response = (
            db.table("inventory_items")
            .select("*")
            .eq("id", str(item_id))
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {item_id} not found",
            )

        return InventoryItemOut(**response.data)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch inventory item %s", item_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc
