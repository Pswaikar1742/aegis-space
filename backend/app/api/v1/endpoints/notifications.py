"""
AegiSpace — Notifications Endpoints

GET  /api/v1/notifications?branch_id=...  → List notifications for a branch
PATCH /api/v1/notifications/{id}         → Mark notification read
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.db import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="List notifications for a branch")
async def list_notifications(
    branch_id: UUID = Query(..., description="Branch to filter notifications by"),
    unread_only: bool = Query(default=False, description="Only unread notifications"),
    db: Client = Depends(get_supabase_client),
):
    try:
        q = db.table("notifications").select("*").eq("branch_id", str(branch_id))
        if unread_only:
            q = q.eq("read", False)
        q = q.order("created_at", desc=True)
        resp = q.execute()
        return resp.data or []
    except Exception as exc:
        logger.exception("Failed to fetch notifications for branch %s", branch_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc


@router.patch("/{notif_id}", summary="Mark notification as read")
async def mark_notification_read(
    notif_id: UUID,
    db: Client = Depends(get_supabase_client),
):
    try:
        resp = db.table("notifications").update({"read": True}).eq("id", str(notif_id)).execute()
        if not getattr(resp, "data", None):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to mark notification %s read", notif_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream database error: {exc}",
        ) from exc
