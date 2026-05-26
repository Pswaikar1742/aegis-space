"""
AegiSpace — Attendance Feed Endpoint

GET /api/v1/attendance returns recent employee punch-ins for the branch.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.db import SQLiteWrapper as Client
from app.core.db import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


class AttendanceOut(BaseModel):
    id: str
    branch_id: str
    member_id: str | None = None
    member_name: str
    punch_in_time: str
    status: str
    note: str | None = None
    created_at: str | None = None


@router.get("", response_model=list[AttendanceOut], summary="List recent attendance logs")
async def list_attendance(
    branch_id: UUID = Query(..., description="Branch to filter logs by"),
    db: Client = Depends(get_supabase_client),
) -> list[AttendanceOut]:
    try:
        response = (
            db.table("attendance_logs")
            .select("*")
            .eq("branch_id", str(branch_id))
            .order("punch_in_time", desc=True)
            .limit(20)
            .execute()
        )
        data = getattr(response, "data", None) or []
        return [AttendanceOut(**row) for row in data]
    except Exception as exc:
        logger.exception("Attendance fetch failed for branch %s", branch_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Upstream database error: {exc}") from exc
