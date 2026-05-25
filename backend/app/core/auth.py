from typing import List, Optional
from fastapi import Header, HTTPException, status

def require_role(allowed_roles: List[str]):
    def role_checker(
        x_user_role: str = Header(..., alias="X-User-Role", description="Role: cfo, manager, tenant_admin, member, front_desk, it_admin, vendor"),
        x_user_id: Optional[str] = Header(None, alias="X-User-ID", description="ID of the user")
    ) -> dict:
        current_role = x_user_role.strip().lower()
        if current_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of: {', '.join(allowed_roles)}"
            )
        return {"role": current_role, "user_id": x_user_id}
    return role_checker
