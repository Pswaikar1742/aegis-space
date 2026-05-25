"""
AegiSpace — Nexus Orchestration Endpoint (Production v1.0.0)

POST /api/v1/nexus/orchestrate → Full AI-driven deal allocation pipeline.

Pipeline stages:
  1. Input validation & placeholder guard
  2. AI parsing via FastRouter (extract company, capacity, type, budget)
  3. Inventory query — find available items matching type, capacity, budget
  4. Happy path: allocate inventory → create lead (closed_won) → create booking
  5. Exception path: create lead (workbench_halted) → return halt reason

This replaces the deterministic mock regex parser from iteration 1.
"""

from __future__ import annotations

import logging
import math
from datetime import date, timedelta

from fastapi import APIRouter, Depends, status
from supabase import Client

from app.core.db import get_supabase_client
from app.models.nexus import (
    HaltReason,
    OrchestrateDecision,
    OrchestrateRequest,
    OrchestrateResponse,
)
from app.services.ai_service import AIParserError, parse_deal_signals

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nexus", tags=["Nexus Orchestration"])

# ── Placeholder / junk-input blacklist ────────────────────────────────────
_PLACEHOLDER_PATTERNS: set[str] = {
    "ok", "test", "mno", "abc", "xyz", "hello", "asdf",
    "placeholder", "dummy", "sample", "lorem",
}


def _is_placeholder(text: str) -> bool:
    """Reject known junk/placeholder inputs."""
    stripped = text.strip().lower()
    return stripped in _PLACEHOLDER_PATTERNS or len(stripped) < 5


# ── Helpers ───────────────────────────────────────────────────────────────


def _compute_total_value(monthly_rate: float, months: int = 1) -> float:
    """Calculate total booking value for the given number of months."""
    return round(monthly_rate * max(months, 1), 2)


# ── POST /api/v1/nexus/orchestrate ────────────────────────────────────────


@router.post(
    "/orchestrate",
    response_model=OrchestrateResponse,
    status_code=status.HTTP_200_OK,
    summary="AI-driven deal allocation pipeline",
    description=(
        "**Production v1.0.0 — FastRouter LLM engine.** "
        "Parses the email body using the FastRouter AI service to extract "
        "structured deal parameters, then queries Supabase inventory for "
        "matching available spaces, and either allocates the space (Success) "
        "or halts with a specific reason (Halted)."
    ),
)
async def orchestrate(
    payload: OrchestrateRequest,
    db: Client = Depends(get_supabase_client),
) -> OrchestrateResponse:
    """Full allocation pipeline — the production brain of AegiSpace.

    Stages:
    1. Input guard (placeholder rejection)
    2. AI parsing via FastRouter
    3. Inventory search (type + capacity + budget filters)
    4. Happy path: allocate → lead (closed_won) → booking
    5. Exception path: lead (workbench_halted) → halt reason
    """
    email_body = payload.email_body.strip()
    branch_id = payload.branch_id.strip()

    # ══════════════════════════════════════════════════════════════════════
    # STAGE 1: Input guard
    # ══════════════════════════════════════════════════════════════════════

    if _is_placeholder(email_body):
        logger.warning(
            "STAGE 1 HALT — placeholder input: %r", email_body[:50]
        )
        return OrchestrateResponse(
            decision=OrchestrateDecision.HALTED,
            halt_reason=HaltReason.PLACEHOLDER_INPUT,
            halt_detail="Input rejected as placeholder or junk text.",
            branch_id=branch_id,
            confidence=1.0,
        )

    # ══════════════════════════════════════════════════════════════════════
    # STAGE 2: AI parsing via FastRouter
    # ══════════════════════════════════════════════════════════════════════

    try:
        signals = await parse_deal_signals(email_body)
    except AIParserError as e:
        logger.warning("STAGE 2 HALT — AI parse failed: %s", e)

        # Attempt to create a halted lead for traceability
        _try_create_halted_lead(
            db=db,
            branch_id=branch_id,
            company_name="Unknown (AI parse failed)",
            reason=f"AI parser error: {e}",
        )

        return OrchestrateResponse(
            decision=OrchestrateDecision.HALTED,
            halt_reason=HaltReason.AI_PARSE_FAILED,
            halt_detail=str(e),
            branch_id=branch_id,
            confidence=0.0,
        )

    extracted = {
        "company_name": signals.company_name,
        "required_capacity": signals.required_capacity,
        "requested_type": signals.requested_type,
        "budget": signals.budget,
        "contact_email": signals.contact_email,
    }

    logger.info(
        "STAGE 2 OK — extracted: company=%s capacity=%d type=%s budget=%.2f",
        signals.company_name,
        signals.required_capacity,
        signals.requested_type,
        signals.budget,
    )

    # ══════════════════════════════════════════════════════════════════════
    # STAGE 3: Inventory search
    # ══════════════════════════════════════════════════════════════════════

    try:
        # Query available items matching the requested type
        query = (
            db.table("inventory_items")
            .select("*")
            .eq("branch_id", branch_id)
            .eq("type", signals.requested_type)
            .eq("status", "available")
        )
        inv_response = query.execute()
        available_items = inv_response.data or []

        logger.info(
            "STAGE 3 — found %d available '%s' items for branch %s",
            len(available_items),
            signals.requested_type,
            branch_id,
        )

    except Exception as exc:
        logger.exception("STAGE 3 HALT — database query failed")
        return OrchestrateResponse(
            decision=OrchestrateDecision.HALTED,
            halt_reason=HaltReason.DATABASE_ERROR,
            halt_detail=f"Inventory query failed: {exc}",
            extracted_data=extracted,
            branch_id=branch_id,
            confidence=0.5,
        )

    # ── Filter by capacity and budget ─────────────────────────────────────
    capacity_matches = [
        item for item in available_items
        if int(item.get("capacity", 0)) >= signals.required_capacity
    ]

    budget_matches = [
        item for item in capacity_matches
        if float(item.get("monthly_rate", 0)) <= signals.budget
    ] if signals.budget > 0 else capacity_matches  # budget=0 means no budget constraint

    # ── Determine halt reason if no match ─────────────────────────────────
    if not available_items:
        halt_reason = HaltReason.NO_INVENTORY_MATCH
        halt_detail = (
            f"No available '{signals.requested_type}' inventory found "
            f"for branch {branch_id}."
        )
    elif not capacity_matches:
        halt_reason = HaltReason.CAPACITY_EXCEEDED
        halt_detail = (
            f"Found {len(available_items)} available '{signals.requested_type}' items, "
            f"but none with capacity >= {signals.required_capacity}. "
            f"Max available capacity: {max(int(i.get('capacity', 0)) for i in available_items)}."
        )
    elif not budget_matches:
        halt_reason = HaltReason.BUDGET_EXCEEDED
        lowest_rate = min(float(i.get("monthly_rate", 0)) for i in capacity_matches)
        halt_detail = (
            f"Found {len(capacity_matches)} items with sufficient capacity, "
            f"but none within budget ≤ ₹{signals.budget:.2f}. "
            f"Lowest matching rate: ₹{lowest_rate:.2f}."
        )
    else:
        halt_reason = None
        halt_detail = None

    # ══════════════════════════════════════════════════════════════════════
    # EXCEPTION PATH: No suitable inventory
    # ══════════════════════════════════════════════════════════════════════

    if halt_reason is not None:
        logger.info(
            "STAGE 3 HALT — %s: %s", halt_reason.value, halt_detail
        )

        lead_record = _try_create_halted_lead(
            db=db,
            branch_id=branch_id,
            company_name=signals.company_name,
            contact_email=signals.contact_email,
            deal_size=signals.budget,
            reason=halt_detail or "No inventory match",
        )

        return OrchestrateResponse(
            decision=OrchestrateDecision.HALTED,
            halt_reason=halt_reason,
            halt_detail=halt_detail,
            extracted_data=extracted,
            lead_record=lead_record,
            branch_id=branch_id,
            confidence=0.8,
        )

    # ══════════════════════════════════════════════════════════════════════
    # HAPPY PATH: Allocate best match
    # ══════════════════════════════════════════════════════════════════════

    # Pick the best match: cheapest rate among budget-fitting items
    best_item = min(budget_matches, key=lambda i: float(i.get("monthly_rate", 0)))
    monthly_rate = float(best_item["monthly_rate"])
    total_value = _compute_total_value(monthly_rate, months=1)

    logger.info(
        "STAGE 4 — allocating item '%s' (id=%s) at ₹%.2f/month",
        best_item.get("name", "?"),
        best_item["id"],
        monthly_rate,
    )

    try:
        # ── Step 4a: Mark inventory as allocated ──────────────────────────
        db.table("inventory_items").update(
            {"status": "allocated"}
        ).eq("id", best_item["id"]).execute()

        # ── Step 4b: Create lead with status 'closed_won' ─────────────────
        lead_row = {
            "branch_id": branch_id,
            "company_name": signals.company_name,
            "contact_email": signals.contact_email or "",
            "status": "closed_won",
            "deal_size": total_value,
            "next_steps": (
                f"Auto-allocated {signals.requested_type} "
                f"'{best_item.get('name', 'N/A')}' with capacity "
                f"{best_item.get('capacity', '?')} at ₹{monthly_rate:.2f}/mo."
            ),
        }
        lead_response = db.table("leads").insert(lead_row).execute()
        lead_record = lead_response.data[0] if lead_response.data else lead_row

        # ── Step 4c: Create booking (best-effort; non-fatal for demo) ─────
        today = date.today()
        booking_row = {
            "inventory_item_id": best_item["id"],
            "lead_id": lead_record.get("id", ""),
            "branch_id": branch_id,
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=30)).isoformat(),
            "monthly_rate_locked": monthly_rate,
            "total_value": total_value,
            "status": "confirmed",
            "notes": (
                f"Auto-booked via Nexus orchestration for "
                f"{signals.company_name} — {signals.required_capacity} "
                f"{signals.requested_type}(s)."
            ),
        }

        booking_record = None
        try:
            booking_response = db.table("bookings").insert(booking_row).execute()
            booking_record = (
                booking_response.data[0] if booking_response.data else booking_row
            )
        except Exception as booking_exc:
            logger.warning(
                "STAGE 4 WARN — booking insert skipped: %s", booking_exc
            )

        logger.info(
            "STAGE 4 SUCCESS — lead=%s booking=%s item=%s",
            lead_record.get("id", "?"),
            booking_record.get("id", "?") if booking_record else "skipped",
            best_item["id"],
        )

        return OrchestrateResponse(
            decision=OrchestrateDecision.SUCCESS,
            extracted_data=extracted,
            matched_inventory={
                "id": best_item["id"],
                "name": best_item.get("name", ""),
                "type": best_item.get("type", ""),
                "capacity": best_item.get("capacity", 0),
                "monthly_rate": monthly_rate,
            },
            lead_record=lead_record,
            booking_record=booking_record,
            branch_id=branch_id,
            confidence=0.9,
        )

    except Exception as exc:
        logger.exception("STAGE 4 HALT — database write failed")

        # Attempt to rollback inventory status
        try:
            db.table("inventory_items").update(
                {"status": "available"}
            ).eq("id", best_item["id"]).execute()
            logger.info("Rollback: inventory %s restored to available", best_item["id"])
        except Exception:
            logger.exception("Rollback failed for inventory %s", best_item["id"])

        return OrchestrateResponse(
            decision=OrchestrateDecision.HALTED,
            halt_reason=HaltReason.DATABASE_ERROR,
            halt_detail=f"Failed to complete allocation: {exc}",
            extracted_data=extracted,
            branch_id=branch_id,
            confidence=0.5,
        )


# ── Helper: Create a halted lead for traceability ─────────────────────────


def _try_create_halted_lead(
    db: Client,
    branch_id: str,
    company_name: str,
    contact_email: str | None = None,
    deal_size: float = 0.0,
    reason: str = "",
) -> dict | None:
    """Best-effort insert of a lead with status 'workbench_halted'.

    Returns the created lead record, or None if the insert fails.
    Never raises — failures are logged but swallowed.
    """
    try:
        lead_row = {
            "branch_id": branch_id,
            "company_name": company_name,
            "contact_email": contact_email or "",
            "status": "workbench_halted",
            "deal_size": deal_size,
            "next_steps": reason,
        }
        response = db.table("leads").insert(lead_row).execute()
        record = response.data[0] if response.data else lead_row
        logger.info(
            "Halted lead created: company=%s reason=%s",
            company_name,
            reason[:80],
        )
        return record
    except Exception:
        logger.exception("Failed to create halted lead for %s", company_name)
        return None
