"""
AegiSpace — Copilot Chat Gateway

POST /api/v1/chat → conversational assistant powered by FastRouter (gpt-4o).
Adjusts system instructions based on the user's active role and appends
live inventory context from the database before forwarding to the LLM.
"""

from __future__ import annotations

from datetime import date
import logging

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.db import get_supabase_client, SQLiteWrapper as Client

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


class ChatRequest(BaseModel):
    message: str
    branch_id: str = Field(default="")
    member_id: str = Field(default="")


class ChatResponse(BaseModel):
    reply: str
    action_triggered: bool = False
    action_details: dict = Field(default_factory=dict)


def _build_persona_prompt(role: str) -> str:
    prompts = {
        "cfo": (
            "You are the AegisSpace CFO Copilot. Focus on revenue, occupancy, receivables, "
            "and portfolio trends. Be concise, analytical, and business-minded."
        ),
        "manager": (
            "You are the AegisSpace Branch Manager Copilot. Focus on floor operations, leads, "
            "maintenance, bookings, attendance, and service recovery. Keep answers action-oriented."
        ),
        "tenant_admin": (
            "You are the AegisSpace Tenant Admin Copilot. Focus on credits, bookings, workspace "
            "allocation, and quota management. Explain options clearly."
        ),
        "member": (
            "You are the AegisSpace Member Copilot. Focus on desk booking, support tickets, gatepasses, "
            "and workspace help. Be friendly and practical."
        ),
        "front_desk": (
            "You are the AegisSpace Front Desk Copilot. Focus on visitor registration, check-ins, "
            "host lookup, and lobby operations. Keep responses short and operational."
        ),
        "it_admin": (
            "You are the AegisSpace IT Admin Copilot. Focus on infrastructure health, desk allocation, "
            "visitors, and operational telemetry. Be direct and diagnostic."
        ),
        "vendor": (
            "You are the AegisSpace Vendor Copilot. Focus on maintenance work orders, task status, "
            "and service completion. Be concise and task-focused."
        ),
    }
    return prompts.get(role.lower(), "You are the AegisSpace AI Assistant for a coworking operations demo.")


@router.post("", response_model=ChatResponse)
async def process_copilot_chat(
    payload: ChatRequest,
    x_user_role: str = Header(..., alias="X-User-Role"),
    db: Client = Depends(get_supabase_client),
):
    """
    Cognitive Agent Gateway: Processes natural language commands via FastRouter,
    adjusting system instructions dynamically based on X-User-Role.
    """
    if not settings.FASTROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="FastRouter is not configured on the backend.")

    active_prompt = _build_persona_prompt(x_user_role)

    client = None
    try:
        # 1. Query live database parameters to give context to the LLM
        try:
            inv_res = db.table("inventory_items").select("*").eq("branch_id", payload.branch_id).eq("status", "available").execute()
            available_items = getattr(inv_res, "data", None) or []
            available_spaces = [item.get("name") for item in available_items if item]
        except Exception as dbe:
            logger.exception("Failed to query inventory for copilot context")
            available_spaces = []

        # 2. Append real-time database state to the system prompt
        full_system_prompt = f"""
        {active_prompt}

        Live Branch Context:
        - Currently available spaces: {', '.join(available_spaces) if available_spaces else 'None'}
        - Today's Date: {date.today().isoformat()}
        - Active role: {x_user_role}
        - Member ID: {payload.member_id or 'unknown'}
        - Branch ID: {payload.branch_id or 'unknown'}
        """

        # 3. Call FastRouter via the OpenAI-compatible SDK
        client = AsyncOpenAI(
            api_key=settings.FASTROUTER_API_KEY,
            base_url=settings.FASTROUTER_BASE_URL,
        )

        response = await client.chat.completions.create(
            model=settings.FASTROUTER_MODEL,
            messages=[
                {"role": "system", "content": full_system_prompt},
                {"role": "user", "content": payload.message},
            ],
            temperature=0.2,
            max_tokens=600,
        )

        reply = response.choices[0].message.content.strip() if response and getattr(response, 'choices', None) else ""

        return ChatResponse(reply=reply, action_triggered=False, action_details={})

    except Exception as e:
        logger.exception("Copilot chat failed")
        raise HTTPException(status_code=500, detail=f"Copilot Agent Failure: {str(e)}")
    finally:
        if client:
            try:
                await client.close()
            except Exception:
                pass
