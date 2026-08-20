from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.database import get_db
from app.services.conservation_service import ConservationService
from app.services.alert_service import AlertService

router = APIRouter(prefix="/conservation", tags=["Conservation Intelligence"])


@router.get("/health-score")
def get_ecosystem_health_score(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Weighted Ecosystem Health Score:
    30% Species Diversity + 25% Population Stability + 20% Habitat Quality + 15% Endangered Status + 10% Environmental
    """
    return ConservationService.calculate_health_scores(db)


@router.get("/recommendations")
def get_conservation_recommendations(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """AI-driven conservation actions and habitat restoration suggestions."""
    return ConservationService.get_recommendations(db)


@router.get("/alerts")
def get_system_alerts(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Active notification alerts (endangered species, population declines, habitat degradation, hardware)."""
    return AlertService.get_active_alerts(db)
