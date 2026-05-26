"""
AegiSpace — Facility & Vendor Endpoints (Janitorial / Third-Party Vendor)

GET  /api/v1/facility/tasks      → List cleaning/vendor tasks
POST /api/v1/facility/tasks      → Create a facility task
PATCH /api/v1/facility/tasks/{id} → Update task status
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import SQLiteWrapper as Client  # SQLite-backed
from pydantic import BaseModel
from typing import Optional, List

from app.core.db import get_supabase_client
from app.core.pubsub import publish_event
from app.core.auth import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/facility", tags=["Facility (Vendor/Janitorial)"])


class FacilityTaskCreate(BaseModel):
    branch_id: str
    area: str
    task_type: str  # cleaning, repair, inspection, vendor_service
    description: str
    priority: str = "normal"  # low, normal, high, urgent

class FacilityTaskUpdate(BaseModel):
    status: Optional[str] = None  # pending, in_progress, completed
    notes: Optional[str] = None

class FacilityTaskOut(BaseModel):
    id: str
    branch_id: str
    area: str
    task_type: str
    description: str
    priority: str
    status: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: Optional[str] = None


@router.post("/tasks", response_model=FacilityTaskOut, status_code=status.HTTP_201_CREATED, summary="Create a facility task")
async def create_task(
    payload: FacilityTaskCreate,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["vendor", "manager", "front_desk"])),
):
    try:
        row = payload.model_dump()
        row["status"] = "pending"
        res = db.table("facility_tasks").insert(row).execute()
        data = getattr(res, "data", None)
        if not data:
            # publish diagnostic
            try:
                await publish_event({
                    "type": "facility_task_create_failed",
                    "branch_id": row.get("branch_id"),
                    "error": "insert_returned_no_data",
                    "payload": row,
                })
            except Exception:
                logger.exception("Failed to publish facility_task_create_failed event")
            raise HTTPException(status_code=500, detail="Failed to create task")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Task creation failed")
        try:
            await publish_event({
                "type": "facility_task_create_failed",
                "branch_id": getattr(payload, 'branch_id', None),
                "error": str(e),
            })
        except Exception:
            logger.exception("Failed to publish facility_task_create_failed event")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks", response_model=List[FacilityTaskOut], summary="List facility tasks")
async def list_tasks(
    branch_id: str = None,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["vendor", "manager", "front_desk", "cfo"])),
):
    try:
        query = db.table("facility_tasks").select("*").order("created_at", desc=True).limit(50)
        if branch_id:
            query = query.eq("branch_id", branch_id)
        res = query.execute()
        return getattr(res, "data", None) or []
    except Exception as e:
        logger.exception("Failed to list facility tasks")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/tasks/{task_id}", response_model=FacilityTaskOut, summary="Update a facility task")
async def update_task(
    task_id: str,
    payload: FacilityTaskUpdate,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["vendor", "manager"])),
):
    try:
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        res = db.table("facility_tasks").update(updates).eq("id", task_id).execute()
        data = getattr(res, "data", None)
        if not data:
            raise HTTPException(status_code=404, detail="Task not found")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Task update failed")
        try:
            await publish_event({
                "type": "facility_task_update_failed",
                "task_id": task_id,
                "error": str(e),
            })
        except Exception:
            logger.exception("Failed to publish facility_task_update_failed event")
        raise HTTPException(status_code=500, detail=str(e))
