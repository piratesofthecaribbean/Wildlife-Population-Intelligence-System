"""
Habitat Intelligence Engine
===========================
Provides habitat classification and suitability scoring derived from
stored habitat metrics (vegetation_index, water_availability, human_disturbance).

NDVI Analysis status
--------------------
# NOT_IMPLEMENTED: Satellite/drone imagery NDVI pipeline is not yet available.
# To implement: integrate a GeoTIFF or satellite API data source, compute NDVI
# per pixel (NIR - Red) / (NIR + Red), then pass the raster mean as
# vegetation_index.  Until then this engine works from the hand-entered
# vegetation_index field stored in the Habitat table.
"""

from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.models.habitat import Habitat


# ---------------------------------------------------------------------------
# Rule-based habitat classification thresholds
# Derived from published NDVI class ranges (Tucker 1979; Sellers 1985).
# ---------------------------------------------------------------------------
HABITAT_CLASSES = [
    # (label, min_veg, max_veg, max_disturbance)
    ("Dense Forest",    0.70, 1.01, 0.30),
    ("Grassland",       0.40, 0.70, 0.50),
    ("Wetland",         0.50, 1.01, 0.20),  # high vegetation + low disturbance & high water
    ("Scrubland",       0.20, 0.50, 0.70),
    ("Degraded Land",  -1.01, 0.20, 1.01),
]


class HabitatIntelligenceService:

    @staticmethod
    def classify_habitat(
        vegetation_index: float,
        water_availability: float,
        human_disturbance: float,
    ) -> str:
        """
        Rule-based habitat type classification.

        Classification hierarchy (checked in order):
          Dense Forest  → high NDVI, low disturbance
          Wetland       → moderate-high NDVI, high water, low disturbance
          Grassland     → moderate NDVI
          Scrubland     → low-moderate NDVI
          Degraded Land → very low NDVI / bare soil
        """
        # Wetland is special: requires high water_availability
        if vegetation_index >= 0.50 and water_availability >= 0.75 and human_disturbance <= 0.25:
            return "Wetland"
        if vegetation_index >= 0.70 and human_disturbance <= 0.30:
            return "Dense Forest"
        if 0.40 <= vegetation_index < 0.70:
            return "Grassland"
        if 0.20 <= vegetation_index < 0.40:
            return "Scrubland"
        return "Degraded Land"

    @staticmethod
    def compute_suitability_score(
        vegetation_index: float,
        water_availability: float,
        human_disturbance: float,
    ) -> float:
        """
        Weighted habitat suitability score (0–100).

        Formula:
            suitability = (0.40 * vegetation) + (0.30 * water) - (0.30 * disturbance)
        Normalised to [0, 100] with floor at 0.

        This is a simplified additive model.  A full MaxEnt or Species Distribution
        Model would require species-specific weights per habitat feature.
        # SIMPLIFIED_ALGORITHM: weighted linear suitability index
        """
        raw = (0.40 * vegetation_index) + (0.30 * water_availability) - (0.30 * human_disturbance)
        score = max(0.0, min(raw, 1.0)) * 100
        return round(score, 1)

    @staticmethod
    def analyse_habitat(habitat: Habitat) -> Dict[str, Any]:
        """Return full intelligence profile for a single Habitat record."""
        habitat_class = HabitatIntelligenceService.classify_habitat(
            habitat.vegetation_index,
            habitat.water_availability,
            habitat.human_disturbance,
        )
        suitability = HabitatIntelligenceService.compute_suitability_score(
            habitat.vegetation_index,
            habitat.water_availability,
            habitat.human_disturbance,
        )

        # Threat level derived from human_disturbance
        if habitat.human_disturbance >= 0.60:
            threat_level = "Critical"
        elif habitat.human_disturbance >= 0.40:
            threat_level = "High"
        elif habitat.human_disturbance >= 0.20:
            threat_level = "Moderate"
        else:
            threat_level = "Low"

        # Restoration priority
        if suitability < 40:
            restoration_priority = "Urgent"
        elif suitability < 60:
            restoration_priority = "High"
        elif suitability < 75:
            restoration_priority = "Medium"
        else:
            restoration_priority = "Low"

        return {
            "habitat_id": habitat.id,
            "location_name": habitat.location_name,
            "habitat_classification": habitat_class,
            "suitability_score": suitability,
            "suitability_label": (
                "Excellent" if suitability >= 75 else
                "Good" if suitability >= 55 else
                "Fair" if suitability >= 35 else
                "Poor"
            ),
            "threat_level": threat_level,
            "restoration_priority": restoration_priority,
            "metrics": {
                "vegetation_index": round(habitat.vegetation_index, 3),
                "water_availability": round(habitat.water_availability, 3),
                "human_disturbance": round(habitat.human_disturbance, 3),
                "health_score": round(habitat.health_score, 3),
            },
            "ndvi_analysis": {
                "status": "NOT_IMPLEMENTED",
                "note": (
                    "NDVI raster analysis requires a satellite/drone imagery pipeline "
                    "(GeoTIFF or satellite API).  The vegetation_index field currently "
                    "stores a hand-entered proxy value.  Integrate a remote-sensing data "
                    "source and compute NDVI = (NIR - Red) / (NIR + Red) per pixel to "
                    "enable this feature."
                ),
            },
        }

    @staticmethod
    def analyse_all(db: Session) -> List[Dict[str, Any]]:
        """Run intelligence analysis across all stored habitats."""
        habitats = db.query(Habitat).all()
        return [HabitatIntelligenceService.analyse_habitat(h) for h in habitats]
