"""
AegiSpace — Lead Pydantic Schemas

Schemas for lead records returned by the pipeline dashboard.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class LeadStatus(str, Enum):
    """Allowed lead lifecycle states used in the dashboard."""

    NEW = "new"
    PROPOSAL_SENT = "proposal_sent"
    CLOSED_WON = "closed_won"
    WORKBENCH_HALTED = "workbench_halted"


class LeadOut(BaseModel):
    """Lead record returned to the frontend pipeline table."""

    id: UUID
    branch_id: UUID
    company_name: str = Field(..., max_length=100)
    contact_email: Optional[str] = Field(default=None, max_length=100)
    status: LeadStatus
    deal_size: float = 0
    next_steps: Optional[str] = None

    model_config = {"from_attributes": True}
