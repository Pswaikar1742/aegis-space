"""
AegiSpace — Nexus Orchestration Pydantic Schemas

Request/response validation for the deal orchestration pipeline.
These schemas define the contract boundary between the API layer
and the (future) AI/LLM decision engine.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────


class OrchestrateDecision(str, Enum):
    """Deterministic decision outcomes from the orchestration pipeline."""

    SUCCESS = "Success"
    HALTED = "Halted"


class HaltReason(str, Enum):
    """Machine-readable reasons for a Halted decision."""

    EMPTY_EMAIL_BODY = "empty_email_body"
    MISSING_BRANCH = "missing_branch"
    NO_DEAL_SIGNALS = "no_deal_signals"
    PLACEHOLDER_INPUT = "placeholder_input"


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
    """Structured response from the orchestration pipeline."""

    decision: OrchestrateDecision
    halt_reason: Optional[HaltReason] = None
    extracted_data: Optional[dict] = Field(
        default=None,
        description="Extracted deal fields (company, seats, budget, etc.)",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for the decision (1.0 for deterministic mock)",
    )
    branch_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    pipeline_version: str = "v0.1.0-mock"
