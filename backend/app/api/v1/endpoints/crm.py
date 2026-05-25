import logging
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.db import get_supabase_client
from app.models.crm import LeadStageUpdate, LeadStageOut
from app.core.auth import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["CRM Engine"])

@router.patch(
    "/{lead_id}/stage",
    response_model=LeadStageOut,
    summary="Update Lead Stage (Manager)",
)
async def update_lead_stage(
    lead_id: str,
    payload: LeadStageUpdate,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["manager", "cfo"])),
):
    try:
        new_status = payload.status
        # 1. Update the lead
        lead_update = db.table("leads").update({"status": new_status}).eq("id", lead_id).execute()
        lead_data = getattr(lead_update, "data", None)
        if not lead_data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # 2. Check for associated bookings to handle inventory state
        bookings_query = db.table("bookings").select("inventory_item_id").eq("lead_id", lead_id).execute()
        bookings_data = getattr(bookings_query, "data", None) or []
        
        inventory_updated = 0
        if bookings_data:
            inventory_ids = [b.get("inventory_item_id") for b in bookings_data if b.get("inventory_item_id")]
            if inventory_ids:
                if new_status == "closed_won":
                    # Flag inventory as allocated
                    db.table("inventory_items").update({"status": "allocated"}).in_("id", inventory_ids).execute()
                    inventory_updated = len(inventory_ids)
                elif new_status == "workbench_halted":
                    # Release holds -> available
                    db.table("inventory_items").update({"status": "available"}).in_("id", inventory_ids).execute()
                    inventory_updated = len(inventory_ids)
        
        return LeadStageOut(
            id=lead_id,
            status=new_status,
            message=f"Lead updated to {new_status}. {inventory_updated} inventory items synced."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update lead stage")
        raise HTTPException(status_code=500, detail=str(e))
