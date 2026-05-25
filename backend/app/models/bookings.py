"""
AegiSpace — Booking Pydantic Schemas

Request/response validation for reservation (booking) records.
Enforces date ordering, status transitions, and rate calculations.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# ── Enums ─────────────────────────────────────────────────────────────────


class BookingStatus(str, Enum):
    """Allowed lifecycle states for a booking."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


# ── Request Schemas ───────────────────────────────────────────────────────


class BookingCreate(BaseModel):
    """Payload for creating a new booking."""

    inventory_item_id: UUID
    lead_id: UUID
    branch_id: UUID
    start_date: date
    end_date: date
    notes: Optional[str] = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_date_range(self) -> "BookingCreate":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be strictly after start_date")
        return self


class BookingUpdate(BaseModel):
    """Payload for updating an existing booking. All fields optional."""

    status: Optional[BookingStatus] = None
    end_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


# ── Response Schema ───────────────────────────────────────────────────────


class BookingOut(BaseModel):
    """Full booking record returned to clients."""

    id: UUID
    inventory_item_id: UUID
    lead_id: UUID
    branch_id: UUID
    start_date: date
    end_date: date
    monthly_rate_locked: float
    total_value: float
    status: BookingStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Query Parameters ─────────────────────────────────────────────────────


class BookingQueryParams(BaseModel):
    """Validated query parameters for the booking listing endpoint."""

    branch_id: UUID
    lead_id: Optional[UUID] = None
    status: Optional[BookingStatus] = None
