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
from pydantic import BaseModel
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.db import get_supabase_client, SQLiteWrapper as Client

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


class ChatRequest(BaseModel):
    message: str
    branch_id: str
    member_id: str


class ChatResponse(BaseModel):
    reply: str
    action_triggered: bool = False
    action_details: dict = {}


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
    system_prompts = {
        "cfo": """You are the AegisSpace CFO Copilot. You analyze workspace yields, monthly revenue, and outstanding invoices. 
                  Provide high-level financial insights based on the user's questions. Keep your answers concise, structured, and professional.""",
        
        "manager": """You are the AegisSpace Branch Manager Copilot. You assist in workspace operations. 
                     You help coordinate cleaning schedules, check-in visitors, and progress leads. Keep your answers action-oriented.""",
        
        "tenant_admin": """You are the AegisSpace Corporate Admin Copilot. You help manage your team's room booking credits and quotas. 
                          Explain credit limits clearly and guide them on how to optimize space usage.""",
        
        "member": """You are the AegisSpace Member Copilot. You help members find and book available desks or meeting rooms. 
                     Be conversational, helpful, and friendly."""
    }

    active_prompt = system_prompts.get(x_user_role.lower(), "You are the AegisSpace AI Assistant.")

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
        """

        # 3. Call FastRouter (GPT-4o)
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
