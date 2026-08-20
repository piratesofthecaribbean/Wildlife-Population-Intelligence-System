"""
Tracks which alerts have been dispatched (emailed) to prevent duplicate delivery.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class AlertDispatch(Base):
    """Records when an alert was emailed so the dispatcher can skip already-sent ones."""

    __tablename__ = "alert_dispatches"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, index=True, nullable=False)   # e.g. ALT-END-5, ALT-HAB-2
    alert_type = Column(String, nullable=True)
    dispatched_at = Column(DateTime(timezone=True), server_default=func.now())
    delivery_channel = Column(String, default="email")      # email | sms | webhook
    recipient = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    error_detail = Column(String, nullable=True)
