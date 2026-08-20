"""
Conservation Recommendation Engine & Wildlife Health Scoring Engine.

Ecosystem Health Score formula (PDF spec):
  Score = 30% Species Diversity + 25% Population Stability
        + 20% Habitat Quality + 15% Endangered Status + 10% Environmental

Recommendations are generated from the computed sub-scores — each recommendation
explicitly states which score triggered it and what the threshold is, so the logic
is auditable and the output changes when the underlying data changes.
"""

from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.services.biodiversity_service import BiodiversityService
from app.models.habitat import Habitat


class ConservationService:

    @staticmethod
    def calculate_health_scores(db: Session) -> Dict[str, Any]:
        """Calculates Ecosystem Health Score using the PDF weighted model."""
        biodiversity = BiodiversityService.get_biodiversity_metrics(db)
        shannon = biodiversity.get("shannon_diversity_index", 1.85)

        # Normalize shannon index (max ~3.0 → scale 0-100)
        species_diversity_score = min(shannon / 2.5, 1.0) * 100

        # Population stability: derived from observation trend variance.
        # Currently seeded at 82.0 because no multi-year population count
        # time-series is available; replace with a real trend-slope calculation
        # once multi-year count data is present.
        # TODO: compute from year-over-year detection count slope.
        population_stability_score = 82.0

        # Habitat quality from DB (real values)
        habitats = db.query(Habitat).all()
        if habitats:
            habitat_quality_score = (
                sum(h.health_score for h in habitats) / len(habitats)
            ) * 100
        else:
            habitat_quality_score = 76.5

        # Endangered status score (higher ratio of healthy/LC species = higher score)
        endangered_count = biodiversity.get("endangered_detections", 2)
        total_obs = biodiversity.get("total_observations", 15)
        endangered_ratio = endangered_count / max(total_obs, 1)
        endangered_status_score = max(0.0, (1.0 - endangered_ratio)) * 100

        # Environmental conditions: no real sensor data yet; static baseline.
        # TODO: integrate weather/air-quality API or sensor readings.
        environmental_conditions_score = 88.0

        overall_health = round(
            (species_diversity_score * 0.30)
            + (population_stability_score * 0.25)
            + (habitat_quality_score * 0.20)
            + (endangered_status_score * 0.15)
            + (environmental_conditions_score * 0.10),
            1,
        )

        if overall_health >= 85.0:
            status, status_color = "Excellent", "emerald"
        elif overall_health >= 70.0:
            status, status_color = "Healthy", "green"
        elif overall_health >= 55.0:
            status, status_color = "Moderate Concern", "amber"
        elif overall_health >= 40.0:
            status, status_color = "Vulnerable", "orange"
        else:
            status, status_color = "Critical", "red"

        return {
            "overall_health_score": overall_health,
            "status": status,
            "status_color": status_color,
            "weights": {
                "species_diversity": {
                    "weight": "30%", "score": round(species_diversity_score, 1),
                },
                "population_stability": {
                    "weight": "25%", "score": round(population_stability_score, 1),
                },
                "habitat_quality": {
                    "weight": "20%", "score": round(habitat_quality_score, 1),
                },
                "endangered_status": {
                    "weight": "15%", "score": round(endangered_status_score, 1),
                },
                "environmental_conditions": {
                    "weight": "10%", "score": round(environmental_conditions_score, 1),
                },
            },
        }

    @staticmethod
    def get_recommendations(db: Session) -> List[Dict[str, Any]]:
        """
        Generates conservation action recommendations driven by live health scores.

        Logic: each sub-score from calculate_health_scores() is compared against
        thresholds.  Recommendations are emitted only for scores that fall below
        those thresholds — so the output changes as the underlying data changes,
        and the trigger score is included in the response for traceability.
        """
        health = ConservationService.calculate_health_scores(db)
        weights = health["weights"]
        recommendations: List[Dict[str, Any]] = []
        rec_id = 1

        diversity_score = weights["species_diversity"]["score"]
        habitat_score = weights["habitat_quality"]["score"]
        endangered_score = weights["endangered_status"]["score"]
        env_score = weights["environmental_conditions"]["score"]
        stability_score = weights["population_stability"]["score"]

        # ── 1. Low species diversity ───────────────────────────────────────────
        if diversity_score < 60:
            recommendations.append({
                "id": f"REC-{rec_id:02d}",
                "title": "Biodiversity Enhancement Survey Required",
                "category": "Biodiversity Monitoring",
                "priority": "High" if diversity_score < 40 else "Medium",
                "trigger_score": diversity_score,
                "trigger_threshold": 60,
                "trigger_component": "species_diversity",
                "impact": (
                    f"Species diversity index is below target (current score: "
                    f"{diversity_score:.1f}/100).  Expand survey coverage to under-monitored "
                    "zones to improve detection of rare species."
                ),
                "action_plan": (
                    "Deploy additional camera trap nodes in buffer zones.  "
                    "Run transect walks in under-sampled grid cells.  "
                    "Target species with zero recent detections."
                ),
            })
            rec_id += 1

        # ── 2. Low habitat quality ─────────────────────────────────────────────
        if habitat_score < 60:
            # Find worst habitats
            worst = (
                db.query(Habitat)
                .filter(Habitat.health_score < 0.6)
                .order_by(Habitat.health_score.asc())
                .first()
            )
            location = worst.location_name if worst else "Multiple sites"
            recommendations.append({
                "id": f"REC-{rec_id:02d}",
                "title": f"Habitat Restoration Priority: {location}",
                "category": "Habitat Restoration",
                "priority": "Critical" if habitat_score < 40 else "High",
                "trigger_score": habitat_score,
                "trigger_threshold": 60,
                "trigger_component": "habitat_quality",
                "impact": (
                    f"Habitat quality score is {habitat_score:.1f}/100.  "
                    f"Degraded habitat at {location} reduces carrying capacity for key species."
                ),
                "action_plan": (
                    "Conduct vegetation restoration at degraded sites.  "
                    "Reduce human-disturbance pressure (encroachment, grazing).  "
                    "Increase water-source availability monitoring."
                ),
            })
            rec_id += 1

        # ── 3. High endangered-species pressure ───────────────────────────────
        if endangered_score < 60:
            recommendations.append({
                "id": f"REC-{rec_id:02d}",
                "title": "Anti-Poaching & Endangered Species Protection",
                "category": "Wildlife Protection",
                "priority": "Critical",
                "trigger_score": endangered_score,
                "trigger_threshold": 60,
                "trigger_component": "endangered_status",
                "impact": (
                    f"Endangered species detections represent a high proportion of "
                    f"observations (score: {endangered_score:.1f}/100).  "
                    "Indicates elevated threat or population decline."
                ),
                "action_plan": (
                    "Increase ranger patrol frequency in areas with endangered sightings.  "
                    "Deploy acoustic alert tripwires near known corridors.  "
                    "Coordinate with local communities on conflict mitigation."
                ),
            })
            rec_id += 1

        # ── 4. Environmental conditions declining ─────────────────────────────
        if env_score < 70:
            recommendations.append({
                "id": f"REC-{rec_id:02d}",
                "title": "Environmental Monitoring Enhancement",
                "category": "Environmental Monitoring",
                "priority": "Medium",
                "trigger_score": env_score,
                "trigger_threshold": 70,
                "trigger_component": "environmental_conditions",
                "impact": (
                    f"Environmental conditions score is {env_score:.1f}/100.  "
                    "Degraded environmental conditions reduce habitat suitability."
                ),
                "action_plan": (
                    "Deploy water quality, air quality, and temperature sensors.  "
                    "Integrate weather API data into monitoring dashboard.  "
                    "Schedule seasonal environmental audits."
                ),
            })
            rec_id += 1

        # ── 5. Population stability below threshold ───────────────────────────
        if stability_score < 70:
            recommendations.append({
                "id": f"REC-{rec_id:02d}",
                "title": "Population Trend Investigation Required",
                "category": "Population Monitoring",
                "priority": "High",
                "trigger_score": stability_score,
                "trigger_threshold": 70,
                "trigger_component": "population_stability",
                "impact": (
                    f"Population stability score is {stability_score:.1f}/100.  "
                    "Declining detection rates may indicate true population decline."
                ),
                "action_plan": (
                    "Compare this season's counts with prior year records.  "
                    "Conduct targeted mark-recapture surveys for key species.  "
                    "Review camera trap network coverage for gaps."
                ),
            })
            rec_id += 1

        # ── Fallback: all metrics healthy ─────────────────────────────────────
        if not recommendations:
            recommendations.append({
                "id": "REC-OK",
                "title": "Ecosystem Health Status: Good",
                "category": "Status Report",
                "priority": "Informational",
                "trigger_score": health["overall_health_score"],
                "trigger_threshold": None,
                "trigger_component": "overall",
                "impact": (
                    f"All health sub-scores are above threshold.  "
                    f"Overall score: {health['overall_health_score']}/100 "
                    f"({health['status']})."
                ),
                "action_plan": (
                    "Maintain current monitoring cadence.  "
                    "Continue quarterly biodiversity surveys and habitat assessments."
                ),
            })

        return recommendations
