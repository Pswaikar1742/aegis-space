from pydantic import BaseModel, Field
from typing import Literal

class LeadStageUpdate(BaseModel):
    status: Literal['new', 'proposal_sent', 'closed_won', 'workbench_halted'] = Field(
        ..., description="The stage to progress the lead to"
    )

class LeadStageOut(BaseModel):
    id: str
    status: str
    message: str
