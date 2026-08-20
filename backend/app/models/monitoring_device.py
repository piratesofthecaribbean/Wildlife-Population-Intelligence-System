from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class MonitoringDevice(Base):
    """Persistent monitoring device registry (camera traps, audio sensors, drones)."""

    __tablename__ = "monitoring_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)  # e.g. CT-01
    name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)  # Camera Trap, Audio Sensor, Drone
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    battery_level = Column(Integer, nullable=True)   # 0-100 %
    status = Column(String, default="Online")        # Online, Offline, Low Battery Alert
    last_ping = Column(String, nullable=True)        # human-readable string or ISO timestamp
    total_captures = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
