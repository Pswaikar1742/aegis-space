import logging
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List

from app.core.db import get_supabase_client
from app.models.analytics import AnalyticsGlobalOut
from app.core.auth import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics (CFO)"])

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
        
        # Fetch bookings
        bookings_res = db.table("bookings").select("total_value, branch_id").eq("status", "confirmed").execute()
        bookings = getattr(bookings_res, "data", None) or []

        total_revenue = sum(float(b.get("total_value") or 0) for b in bookings)
        
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
            branch_perf[bid]["revenue"] += float(b.get("total_value") or 0)
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
