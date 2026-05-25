"""
AegiSpace — Booking Endpoints

POST  /api/v1/bookings              → Create a new reservation
PATCH /api/v1/bookings/{booking_id} → Update reservation status/details
GET   /api/v1/bookings              → List bookings by branch (+ optional filters)

Transactional guarantees:
- Creating a booking atomically locks the inventory item's monthly rate.
- Creating a booking transitions the inventory item status to "allocated".
- Cancelling a booking transitions the inventory item back to "available".
"""

from __future__ import annotations

import logging
import math
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.db import get_supabase_client
from app.core.auth import require_role
from app.models.bookings import BookingCreate, BookingOut, BookingStatus, BookingUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


# ── Helpers ───────────────────────────────────────────────────────────────


def _compute_total_value(monthly_rate: float, start: date, end: date) -> float:
    """Calculate total booking value by prorating months.

    Uses a 30-day month approximation — sufficient for coworking pricing.
    Returns a value rounded to 2 decimal places.
    """
    days = (end - start).days
    months = max(days / 30, 1)  # Minimum 1 month billing
    return round(monthly_rate * math.ceil(months), 2)


# Allowed billing cycles per inventory item type. Keep conservative defaults.
_ALLOWED_BILLING_CYCLES: dict[str, set[str]] = {
    "meeting_room": {"daily"},
    "hot_desk": {"monthly", "daily"},
    "dedicated_desk": {"monthly"},
    "private_suite": {"monthly"},
    # fallback: allow monthly
}


# ── POST /api/v1/bookings ────────────────────────────────────────────────


@router.post(
    "",
    response_model=BookingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new reservation",
)
async def create_booking(
    payload: BookingCreate,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["cfo", "manager", "tenant_admin", "member"])),
) -> BookingOut:
    """Create a new booking and atomically lock the inventory item's rate.

    Steps:
    1. Fetch the inventory item to verify it exists and is available.
    2. Lock its current monthly_rate into the booking.
    3. Insert the booking row.
    4. Transition the inventory item to 'allocated'.
    """
    try:
        # ── Step 1: Validate inventory item ───────────────────────────────
        inv_response = (
            db.table("inventory_items")
            .select("*")
            .eq("id", str(payload.inventory_item_id))
            .single()
            .execute()
        )

        if not inv_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {payload.inventory_item_id} not found",
            )

        item = inv_response.data

        if item["status"] != "available":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Inventory item {payload.inventory_item_id} is not available "
                    f"(current status: {item['status']})"
                ),
            )

        # ── Step 2: Lock rate and compute value ───────────────────────────
        monthly_rate = float(item["monthly_rate"])
        billing_cycle = (getattr(payload, "billing_cycle", "monthly") or "monthly").lower()

        # Validate billing cycle is supported for this inventory item type
        item_type = (item.get("type") or "").lower()
        allowed = _ALLOWED_BILLING_CYCLES.get(item_type, {"monthly"})
        if billing_cycle not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(f"Billing cycle '{billing_cycle}' not allowed for item type '{item_type}'. "
                        f"Allowed: {', '.join(sorted(allowed))}"),
            )

        if billing_cycle == "daily":
            days = max((payload.end_date - payload.start_date).days, 1)
            daily_rate = round(monthly_rate / 30.0, 2)
            total_value = round(daily_rate * days, 2)
        else:
            total_value = _compute_total_value(monthly_rate, payload.start_date, payload.end_date)

        # ── Step 2.5: Member Perks usage for meeting rooms ─────────────────
        role = user_auth.get("role")
        user_id = user_auth.get("user_id")
        
        if role == "tenant_admin" and item["type"] == "meeting_room" and user_id:
            # Calculate duration in hours (assume 1 day = 24 hours for dates)
            days = max((payload.end_date - payload.start_date).days, 1)
            required_credits = days * 24
            
            perks_res = db.table("member_perks").select("*").eq("member_id", user_id).execute()
            perks_data = getattr(perks_res, "data", None)
            
            if not perks_data:
                raise HTTPException(
                    status_code=400,
                    detail="INSUFFICIENT_CREDITS"
                )
                
            perk = perks_data[0]
            current_credits = perk.get("monthly_credits") or 0
            
            if current_credits < required_credits:
                raise HTTPException(
                    status_code=400,
                    detail="INSUFFICIENT_CREDITS"
                )
            
            # Deduct credits
            db.table("member_perks").update({
                "monthly_credits": current_credits - required_credits
            }).eq("member_id", user_id).execute()


        # ── Step 3: Insert booking ────────────────────────────────────────
        booking_row = {
            "inventory_item_id": str(payload.inventory_item_id),
            "lead_id": str(payload.lead_id) if payload.lead_id else None,
            "branch_id": str(payload.branch_id),
            "start_date": payload.start_date.isoformat(),
            "end_date": payload.end_date.isoformat(),
            "monthly_rate_locked": monthly_rate,
            "billing_cycle": billing_cycle,
            "total_value": total_value,
            "status": BookingStatus.PENDING.value,
            "notes": payload.notes,
        }

        insert_response = (
            db.table("bookings").insert(booking_row).execute()
        )

        if not insert_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Booking insert returned no data",
            )

        # ── Side-effect: create a branch manager notification (best-effort) ──
        try:
            created_booking = insert_response.data[0]
            notif_row = {
                "branch_id": str(payload.branch_id),
                "user_id": str(user_id) if user_id else None,
                "type": "booking_created",
                "payload": {
                    "booking_id": created_booking.get("id"),
                    "inventory_item_id": str(payload.inventory_item_id),
                    "lead_id": created_booking.get("lead_id"),
                    "total_value": created_booking.get("total_value"),
                    "start_date": created_booking.get("start_date"),
                    "end_date": created_booking.get("end_date"),
                },
            }
            db.table("notifications").insert(notif_row).execute()
        except Exception:
            logger.exception("Failed to create booking notification (non-fatal)")

        # ── Step 4: Mark inventory as allocated ───────────────────────────
        db.table("inventory_items").update({"status": "allocated"}).eq(
            "id", str(payload.inventory_item_id)
        ).execute()

        logger.info(
            "Booking created: item=%s lead=%s value=%.2f",
            payload.inventory_item_id,
            payload.lead_id,
            total_value,
        )

        return BookingOut(**insert_response.data[0])

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create booking")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc


# ── PATCH /api/v1/bookings/{booking_id} ──────────────────────────────────


@router.patch(
    "/{booking_id}",
    response_model=BookingOut,
    summary="Update a booking",
)
async def update_booking(
    booking_id: UUID,
    payload: BookingUpdate,
    db: Client = Depends(get_supabase_client),
) -> BookingOut:
    """Update a booking's status, end date, or notes.

    If the booking is cancelled, the linked inventory item is released
    back to 'available' status.
    """
    try:
        # ── Verify booking exists ─────────────────────────────────────────
        existing = (
            db.table("bookings")
            .select("*")
            .eq("id", str(booking_id))
            .single()
            .execute()
        )

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking {booking_id} not found",
            )

        # ── Build partial update ──────────────────────────────────────────
        update_data: dict = payload.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No fields to update",
            )

        # Convert enum to string if present
        if "status" in update_data and update_data["status"] is not None:
            update_data["status"] = update_data["status"].value

        # Convert date to ISO string if present
        if "end_date" in update_data and update_data["end_date"] is not None:
            update_data["end_date"] = update_data["end_date"].isoformat()

        # Recalculate total_value if end_date changed
        if "end_date" in update_data and update_data["end_date"] is not None:
            from datetime import date as date_type

            new_end = date_type.fromisoformat(update_data["end_date"])
            start = date_type.fromisoformat(existing.data["start_date"])
            rate = float(existing.data["monthly_rate_locked"])
            update_data["total_value"] = _compute_total_value(rate, start, new_end)

        # ── Execute update ────────────────────────────────────────────────
        update_response = (
            db.table("bookings")
            .update(update_data)
            .eq("id", str(booking_id))
            .execute()
        )

        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Booking update returned no data",
            )

        # ── Side-effect: release inventory on cancellation ────────────────
        if payload.status == BookingStatus.CANCELLED:
            inv_item_id = existing.data["inventory_item_id"]
            db.table("inventory_items").update({"status": "available"}).eq(
                "id", inv_item_id
            ).execute()
            logger.info(
                "Booking %s cancelled — inventory %s released",
                booking_id,
                inv_item_id,
            )

        return BookingOut(**update_response.data[0])

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to update booking %s", booking_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc


# ── GET /api/v1/bookings ─────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[BookingOut],
    summary="List bookings for a branch",
)
async def list_bookings(
    branch_id: UUID = Query(..., description="Branch to filter bookings by"),
    lead_id: UUID | None = Query(
        default=None, description="Optional lead filter"
    ),
    booking_status: BookingStatus | None = Query(
        default=None,
        alias="status",
        description="Optional booking status filter",
    ),
    db: Client = Depends(get_supabase_client),
) -> list[BookingOut]:
    """Fetch all bookings for a branch with optional lead/status filters."""
    try:
        query = db.table("bookings").select("*").eq("branch_id", str(branch_id))

        if lead_id is not None:
            query = query.eq("lead_id", str(lead_id))
        if booking_status is not None:
            query = query.eq("status", booking_status.value)

        # Order by most recent first
        query = query.order("created_at", desc=True)

        response = query.execute()

        return [BookingOut(**row) for row in response.data]

    except Exception as exc:
        logger.exception("Failed to fetch bookings for branch %s", branch_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc
