"""
End-to-End Tests for the Wildlife Population Intelligence System.
"""
import pytest
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.config import settings

# ---------------------------------------------------------------------------
# Setup test database
# ---------------------------------------------------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_e2e.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_admin_token():
    # Register an admin user
    try:
        client.post("/api/v1/auth/register", json={
            "email": "admin@example.com",
            "password": "password123",
            "full_name": "Test Admin",
            "role": "Administrator"
        })
    except Exception:
        pass

    # Login via the new OAuth2 token endpoint
    res = client.post("/api/v1/auth/token", data={
        "username": "admin@example.com",
        "password": "password123"
    })
    return res.json()["access_token"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def test_oauth2_token_endpoint():
    """Verify standard RFC 6749 form-encoded login works."""
    client.post("/api/v1/auth/register", json={
        "email": "researcher@example.com",
        "password": "password123",
        "full_name": "Test Researcher",
        "role": "Wildlife Researcher"
    })

    res = client.post("/api/v1/auth/token", data={
        "username": "researcher@example.com",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_auth_bypass_prevented():
    """Unauthenticated requests to protected endpoints should 401."""
    res = client.get("/api/v1/admin/users")
    assert res.status_code == 401


def test_rbac_admin_routes():
    """Verify that only admins can access admin routes."""
    # Register a guest
    client.post("/api/v1/auth/register", json={
        "email": "guest@example.com",
        "password": "password123",
        "full_name": "Test Guest",
        "role": "Guest"
    })
    guest_res = client.post("/api/v1/auth/token", data={
        "username": "guest@example.com",
        "password": "password123"
    })
    guest_token = guest_res.json()["access_token"]

    # Guest accessing admin users -> 403
    res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {guest_token}"})
    assert res.status_code == 403

    # Admin accessing admin users -> 200
    admin_token = _get_admin_token()
    res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_device_crud_flow():
    """E2E flow: Create, Read, Update, Delete for monitoring devices."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # CREATE
    new_device = {
        "device_id": "TEST-CT-01",
        "name": "Test Camera",
        "device_type": "Camera Trap",
        "latitude": 10.0,
        "longitude": 20.0
    }
    res_create = client.post("/api/v1/admin/devices", json=new_device, headers=headers)
    assert res_create.status_code == 201
    device_data = res_create.json()
    assert device_data["device_id"] == "TEST-CT-01"
    device_id = device_data["id"]

    # READ (list)
    res_list = client.get("/api/v1/admin/devices", headers=headers)
    assert res_list.status_code == 200
    assert any(d["device_id"] == "TEST-CT-01" for d in res_list.json())

    # UPDATE
    res_update = client.put(f"/api/v1/admin/devices/{device_id}", json={"battery_level": 50}, headers=headers)
    assert res_update.status_code == 200
    assert res_update.json()["battery_level"] == 50

    # DELETE
    res_delete = client.delete(f"/api/v1/admin/devices/{device_id}", headers=headers)
    assert res_delete.status_code == 204

    # Verify deleted
    res_list_after = client.get("/api/v1/admin/devices", headers=headers)
    assert not any(d["device_id"] == "TEST-CT-01" for d in res_list_after.json())


def test_system_health():
    """Verify system-health diagnostic endpoint returns correct model statuses."""
    token = _get_admin_token()
    res = client.get("/api/v1/admin/system-health", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "ai_vision_engine" in data
    assert "bioacoustic_engine" in data
    assert data["api_status"] == "Healthy"


def test_detection_upload_flow():
    """E2E: image upload with GPS form fields should parse and return formatted detection."""
    token = _get_admin_token()

    # Create real 64x64 valid JPEG image
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(200, 100, 50)).save(buf, format="JPEG")
    fake_img = io.BytesIO(buf.getvalue())
    fake_img.name = "test_tiger.jpg"

    res = client.post(
        "/api/v1/detections/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test_tiger.jpg", fake_img, "image/jpeg")},
        data={
            "latitude": "21.9",
            "longitude": "88.8",
            "habitat_type": "Mangrove",
            "protected_area": "Test Reserve"
        }
    )

    # If the custom model isn't loaded, this might fall back to COCO and return 'is_verified_species: False'.
    # We just ensure it processed without blowing up and saved our GPS info.
    assert res.status_code == 200
    data = res.json()
    assert data["latitude"] == 21.9
    assert data["longitude"] == 88.8
    assert data["habitat_type"] == "Mangrove"
    assert data["protected_area"] == "Test Reserve"
    assert "is_verified_species" in data
    assert "model" in data
