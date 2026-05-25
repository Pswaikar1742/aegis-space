"""
AegiSpace — FastRouter AI Parsing Service

Uses the OpenAI-compatible AsyncOpenAI client pointed at the FastRouter
gateway to extract structured deal parameters from raw email/transcript text.

The service returns a validated Pydantic model with:
  - company_name: str
  - required_capacity: int
  - requested_type: Literal['hot_desk', 'dedicated_desk', 'private_office', 'meeting_room']
  - budget: float

If the LLM response is malformed or missing fields, the service raises
a structured error that the endpoint can map to a Halted decision.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator

from app.core.config import get_settings

logger = logging.getLogger(__name__)


# ── Structured Output Schema ─────────────────────────────────────────────


class ParsedDealSignals(BaseModel):
    """Validated output from the LLM deal parser."""

    company_name: str = Field(
        ..., min_length=1, description="Name of the company or client"
    )
    required_capacity: int = Field(
        ..., ge=1, description="Number of seats/desks/people required"
    )
    requested_type: str = Field(
        ...,
        description="Space type: hot_desk, dedicated_desk, private_office, or meeting_room",
    )
    budget: float = Field(
        ..., ge=0, description="Monthly budget in the local currency"
    )
    contact_email: Optional[str] = Field(
        default=None, description="Contact email if mentioned"
    )

    @field_validator("requested_type")
    @classmethod
    def validate_space_type(cls, v: str) -> str:
        allowed = {"hot_desk", "dedicated_desk", "private_office", "meeting_room"}
        normalized = v.strip().lower().replace(" ", "_").replace("-", "_")
        if normalized not in allowed:
            raise ValueError(
                f"Invalid space type '{v}'. Must be one of: {sorted(allowed)}"
            )
        return normalized


# ── System Prompt ─────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert deal-extraction AI for a coworking space management platform called AegiSpace.

Given an email or conversation transcript, extract the following deal parameters as JSON:

{
  "company_name": "<string — the company or client name>",
  "required_capacity": <integer — number of seats, desks, or people needed>,
  "requested_type": "<string — one of: hot_desk, dedicated_desk, private_office, meeting_room>",
  "budget": <number — monthly budget amount, numeric only, no currency symbols>,
  "contact_email": "<string or null — contact email if mentioned>"
}

Rules:
1. Return ONLY valid JSON. No markdown, no explanation, no code fences.
2. The "requested_type" MUST be exactly one of: hot_desk, dedicated_desk, private_office, meeting_room.
   - Map terms like "shared desk", "flexi desk", "open desk" → hot_desk
   - Map terms like "fixed desk", "assigned desk", "permanent desk" → dedicated_desk
   - Map terms like "office", "private cabin", "cabin", "enclosed space" → private_office
   - Map terms like "conference room", "boardroom", "meeting space" → meeting_room
3. For "budget", extract the numeric value only. If a total is given for multiple months, divide to get monthly.
4. If a field cannot be determined from the text, use reasonable defaults:
   - company_name: "Unknown Company"
   - required_capacity: 1
   - requested_type: "hot_desk"
   - budget: 0
5. If the text contains absolutely no deal-related information (e.g., it's spam, gibberish, or unrelated), return:
   {"company_name": "", "required_capacity": 0, "requested_type": "", "budget": 0}
"""


# ── AI Service ────────────────────────────────────────────────────────────


class AIParserError(Exception):
    """Raised when the LLM response cannot be parsed into deal signals."""

    def __init__(self, message: str, raw_response: str = ""):
        super().__init__(message)
        self.raw_response = raw_response


async def parse_deal_signals(email_body: str) -> ParsedDealSignals:
    """Send the email body to FastRouter and parse the structured response.

    Args:
        email_body: Raw email or transcript text.

    Returns:
        ParsedDealSignals with validated fields.

    Raises:
        AIParserError: If the LLM returns unparseable or invalid output.
    """
    settings = get_settings()

    client = AsyncOpenAI(
        api_key=settings.FASTROUTER_API_KEY,
        base_url=settings.FASTROUTER_BASE_URL,
    )

    try:
        logger.info(
            "FastRouter request — model=%s, input_length=%d chars",
            settings.FASTROUTER_MODEL,
            len(email_body),
        )

        completion = await client.chat.completions.create(
            model=settings.FASTROUTER_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": email_body},
            ],
            temperature=0.1,       # Low temperature for deterministic extraction
            max_tokens=500,        # Structured JSON is small
            response_format={"type": "json_object"},
        )

        raw_content = completion.choices[0].message.content
        if not raw_content:
            raise AIParserError("LLM returned empty response", raw_response="")

        logger.info("FastRouter raw response: %s", raw_content[:200])

        # ── Parse JSON ────────────────────────────────────────────────────
        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError as e:
            raise AIParserError(
                f"LLM returned invalid JSON: {e}", raw_response=raw_content
            )

        # ── Check for "no deal" sentinel ──────────────────────────────────
        if (
            not parsed.get("company_name")
            and parsed.get("required_capacity", 0) == 0
            and not parsed.get("requested_type")
        ):
            raise AIParserError(
                "LLM detected no deal signals in the input",
                raw_response=raw_content,
            )

        # ── Validate through Pydantic ─────────────────────────────────────
        signals = ParsedDealSignals(**parsed)

        logger.info(
            "Parsed deal signals: company=%s, capacity=%d, type=%s, budget=%.2f",
            signals.company_name,
            signals.required_capacity,
            signals.requested_type,
            signals.budget,
        )

        return signals

    except AIParserError:
        raise
    except Exception as exc:
        logger.exception("FastRouter API call failed")
        raise AIParserError(
            f"FastRouter API error: {exc}", raw_response=str(exc)
        ) from exc
    finally:
        await client.close()
