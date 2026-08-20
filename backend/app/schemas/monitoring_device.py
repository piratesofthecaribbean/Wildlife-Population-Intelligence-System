"""
Monitoring Device schema — for CRUD endpoints.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class MonitoringDeviceBase(BaseModel):
    device_id: str
    name: str
    device_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    battery_level: Optional[int] = None
    status: str = "Online"
    last_ping: Optional[str] = None
    total_captures: int = 0


class MonitoringDeviceCreate(MonitoringDeviceBase):
    pass


class MonitoringDeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    battery_level: Optional[int] = None
    status: Optional[str] = None
    last_ping: Optional[str] = None
    total_captures: Optional[int] = None


class MonitoringDeviceResponse(MonitoringDeviceBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
