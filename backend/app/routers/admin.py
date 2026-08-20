"""
Admin Router
============
System administration endpoints — user management, monitoring device CRUD,
and live system health. All endpoints require Administrator role.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.monitoring_device import MonitoringDevice
from app.models.user import User
from app.schemas.monitoring_device import (
    MonitoringDeviceCreate,
    MonitoringDeviceResponse,
    MonitoringDeviceUpdate,
)
from app.schemas.user import UserResponse
from app.services.auth_service import get_current_user
from app.services.rbac import require_role

router = APIRouter(prefix="/admin", tags=["Admin System Management"])

# ---------------------------------------------------------------------------
# Default devices seeded on first run (mirrors survey/species pattern)
# ---------------------------------------------------------------------------
DEFAULT_DEVICES = [
    {
        "device_id": "CT-01",
        "name": "Sunderbans West Camera Node",
        "device_type": "Camera Trap (YOLO11)",
        "latitude": 21.94,
        "longitude": 88.90,
        "battery_level": 88,
        "status": "Online",
        "last_ping": datetime.now(timezone.utc).isoformat(),
        "total_captures": 1420,
    },
    {
        "device_id": "CT-02",
        "name": "Western Ghats Ridge Camera",
        "device_type": "Camera Trap (YOLO11)",
        "latitude": 11.58,
        "longitude": 76.54,
        "battery_level": 94,
        "status": "Online",
        "last_ping": datetime.now(timezone.utc).isoformat(),
        "total_captures": 3890,
    },
    {
        "device_id": "AS-01",
        "name": "Bioacoustic Sensor Array A",
        "device_type": "Audio Sensor (BirdNET-heuristic)",
        "latitude": 11.60,
        "longitude": 76.50,
        "battery_level": 42,
        "status": "Online",
        "last_ping": datetime.now(timezone.utc).isoformat(),
        "total_captures": 6210,
    },
    {
        "device_id": "AS-02",
        "name": "Bioacoustic Sensor Array B",
        "device_type": "Audio Sensor (YAMNet-heuristic)",
        "latitude": 26.58,
        "longitude": 93.17,
        "battery_level": 12,
        "status": "Low Battery Alert",
        "last_ping": datetime.now(timezone.utc).isoformat(),
        "total_captures": 1940,
    },
]


def _seed_devices(db: Session) -> None:
    """Seed default devices if the table is empty."""
    if db.query(MonitoringDevice).count() == 0:
        for data in DEFAULT_DEVICES:
            db.add(MonitoringDevice(**data))
        db.commit()


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Administrator")),
):
    """Fetch all registered platform users. Requires Administrator role."""
    users = db.query(User).all()
    if not users:
        return [current_user]
    return users


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Administrator")),
):
    """Update user role. Requires Administrator role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    valid_roles = [
        "Wildlife Researcher",
        "Conservation Officer",
        "Forest Department Officer",
        "Administrator",
    ]
    if role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of {valid_roles}",
        )

    user.role = role
    db.commit()
    db.refresh(user)
    return {"message": f"Updated role for {user.full_name} to {role}", "user": user}


# ---------------------------------------------------------------------------
# Monitoring Device CRUD
# ---------------------------------------------------------------------------

@router.get("/devices", response_model=List[MonitoringDeviceResponse])
def get_monitoring_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all monitoring devices from the database. Seeds defaults on first run."""
    _seed_devices(db)
    return db.query(MonitoringDevice).all()


@router.post("/devices", response_model=MonitoringDeviceResponse, status_code=status.HTTP_201_CREATED)
def create_monitoring_device(
    device_in: MonitoringDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Administrator")),
):
    """Register a new monitoring device. Requires Administrator role."""
    existing = db.query(MonitoringDevice).filter(
        MonitoringDevice.device_id == device_in.device_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device with ID '{device_in.device_id}' already exists.",
        )
    device = MonitoringDevice(**device_in.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.put("/devices/{device_id}", response_model=MonitoringDeviceResponse)
def update_monitoring_device(
    device_id: int,
    update_in: MonitoringDeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Administrator", "Forest Department Officer")),
):
    """Update a monitoring device record. Requires Administrator or Forest Department Officer."""
    device = db.query(MonitoringDevice).filter(MonitoringDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    for field, value in update_in.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_monitoring_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Administrator")),
):
    """Delete a monitoring device. Requires Administrator role."""
    device = db.query(MonitoringDevice).filter(MonitoringDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    db.delete(device)
    db.commit()


# ---------------------------------------------------------------------------
# System health
# ---------------------------------------------------------------------------

@router.get("/system-health")
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Live backend system diagnostics. Requires Administrator role."""
    import os  # noqa: PLC0415
    from app.config import settings  # noqa: PLC0415

    # Determine actual model state (lazy: just check file existence)
    custom_model_present = os.path.isfile(settings.YOLO_MODEL_PATH)
    vision_engine = (
        f"YOLO11-custom ({settings.YOLO_MODEL_PATH})"
        if custom_model_present
        else f"YOLO11-COCO-fallback (custom model missing at {settings.YOLO_MODEL_PATH})"
    )

    birdnet_present = bool(settings.BIRDNET_MODEL_PATH) and os.path.isfile(settings.BIRDNET_MODEL_PATH)
    audio_engine = "BirdNET + YAMNet (real models)" if birdnet_present else "BirdNET-heuristic / YAMNet-heuristic (spectral fallback)"

    device_count = db.query(MonitoringDevice).count()
    user_count = db.query(User).count()

    return {
        "api_status": "Healthy",
        "database_status": "Connected",
        "ai_vision_engine": vision_engine,
        "ai_vision_custom_model_present": custom_model_present,
        "bioacoustic_engine": audio_engine,
        "bioacoustic_real_model_present": birdnet_present,
        "registered_devices": device_count,
        "registered_users": user_count,
    }
