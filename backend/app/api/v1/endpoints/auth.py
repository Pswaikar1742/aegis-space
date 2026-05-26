"""
AegiSpace — Authentication Endpoint

POST /api/v1/auth/login validates demo corporate credentials against the
local SQLite members table and returns the active role/session metadata.
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.db import SQLiteWrapper as Client
from app.core.db import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    member_id: str
    email: str
    role: str
    branch_id: str
    company_name: str
    session_token: str
    authenticated_at: str


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: Client = Depends(get_supabase_client),
) -> LoginResponse:
    email = payload.email.strip().lower()
    password = payload.password.strip()

    try:
        response = db.table("members").select("*").eq("email", email).single().execute()
        member = getattr(response, "data", None)
        if not member or member.get("password") != password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        role = (member.get("role") or "member").strip().lower()
        authenticated_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        session_token = f"aegis-{role}-{member.get('id')}"

        return LoginResponse(
            member_id=str(member.get("id")),
            email=str(member.get("email")),
            role=role,
            branch_id=str(member.get("branch_id")),
            company_name=str(member.get("company_name")),
            session_token=session_token,
            authenticated_at=authenticated_at,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Login failed for %s", email)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Authentication error: {exc}") from exc
