import logging
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List

from app.core.db import get_supabase_client
from app.models.tickets import TicketCreate, TicketOut
from app.api.v1.dependencies import require_role

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
    role: str = Depends(require_role(["manager", "member"])),
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
        return data[0]
    except Exception as e:
        logger.exception("Failed to create ticket")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "",
    response_model=List[TicketOut],
    summary="List maintenance tickets (Manager or Member)",
)
async def list_tickets(
    branch_id: str = None,
    db: Client = Depends(get_supabase_client),
    role: str = Depends(require_role(["manager", "member"])),
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
