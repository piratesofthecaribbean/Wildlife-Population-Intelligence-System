"""
Role-Based Access Control (RBAC) dependency helpers.

Usage
-----
    from app.services.rbac import require_role

    @router.get("/admin/users")
    def get_users(current_user: User = Depends(require_role("Administrator"))):
        ...

    @router.post("/species")
    def create_species(
        current_user: User = Depends(require_role("Administrator", "Wildlife Researcher"))
    ):
        ...

require_role() returns a FastAPI dependency that:
  1. First calls get_current_user() (which validates the JWT — raises 401 if invalid/absent).
  2. Then checks whether the authenticated user's role is in the allowed list.
  3. Raises HTTP 403 Forbidden if not (never 401 — the user is authenticated, just not authorized).
"""

from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.services.auth_service import get_current_user


def require_role(*allowed_roles: str):
    """
    FastAPI dependency factory.

    Parameters
    ----------
    *allowed_roles : str
        One or more role strings that are permitted to access the endpoint,
        e.g. require_role("Administrator") or
             require_role("Administrator", "Conservation Officer")

    Returns
    -------
    Callable — a FastAPI dependency that resolves to the authenticated User
    and raises HTTP 403 if the user's role is not in allowed_roles.
    """
    roles = set(allowed_roles)

    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. This endpoint requires one of: "
                    f"{sorted(roles)}. Your role is '{current_user.role}'."
                ),
            )
        return current_user

    # Give the inner function a descriptive name so FastAPI's OpenAPI generator
    # doesn't collapse all require_role() deps into a single "check" dependency.
    _check.__name__ = f"require_role_{'_or_'.join(sorted(roles))}"
    return _check
