"""
RBAC test suite.
Verifies that endpoints correctly restrict access based on user role.
"""
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI, Depends

from app.services.rbac import require_role
from app.models.user import User
from app.services.auth_service import get_current_user

# Create a dummy app to test the dependency isolated from the main app's DB
app = FastAPI()

# Mock get_current_user logic for testing
def override_get_current_user():
    return User(id=1, email="test@example.com", full_name="Test User", role="Guest")

app.dependency_overrides[get_current_user] = override_get_current_user

@app.get("/admin-only")
def admin_only(user: User = Depends(require_role("Administrator"))):
    return {"message": "success"}

@app.get("/officer-only")
def officer_only(user: User = Depends(require_role("Conservation Officer"))):
    return {"message": "success"}

@app.get("/multi-role")
def multi_role(user: User = Depends(require_role("Administrator", "Conservation Officer"))):
    return {"message": "success"}


client = TestClient(app)


def test_rbac_rejects_unauthorized_role():
    """A user with 'Guest' role should be rejected from an 'Administrator' endpoint."""
    app.dependency_overrides[get_current_user] = lambda: User(id=1, role="Guest")
    response = client.get("/admin-only")
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_rbac_accepts_authorized_role():
    """A user with 'Administrator' role should be accepted on an 'Administrator' endpoint."""
    app.dependency_overrides[get_current_user] = lambda: User(id=1, role="Administrator")
    response = client.get("/admin-only")
    assert response.status_code == 200
    assert response.json() == {"message": "success"}


def test_rbac_multi_role_accepts_any_valid_role():
    """An endpoint allowing multiple roles should accept any of them."""
    app.dependency_overrides[get_current_user] = lambda: User(id=1, role="Conservation Officer")
    response = client.get("/multi-role")
    assert response.status_code == 200

    app.dependency_overrides[get_current_user] = lambda: User(id=1, role="Administrator")
    response2 = client.get("/multi-role")
    assert response2.status_code == 200


def test_rbac_multi_role_rejects_invalid_role():
    """An endpoint allowing multiple roles should reject roles not in the list."""
    app.dependency_overrides[get_current_user] = lambda: User(id=1, role="Wildlife Researcher")
    response = client.get("/multi-role")
    assert response.status_code == 403
