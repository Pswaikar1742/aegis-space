import logging
import math
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List

from app.core.db import get_supabase_client
from app.models.analytics import AnalyticsGlobalOut
from app.core.auth import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics (CFO)"])


def _booking_revenue(row: dict) -> float:
    """Return booking revenue from the stored total or a schema-compatible fallback."""
    total_value = row.get("total_value")
    if total_value is not None:
        return float(total_value or 0)

    monthly_rate = row.get("monthly_rate_locked")
    start_date = row.get("start_date")
    end_date = row.get("end_date")

    if monthly_rate is None or not start_date or not end_date:
        return 0.0

    try:
        start = date.fromisoformat(str(start_date))
        end = date.fromisoformat(str(end_date))
    except ValueError:
        return 0.0

    days = (end - start).days
    months = max(days / 30, 1)
    return round(float(monthly_rate) * math.ceil(months), 2)

@router.get(
    "/global",
    response_model=AnalyticsGlobalOut,
    summary="Global Analytics (Restricted to CFO)",
)
async def get_global_analytics(
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["cfo"])),
):
    try:
        # Fetch inventory
        inv_res = db.table("inventory_items").select("id, branch_id, status, monthly_rate").execute()
        items = getattr(inv_res, "data", None) or []
        
        # Fetch bookings; use a wide select so older/newer schemas both work.
        bookings_res = db.table("bookings").select("*").eq("status", "confirmed").execute()
        bookings = getattr(bookings_res, "data", None) or []

        total_revenue = sum(_booking_revenue(b) for b in bookings)
        
        # Calculate occupancy
        total_items = len(items)
        allocated_items = len([i for i in items if i.get("status") == "allocated"])
        global_occupancy = (allocated_items / total_items * 100) if total_items > 0 else 0.0

        # Branch performance
        branch_perf = {}
        for b in bookings:
            bid = b.get("branch_id")
            if not bid:
                continue
            if bid not in branch_perf:
                branch_perf[bid] = {"revenue": 0.0, "bookings": 0}
            branch_perf[bid]["revenue"] += _booking_revenue(b)
            branch_perf[bid]["bookings"] += 1

        return AnalyticsGlobalOut(
            total_revenue=round(total_revenue, 2),
            global_occupancy_rate=round(global_occupancy, 2),
            branch_performance=branch_perf
        )
    except Exception as e:
        logger.exception("Analytics fetch failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during analytics fetch: {e}"
        )
