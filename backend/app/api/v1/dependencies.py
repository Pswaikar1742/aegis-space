from fastapi import Header, HTTPException, status

def get_current_role(x_user_role: str = Header(..., description="Role of the user (e.g. cfo, manager, tenant_admin, member)")) -> str:
    allowed_roles = {"cfo", "manager", "tenant_admin", "member"}
    role = x_user_role.strip().lower()
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid role '{role}'. Allowed roles are: {', '.join(allowed_roles)}"
        )
    return role

def require_role(required_roles: list[str]):
    def role_checker(role: str = Header(..., alias="X-User-Role")) -> str:
        current = role.strip().lower()
        if current not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of: {', '.join(required_roles)}"
            )
        return current
    return role_checker
