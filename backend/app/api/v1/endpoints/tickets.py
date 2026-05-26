import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import SQLiteWrapper as Client  # SQLite-backed
from typing import List

from app.core.db import get_supabase_client
from app.core.pubsub import publish_event
from app.models.tickets import TicketCreate, TicketOut
from app.core.auth import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["Maintenance Tickets (Manager/Member)"])

@router.post(
    "",
    response_model=TicketOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a maintenance ticket (Manager or Member)",
)
async def create_ticket(
    payload: TicketCreate,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["manager", "member", "front_desk", "vendor"])),
):
    try:
        ticket_row = {
            "branch_id": payload.branch_id,
            "inventory_item_id": payload.inventory_item_id,
            "description": payload.description,
            "status": "open"
        }
        res = db.table("maintenance_tickets").insert(ticket_row).execute()
        data = getattr(res, "data", None)
        if not data:
            raise HTTPException(status_code=500, detail="Failed to create ticket")
        # publish ticket created event
        try:
            await publish_event({
                "type": "ticket_created",
                "branch_id": payload.branch_id,
                "ticket": data[0],
            })
        except Exception:
            logger.exception("Failed to publish ticket_created event")
        return data[0]
    except Exception as e:
        logger.exception("Failed to create ticket")
        # publish diagnostic event
        try:
            await publish_event({
                "type": "ticket_create_failed",
                "branch_id": getattr(payload, 'branch_id', None),
                "error": str(e),
            })
        except Exception:
            logger.exception("Failed to publish ticket_create_failed event")

        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "",
    response_model=List[TicketOut],
    summary="List maintenance tickets (Manager or Member)",
)
async def list_tickets(
    branch_id: str = None,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["manager", "member", "front_desk", "vendor", "cfo"])),
):
    try:
        query = db.table("maintenance_tickets").select("*")
        if branch_id:
            query = query.eq("branch_id", branch_id)
        res = query.execute()
        data = getattr(res, "data", None) or []
        return data
    except Exception as e:
        logger.exception("Failed to fetch tickets")
        raise HTTPException(status_code=500, detail=str(e))
