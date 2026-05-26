"""
AegiSpace — Special Requests (Sales) Endpoint

POST /api/v1/special_requests → Create a CRM lead for sales and notify sales/manager
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.db import SQLiteWrapper as Client  # SQLite-backed

from app.core.db import get_supabase_client
from app.core.pubsub import publish_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/special_requests", tags=["Special Requests"])


class SpecialRequestCreate(BaseModel):
    branch_id: UUID
    company_name: str = Field(..., max_length=100)
    contact_email: str | None = None
    details: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_special_request(
    payload: SpecialRequestCreate,
    db: Client = Depends(get_supabase_client),
):
    """Create a lead record for sales to follow up and emit a notification."""
    try:
        lead_row = {
            "branch_id": str(payload.branch_id),
            "company_name": payload.company_name,
            "contact_email": payload.contact_email or "",
            "status": "new",
            "deal_size": 0,
            "next_steps": payload.details or "Special request received",
        }

        lead_resp = db.table("leads").insert(lead_row).execute()
        lead_data = getattr(lead_resp, "data", None)
        lead_record = lead_data[0] if lead_data else lead_row

        # Notify sales / branch manager (best-effort)
        try:
            notif = {
                "branch_id": str(payload.branch_id),
                "user_id": None,
                "type": "special_request",
                "payload": {"lead_id": lead_record.get("id"), "details": payload.details},
            }
            db.table("notifications").insert(notif).execute()
        except Exception:
            logger.exception("Failed to insert notification for special request")

        return lead_record
    except Exception as exc:
        logger.exception("Failed to create special request lead")
        try:
            await publish_event({
                "type": "special_request_failed",
                "branch_id": str(getattr(payload, 'branch_id', '')),
                "error": str(exc),
            })
        except Exception:
            logger.exception("Failed to publish special_request_failed event")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc
