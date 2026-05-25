from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BillingCompileRequest(BaseModel):
    company_name: str
    branch_id: str

class InvoiceOut(BaseModel):
    id: str
    company_name: str
    branch_id: str
    base_rent: float
    incidentals: float
    total_due: float
    status: str
    created_at: Optional[datetime] = None
