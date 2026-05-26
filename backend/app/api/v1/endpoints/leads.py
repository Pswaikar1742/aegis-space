"""
AegiSpace — Lead Endpoints

GET /api/v1/leads → List lead records by branch (+ optional status filter)
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.db import SQLiteWrapper as Client  # SQLite-backed

from app.core.db import get_supabase_client
from app.models.leads import LeadOut, LeadStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get(
    "",
    response_model=list[LeadOut],
    summary="List leads for a branch",
)
async def list_leads(
    branch_id: UUID | None = Query(
        default=None,
        description="Optional branch filter",
    ),
    lead_status: LeadStatus | None = Query(
        default=None,
        alias="status",
        description="Optional lead status filter",
    ),
    db: Client = Depends(get_supabase_client),
) -> list[LeadOut]:
    """Fetch leads from Supabase with optional filtering.

    The dashboard polls this endpoint every 5 seconds to render the CRM table.
    """
    try:
        query = db.table("leads").select("*")

        if branch_id is not None:
            query = query.eq("branch_id", str(branch_id))
        if lead_status is not None:
            query = query.eq("status", lead_status.value)

        response = query.execute()
        return [LeadOut(**row) for row in response.data]

    except Exception as exc:
        logger.exception("Failed to fetch leads for branch %s", branch_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc
