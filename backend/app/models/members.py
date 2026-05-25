from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class MemberBase(BaseModel):
    company_name: str
    email: EmailStr
    role: str = Field(description="Role: 'cfo', 'manager', 'tenant_admin', or 'member'")
    branch_id: str

class MemberCreate(MemberBase):
    pass

class MemberOut(MemberBase):
    id: str
    created_at: Optional[datetime] = None

class MemberPerksBase(BaseModel):
    member_id: str
    monthly_credits: int = 0
    printing_quota: int = 0
    active_status: bool = True

class MemberPerksOut(MemberPerksBase):
    pass

class MemberPerksUpdate(BaseModel):
    monthly_credits: Optional[int] = None
    printing_quota: Optional[int] = None
    active_status: Optional[bool] = None
