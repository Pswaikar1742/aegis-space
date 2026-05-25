"""
AegiSpace — Nexus Orchestration Endpoint

POST /api/v1/nexus/orchestrate → Parse deal signals and return a deterministic decision.

ITERATION 1 (Mock / Skeleton):
- No LLM calls. No external AI services.
- Uses keyword heuristics to extract deal signals from the email body.
- Returns "Success" if valid deal signals are detected, "Halted" otherwise.
- Designed to be swapped with an LLM-backed parser in iteration 2.
"""

from __future__ import annotations

import logging
import re

from fastapi import APIRouter, status

from app.models.nexus import (
    HaltReason,
    OrchestrateDecision,
    OrchestrateRequest,
    OrchestrateResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nexus", tags=["Nexus Orchestration"])

# ── Placeholder / junk-input blacklist ────────────────────────────────────
_PLACEHOLDER_PATTERNS: set[str] = {
    "ok", "test", "mno", "abc", "xyz", "hello", "asdf",
    "placeholder", "dummy", "sample", "lorem",
}

# ── Deal signal keywords (case-insensitive) ──────────────────────────────
_COMPANY_PATTERN = re.compile(
    r"(?:company|organization|org|firm|client)\s*[:\-–]?\s*(.+)",
    re.IGNORECASE,
)
_SEATS_PATTERN = re.compile(
    r"(\d+)\s*(?:seats?|desks?|workstations?|people|members?|pax)",
    re.IGNORECASE,
)
_BUDGET_PATTERN = re.compile(
    r"(?:budget|rate|price|cost|₹|\$|INR|USD)\s*[:\-–]?\s*([\d,]+(?:\.\d{2})?)",
    re.IGNORECASE,
)
_DISCOUNT_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*%\s*(?:discount|off|reduction)",
    re.IGNORECASE,
)


def _is_placeholder(text: str) -> bool:
    """Reject known junk/placeholder inputs."""
    stripped = text.strip().lower()
    return stripped in _PLACEHOLDER_PATTERNS or len(stripped) < 5


def _extract_deal_signals(email_body: str) -> dict:
    """Run regex heuristics to extract structured deal fields.

    Returns a dict of extracted fields. Empty dict means no signals found.
    This is the function that will be replaced by an LLM parser in iteration 2.
    """
    signals: dict = {}

    company_match = _COMPANY_PATTERN.search(email_body)
    if company_match:
        signals["company_name"] = company_match.group(1).strip()

    seats_match = _SEATS_PATTERN.search(email_body)
    if seats_match:
        signals["seats_requested"] = int(seats_match.group(1))

    budget_match = _BUDGET_PATTERN.search(email_body)
    if budget_match:
        raw = budget_match.group(1).replace(",", "")
        signals["budget"] = float(raw)

    discount_match = _DISCOUNT_PATTERN.search(email_body)
    if discount_match:
        signals["discount_percent"] = float(discount_match.group(1))

    return signals


# ── POST /api/v1/nexus/orchestrate ────────────────────────────────────────


@router.post(
    "/orchestrate",
    response_model=OrchestrateResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse deal signals and return a deterministic decision",
    description=(
        "**Iteration 1 — Deterministic mock.** "
        "Parses the email body using keyword heuristics. "
        "Returns 'Success' if at least one deal signal is extracted, "
        "'Halted' otherwise. No LLM calls are made."
    ),
)
async def orchestrate(payload: OrchestrateRequest) -> OrchestrateResponse:
    """Core orchestration endpoint — the brain of the Nexus pipeline.

    Decision logic (v0.1.0-mock):
    1. Reject placeholder/junk inputs → Halted (placeholder_input)
    2. Extract deal signals via regex heuristics
    3. If no signals found → Halted (no_deal_signals)
    4. If signals found → Success + extracted_data
    """
    email_body = payload.email_body.strip()
    branch_id = payload.branch_id.strip()

    # ── Guard: placeholder input ──────────────────────────────────────────
    if _is_placeholder(email_body):
        logger.warning(
            "Orchestrate HALTED — placeholder input detected: %r",
            email_body[:50],
        )
        return OrchestrateResponse(
            decision=OrchestrateDecision.HALTED,
            halt_reason=HaltReason.PLACEHOLDER_INPUT,
            branch_id=branch_id,
            confidence=1.0,
        )

    # ── Extract deal signals ──────────────────────────────────────────────
    signals = _extract_deal_signals(email_body)

    if not signals:
        logger.info(
            "Orchestrate HALTED — no deal signals in body (%d chars)",
            len(email_body),
        )
        return OrchestrateResponse(
            decision=OrchestrateDecision.HALTED,
            halt_reason=HaltReason.NO_DEAL_SIGNALS,
            branch_id=branch_id,
            confidence=1.0,
        )

    # ── Success path ──────────────────────────────────────────────────────
    logger.info(
        "Orchestrate SUCCESS — extracted %d signals: %s",
        len(signals),
        list(signals.keys()),
    )
    return OrchestrateResponse(
        decision=OrchestrateDecision.SUCCESS,
        extracted_data=signals,
        branch_id=branch_id,
        confidence=1.0,
    )
