from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class TicketBase(BaseModel):
    branch_id: str
    inventory_item_id: Optional[str] = None
    description: str = Field(..., min_length=5)

class TicketCreate(TicketBase):
    pass

class TicketOut(TicketBase):
    id: str
    status: str = Field(description="'open', 'in_progress', 'resolved'")
    created_at: datetime
