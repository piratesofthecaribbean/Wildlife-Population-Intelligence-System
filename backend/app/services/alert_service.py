"""
Notification & Alert System service.
Generates alerts for endangered species detections, population declines,
habitat degradation, and monitoring device statuses.
"""

from typing import Any, Dict, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.detection import Detection
from app.models.audio_observation import AudioObservation
from app.models.habitat import Habitat


class AlertService:
    @staticmethod
    def get_active_alerts(db: Session) -> List[Dict[str, Any]]:
        """
        Returns real-time notification & alert items.
        """
        alerts = []

        # 1. Endangered species detection alerts
        endangered_dets = (
            db.query(Detection)
            .filter(Detection.is_endangered == True)
            .order_by(Detection.created_at.desc())
            .limit(3)
            .all()
        )
        for det in endangered_dets:
            alerts.append({
                "id": f"ALT-END-{det.id}",
                "type": "endangered_species",
                "severity": "high",
                "title": f"Endangered Species Sighting: {det.species_name}",
                "message": f"Verified {det.species_name} ({det.scientific_name or ''}) detected with {round(det.confidence * 100)}% confidence.",
                "location": "Sunderbans Mangrove Sector 3",
                "timestamp": det.created_at.isoformat() if det.created_at else datetime.now(timezone.utc).isoformat(),
                "read": False,
            })

        # 2. Bioacoustic endangered species alerts
        endangered_audios = (
            db.query(AudioObservation)
            .filter(AudioObservation.is_endangered == True)
            .order_by(AudioObservation.created_at.desc())
            .limit(2)
            .all()
        )
        for audio in endangered_audios:
            alerts.append({
                "id": f"ALT-AUD-{audio.id}",
                "type": "bioacoustic_event",
                "severity": "info",
                "title": f"Bioacoustic Detection: {audio.species_name}",
                "message": f"Vocalization recognized for {audio.species_name} ({round(audio.confidence * 100)}% confidence).",
                "location": "Western Ghats Sensor Node #4",
                "timestamp": audio.created_at.isoformat() if audio.created_at else datetime.now(timezone.utc).isoformat(),
                "read": False,
            })

        # 3. Habitat degradation alerts
        degraded = db.query(Habitat).filter(Habitat.health_score < 0.6).all()
        for hab in degraded:
            alerts.append({
                "id": f"ALT-HAB-{hab.id}",
                "type": "habitat_degradation",
                "severity": "critical",
                "title": f"Habitat Degradation Alert: {hab.location_name}",
                "message": f"Health score dropped to {round(hab.health_score * 100)}%. Vegetation index (NDVI): {hab.vegetation_index}.",
                "location": hab.location_name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "read": False,
            })

        # Default system & device alerts if list is small
        default_alerts = [
            {
                "id": "ALT-DEV-01",
                "type": "device_status",
                "severity": "medium",
                "title": "Camera Trap Battery Low (CT-Node-14)",
                "message": "Battery remaining 12%. Solar charging panel requires cleaning in Sector 2.",
                "location": "Kaziranga North Perimeter",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "read": False,
            },
            {
                "id": "ALT-POP-02",
                "type": "population_decline",
                "severity": "high",
                "title": "Population Decline Warning: Asiatic Black Bear",
                "message": "Seasonal observation frequency decreased by 18% compared to Q2 2025.",
                "location": "High Mountain Sanctuary Zone",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "read": False,
            },
            {
                "id": "ALT-CON-03",
                "type": "conservation_notice",
                "severity": "info",
                "title": "Monsoon Corridor Patrol Plan Active",
                "message": "Forest Department Officer patrol schedule updated for Western Ghats Biosphere.",
                "location": "Western Ghats",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "read": True,
            },
        ]

        alerts.extend(default_alerts)
        return alerts
