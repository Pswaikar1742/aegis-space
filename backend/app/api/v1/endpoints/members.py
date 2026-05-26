import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import SQLiteWrapper as Client  # SQLite-backed

from app.core.db import get_supabase_client
from app.models.members import MemberPerksOut, MemberPerksUpdate
from app.core.auth import require_role
from app.core.pubsub import publish_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/members", tags=["Members (Tenant Admin)"])

@router.get(
    "/perks/{member_id}",
    response_model=MemberPerksOut,
    summary="Get member perks (Tenant Admin)",
)
async def get_member_perks(
    member_id: str,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["tenant_admin"])),
):
    try:
        res = db.table("member_perks").select("*").eq("member_id", member_id).execute()
        data = getattr(res, "data", None)
        if not data:
            raise HTTPException(status_code=404, detail="Member perks not found")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to fetch perks for {member_id}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch(
    "/perks/{member_id}",
    response_model=MemberPerksOut,
    summary="Update member perks / deduct credits (Tenant Admin)",
)
async def update_member_perks(
    member_id: str,
    payload: MemberPerksUpdate,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["tenant_admin"])),
):
    try:
        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        res = db.table("member_perks").update(update_data).eq("member_id", member_id).execute()
        data = getattr(res, "data", None)
        if not data:
            try:
                await publish_event({
                    "type": "member_perks_update_failed",
                    "member_id": member_id,
                    "error": "no_data_returned",
                    "payload": update_data,
                })
            except Exception:
                logger.exception("Failed to publish member_perks_update_failed event")
            raise HTTPException(status_code=404, detail="Member perks not found or update failed")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to update perks for {member_id}")
        try:
            await publish_event({
                "type": "member_perks_update_failed",
                "member_id": member_id,
                "error": str(e),
            })
        except Exception:
            logger.exception("Failed to publish member_perks_update_failed event")
        raise HTTPException(status_code=500, detail=str(e))
