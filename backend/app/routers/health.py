"""
health.py
---------
Basic health-check endpoint used to verify the API and DB
connection are alive. Useful for Docker healthchecks and
Render deployment readiness probes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Simple liveness check - confirms the API process is running."""
    return {"status": "ok", "service": "Wildlife Population Intelligence System API"}


@router.get("/health/db")
def health_check_db(db: Session = Depends(get_db)):
    """Readiness check - confirms the API can talk to PostgreSQL."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "database": "unreachable", "detail": str(e)}
