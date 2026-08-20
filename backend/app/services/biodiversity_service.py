"""
Biodiversity Analytics Engine — diversity indices, observation history, trend analysis.
"""

import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.audio_observation import AudioObservation
from app.models.detection import Detection


class BiodiversityService:
    @staticmethod
    def _shannon_index(counts: Dict[str, int]) -> float:
        total = sum(counts.values())
        if total == 0:
            return 0.0
        return round(-sum(
            (n / total) * math.log(n / total)
            for n in counts.values() if n > 0
        ), 4)

    @staticmethod
    def _simpson_index(counts: Dict[str, int]) -> float:
        total = sum(counts.values())
        if total == 0:
            return 0.0
        return round(1.0 - sum((n / total) ** 2 for n in counts.values()), 4)

    @staticmethod
    def _species_richness(counts: Dict[str, int]) -> int:
        return len(counts)

    @staticmethod
    def get_observation_history(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """Combined image + audio observation history."""
        image_obs = db.query(Detection).order_by(Detection.created_at.desc()).limit(limit).all()
        audio_obs = db.query(AudioObservation).order_by(AudioObservation.created_at.desc()).limit(limit).all()

        history = []
        for det in image_obs:
            history.append({
                "id": det.id,
                "source_type": "image",
                "species_name": det.species_name,
                "scientific_name": det.scientific_name,
                "confidence": det.confidence,
                "conservation_status": det.conservation_status,
                "is_endangered": det.is_endangered,
                "survey_id": det.survey_id,
                "created_at": det.created_at.isoformat() if det.created_at else None,
                "media_path": det.image_path,
                "animal_count": det.animal_count,
            })
        for aud in audio_obs:
            history.append({
                "id": aud.id,
                "source_type": "audio",
                "species_name": aud.species_name,
                "scientific_name": aud.scientific_name,
                "confidence": aud.confidence,
                "conservation_status": aud.conservation_status,
                "is_endangered": aud.is_endangered,
                "survey_id": aud.survey_id,
                "created_at": aud.created_at.isoformat() if aud.created_at else None,
                "media_path": aud.audio_path,
                "detection_type": aud.detection_type,
            })

        history.sort(key=lambda x: x["created_at"] or "", reverse=True)
        return history[:limit]

    @staticmethod
    def get_biodiversity_metrics(db: Session) -> Dict[str, Any]:
        """Calculate biodiversity indices from all observations."""
        detections = db.query(Detection).all()
        audio = db.query(AudioObservation).all()

        species_counts: Counter = Counter()
        endangered_count = 0
        total_observations = len(detections) + len(audio)

        for det in detections:
            species_counts[det.species_name] += det.animal_count or 1
            if det.is_endangered:
                endangered_count += 1

        for aud in audio:
            species_counts[aud.species_name] += 1
            if aud.is_endangered:
                endangered_count += 1

        counts_dict = dict(species_counts)
        shannon = BiodiversityService._shannon_index(counts_dict)
        simpson = BiodiversityService._simpson_index(counts_dict)
        richness = BiodiversityService._species_richness(counts_dict)

        # Biodiversity index (0-100 scale)
        max_shannon = math.log(max(richness, 1))
        biodiversity_index = round((shannon / max_shannon * 100) if max_shannon > 0 else 0, 1)

        if biodiversity_index >= 75:
            health_label = "Excellent"
        elif biodiversity_index >= 55:
            health_label = "Healthy"
        elif biodiversity_index >= 35:
            health_label = "Moderate Concern"
        elif biodiversity_index >= 20:
            health_label = "Vulnerable"
        else:
            health_label = "Critical"

        return {
            "total_observations": total_observations,
            "species_richness": richness,
            "shannon_diversity_index": shannon,
            "simpson_diversity_index": simpson,
            "biodiversity_index": biodiversity_index,
            "biodiversity_health": health_label,
            "endangered_detections": endangered_count,
            "species_distribution": [
                {"species": name, "count": count}
                for name, count in species_counts.most_common()
            ],
            "image_observations": len(detections),
            "audio_observations": len(audio),
        }

    @staticmethod
    def get_prediction_history(db: Session, limit: int = 30) -> List[Dict[str, Any]]:
        """Recent AI prediction history across image and audio."""
        history = BiodiversityService.get_observation_history(db, limit=limit)
        return [
            {
                "id": obs["id"],
                "source_type": obs["source_type"],
                "species_name": obs["species_name"],
                "confidence": obs["confidence"],
                "model": "YOLO11" if obs["source_type"] == "image" else "BirdNET/YAMNet",
                "created_at": obs["created_at"],
            }
            for obs in history
        ]

    @staticmethod
    def get_monthly_trends(db: Session) -> List[Dict[str, Any]]:
        """Monthly observation counts for charting."""
        now = datetime.now(timezone.utc)
        months = []
        for i in range(5, -1, -1):
            month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            label = month_start.strftime("%b %Y")
            months.append({"month": label, "image": 0, "audio": 0, "total": 0})

        for det in db.query(Detection).all():
            if det.created_at:
                label = det.created_at.strftime("%b %Y")
                for m in months:
                    if m["month"] == label:
                        m["image"] += 1
                        m["total"] += 1

        for aud in db.query(AudioObservation).all():
            if aud.created_at:
                label = aud.created_at.strftime("%b %Y")
                for m in months:
                    if m["month"] == label:
                        m["audio"] += 1
                        m["total"] += 1

        return months
