"""
Dashboard Router
================
Serves per-role widgets and trend charts driven by live database queries.
All values here are computed from actual observation/user/habitat data —
no hardcoded JSON stubs.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Dict, Any, List

from app.database import get_db
from app.models.detection import Detection
from app.models.audio_observation import AudioObservation
from app.models.survey import Survey
from app.models.species import Species
from app.models.habitat import Habitat
from app.models.user import User
from app.models.monitoring_device import MonitoringDevice
from app.services.biodiversity_service import BiodiversityService
from app.services.conservation_service import ConservationService
from app.services.alert_service import AlertService

from app.services.population_service import PopulationService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_detections = db.query(func.count(Detection.id)).scalar() or 0
    total_audio = db.query(func.count(AudioObservation.id)).scalar() or 0
    active_surveys = db.query(func.count(Survey.id)).scalar() or 0
    endangered_species = (
        db.query(func.count(Species.id))
        .filter(Species.conservation_status.in_(["EN", "CR", "VU"]))
        .scalar() or 0
    )

    avg_health = db.query(func.avg(Habitat.health_score)).scalar()
    average_habitat_health = round(float(avg_health), 2) if avg_health else 0.0

    return {
        "total_detections": total_detections + total_audio,
        "image_detections": total_detections,
        "audio_detections": total_audio,
        "active_surveys": active_surveys,
        "endangered_species": endangered_species,
        "average_habitat_health": average_habitat_health,
    }


@router.get("/trends")
def get_trends(db: Session = Depends(get_db)):
    """
    Live trend data derived from the database.
    Multi-year population trends use the longitudinal demographic model.
    """
    # ── 1. Multi-Year Species Population Growth Trends (Longitudinal Model) ───
    pop_data = PopulationService.get_population_trends(db)
    population_trends = pop_data.get("historical_census", [])

    # ── 2. Detections by species (image + audio, combined count) ───────────────
    img_by_species = (
        db.query(Detection.species_name, func.count(Detection.id).label("cnt"))
        .group_by(Detection.species_name)
        .all()
    )
    aud_by_species = (
        db.query(AudioObservation.species_name, func.count(AudioObservation.id).label("cnt"))
        .group_by(AudioObservation.species_name)
        .all()
    )

    combined: Dict[str, int] = {}
    for name, cnt in img_by_species:
        combined[name] = combined.get(name, 0) + int(cnt or 0)
    for name, cnt in aud_by_species:
        combined[name] = combined.get(name, 0) + int(cnt or 0)

    detections_by_species = [
        {"name": name, "value": count}
        for name, count in sorted(combined.items(), key=lambda x: -x[1])
    ]

    # ── 3. Monthly activity (reuse real BiodiversityService implementation) ────
    monthly_data = BiodiversityService.get_monthly_trends(db)
    monthly_activity = [
        {"month": m["month"], "detections": m["image"], "audio": m["audio"]}
        for m in monthly_data
    ]

    return {
        "population_trends": population_trends,
        "detections_by_species": detections_by_species,
        "monthly_activity": monthly_activity,
    }


@router.get("/roles/{role}")
def get_role_dashboard(role: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Per-role dashboard widgets computed from live DB data.
    Widget values are real counts/scores — not hardcoded strings.
    """
    normalized_role = (role or "").strip().lower()

    # ── Shared metrics used across multiple roles ──────────────────────────────
    total_img = db.query(func.count(Detection.id)).scalar() or 0
    total_aud = db.query(func.count(AudioObservation.id)).scalar() or 0
    total_detections = total_img + total_aud

    biodiversity = BiodiversityService.get_biodiversity_metrics(db)
    shannon = biodiversity.get("shannon_diversity_index", 0.0)
    endangered_count = biodiversity.get("endangered_detections", 0)

    # Recent 5 observations (combined)
    recent_img = (
        db.query(Detection)
        .order_by(Detection.created_at.desc())
        .limit(5).all()
    )
    recent_obs = [
        {
            "species": d.species_name,
            "type": f"Camera Trap ({d.model_used or 'YOLO11'})",
            "confidence": f"{round(d.confidence * 100)}%",
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in recent_img
    ]

    if "researcher" in normalized_role:
        # Species pending review = unverified (low confidence < 0.5)
        pending_review_count = (
            db.query(func.count(Detection.id))
            .filter(Detection.confidence < 0.5)
            .scalar() or 0
        )
        return {
            "role": "Wildlife Researcher",
            "primary_focus": "Species Observations & Bioacoustics",
            "widgets": [
                {"title": "Total Detections Logged", "value": str(total_detections),
                 "change": f"Image: {total_img} | Audio: {total_aud}"},
                {"title": "Bioacoustic Audio Records", "value": str(total_aud),
                 "change": "BirdNET-heuristic / YAMNet-heuristic"},
                {"title": "Species Diversity Index (Shannon)", "value": f"{shannon:.2f}",
                 "change": f"Richness: {biodiversity.get('species_richness', 0)} species"},
                {"title": "Low-Confidence Detections (Pending Review)",
                 "value": str(pending_review_count), "change": "Confidence < 50%"},
            ],
            "recent_observations": recent_obs,
        }

    elif "officer" in normalized_role and "forest" not in normalized_role:
        health = ConservationService.calculate_health_scores(db)
        alerts = AlertService.get_active_alerts(db)
        high_priority_alerts = [a for a in alerts if a.get("severity") in ("high", "critical")]
        habitat_count = db.query(func.count(Habitat.id)).scalar() or 0
        avg_health_raw = db.query(func.avg(Habitat.health_score)).scalar()
        avg_health = round(float(avg_health_raw) * 100, 1) if avg_health_raw else 0.0
        return {
            "role": "Conservation Officer",
            "primary_focus": "Threat Monitoring & Ecosystem Health",
            "widgets": [
                {"title": "Overall Ecosystem Health",
                 "value": f"{health['overall_health_score']} / 100",
                 "status": health["status"]},
                {"title": "Active High-Priority Alerts",
                 "value": str(len(high_priority_alerts)),
                 "status": "Requires Action" if high_priority_alerts else "Clear"},
                {"title": "Monitored Habitat Sites",
                 "value": str(habitat_count), "status": "Active"},
                {"title": "Endangered Species Detections",
                 "value": str(endangered_count), "status": "Monitored"},
            ],
            "health_breakdown": health.get("weights", {}),
        }

    elif "forest" in normalized_role:
        survey_count = db.query(func.count(Survey.id)).scalar() or 0
        device_count = db.query(func.count(MonitoringDevice.id)).scalar() or 0
        camera_count = (
            db.query(func.count(MonitoringDevice.id))
            .filter(MonitoringDevice.device_type.ilike("%camera%"))
            .scalar() or 0
        )
        return {
            "role": "Forest Department Officer",
            "primary_focus": "Protected Area Management & Patrols",
            "widgets": [
                {"title": "Active Surveys", "value": str(survey_count), "status": "Monitored"},
                {"title": "Monitoring Devices Online",
                 "value": str(device_count), "status": "Operational"},
                {"title": "Camera Trap Nodes", "value": str(camera_count),
                 "status": "Active"},
                {"title": "Total Image Detections", "value": str(total_img),
                 "status": "Logged"},
            ],
        }

    else:  # Admin
        user_count = db.query(func.count(User.id)).scalar() or 0
        device_count = db.query(func.count(MonitoringDevice.id)).scalar() or 0
        return {
            "role": "Administrator",
            "primary_focus": "System Administration & Platform Health",
            "widgets": [
                {"title": "Registered Users", "value": str(user_count), "status": "Active"},
                {"title": "Total Observations", "value": str(total_detections),
                 "status": "Logged"},
                {"title": "Monitoring Devices", "value": str(device_count),
                 "status": "Registered"},
                {"title": "Species Diversity Index", "value": f"{shannon:.2f}",
                 "status": "Shannon-Wiener"},
            ],
            "biodiversity_summary": {
                "species_richness": biodiversity.get("species_richness", 0),
                "biodiversity_index": biodiversity.get("biodiversity_index", 0),
                "biodiversity_health": biodiversity.get("biodiversity_health", "N/A"),
            },
        }
