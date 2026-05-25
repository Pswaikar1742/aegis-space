"""
AegiSpace — Visitor & Check-in Endpoints (Front-Desk / Security)

GET  /api/v1/visitors        → List today's visitors
POST /api/v1/visitors        → Register a walk-in / pre-registered visitor
PATCH /api/v1/visitors/{id}  → Check-in or check-out a visitor
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.db import get_supabase_client
from app.core.auth import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/visitors", tags=["Visitors (Front-Desk)"])


class VisitorCreate(BaseModel):
    branch_id: str
    visitor_name: str
    company: Optional[str] = None
    purpose: str
    host_member_id: Optional[str] = None

class VisitorOut(BaseModel):
    id: str
    branch_id: str
    visitor_name: str
    company: Optional[str] = None
    purpose: str
    host_member_id: Optional[str] = None
    status: str = "pre_registered"
    checked_in_at: Optional[str] = None
    checked_out_at: Optional[str] = None
    created_at: Optional[str] = None


@router.post("", response_model=VisitorOut, status_code=status.HTTP_201_CREATED, summary="Register a visitor")
async def register_visitor(
    payload: VisitorCreate,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["front_desk", "manager"])),
):
    try:
        row = payload.model_dump()
        row["status"] = "pre_registered"
        res = db.table("visitors").insert(row).execute()
        data = getattr(res, "data", None)
        if not data:
            raise HTTPException(status_code=500, detail="Failed to register visitor")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Visitor registration failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[VisitorOut], summary="List visitors for a branch")
async def list_visitors(
    branch_id: str = None,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["front_desk", "manager", "cfo"])),
):
    try:
        query = db.table("visitors").select("*").order("created_at", desc=True).limit(50)
        if branch_id:
            query = query.eq("branch_id", branch_id)
        res = query.execute()
        return getattr(res, "data", None) or []
    except Exception as e:
        logger.exception("Failed to list visitors")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{visitor_id}/checkin", response_model=VisitorOut, summary="Check-in a visitor")
async def checkin_visitor(
    visitor_id: str,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["front_desk", "manager"])),
):
    try:
        res = db.table("visitors").update({
            "status": "checked_in",
            "checked_in_at": datetime.utcnow().isoformat(),
        }).eq("id", visitor_id).execute()
        data = getattr(res, "data", None)
        if not data:
            raise HTTPException(status_code=404, detail="Visitor not found")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Check-in failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{visitor_id}/checkout", response_model=VisitorOut, summary="Check-out a visitor")
async def checkout_visitor(
    visitor_id: str,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["front_desk", "manager"])),
):
    try:
        res = db.table("visitors").update({
            "status": "checked_out",
            "checked_out_at": datetime.utcnow().isoformat(),
        }).eq("id", visitor_id).execute()
        data = getattr(res, "data", None)
        if not data:
            raise HTTPException(status_code=404, detail="Visitor not found")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Check-out failed")
        raise HTTPException(status_code=500, detail=str(e))
