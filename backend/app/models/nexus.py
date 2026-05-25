"""
AegiSpace — Nexus Orchestration Pydantic Schemas (Production v1.0.0)

Request/response validation for the AI-driven deal orchestration pipeline.
Extended from the mock schemas to support the full allocation pipeline:
  - AI-extracted deal parameters
  - Inventory match results
  - Lead + booking records created
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────


class OrchestrateDecision(str, Enum):
    """Decision outcomes from the orchestration pipeline."""

    SUCCESS = "Success"
    HALTED = "Halted"


class HaltReason(str, Enum):
    """Machine-readable reasons for a Halted decision."""

    EMPTY_EMAIL_BODY = "empty_email_body"
    PLACEHOLDER_INPUT = "placeholder_input"
    AI_PARSE_FAILED = "ai_parse_failed"
    NO_DEAL_SIGNALS = "no_deal_signals"
    NO_INVENTORY_MATCH = "no_inventory_match"
    CAPACITY_EXCEEDED = "capacity_exceeded"
    BUDGET_EXCEEDED = "budget_exceeded"
    DATABASE_ERROR = "database_error"


# ── Request Schema ────────────────────────────────────────────────────────


class OrchestrateRequest(BaseModel):
    """Payload for the /nexus/orchestrate endpoint.

    Fields mirror the contract in docs/contracts.json.
    """

    email_body: str = Field(
        ...,
        min_length=1,
        max_length=10_000,
        description="Raw email/transcript text to parse for deal signals",
    )
    branch_id: str = Field(
        ...,
        min_length=1,
        description="Target branch UUID for inventory lookup",
    )


# ── Response Schema ───────────────────────────────────────────────────────


class OrchestrateResponse(BaseModel):
    """Structured response from the full allocation pipeline."""

    decision: OrchestrateDecision
    halt_reason: Optional[HaltReason] = None
    halt_detail: Optional[str] = Field(
        default=None,
        description="Human-readable explanation when halted",
    )
    extracted_data: Optional[dict] = Field(
        default=None,
        description="AI-extracted deal parameters (company, capacity, type, budget)",
    )
    matched_inventory: Optional[dict] = Field(
        default=None,
        description="The inventory item that was allocated (if success)",
    )
    lead_record: Optional[dict] = Field(
        default=None,
        description="The lead record created in Supabase",
    )
    booking_record: Optional[dict] = Field(
        default=None,
        description="The booking record created in Supabase (if success)",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score from the AI parser",
    )
    branch_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    pipeline_version: str = "v1.0.0-fastrouter"
