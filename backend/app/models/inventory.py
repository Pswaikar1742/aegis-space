"""
AegiSpace — Inventory Pydantic Schemas

Strict input/output validation for inventory_items rows.
All schemas mirror the contracts.json column definitions.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────


class InventoryStatus(str, Enum):
    """Allowed states for an inventory item."""

    AVAILABLE = "available"
    ALLOCATED = "allocated"
    MAINTENANCE = "maintenance"


# ── Response Schema ───────────────────────────────────────────────────────


class InventoryItemOut(BaseModel):
    """Schema returned to clients — maps 1:1 to the Supabase row."""

    id: UUID
    branch_id: UUID
    name: str = Field(..., max_length=100)
    type: str = Field(..., max_length=50)
    capacity: int
    monthly_rate: float
    status: InventoryStatus

    model_config = {"from_attributes": True}


# ── Query Parameters ─────────────────────────────────────────────────────


class InventoryQueryParams(BaseModel):
    """Validated query parameters for the inventory listing endpoint."""

    branch_id: UUID
    status: Optional[InventoryStatus] = None
    min_capacity: Optional[int] = Field(default=None, ge=1)
