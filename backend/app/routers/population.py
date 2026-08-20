"""
Population Router
=================
Endpoints for population intelligence: estimates, trends, and migration corridors.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.database import get_db
from app.services.population_service import PopulationService

router = APIRouter(prefix="/population", tags=["Population Intelligence Engine"])


@router.get("/estimates")
def get_population_estimates(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Population counts, density estimates, growth rates, and trends per species."""
    return PopulationService.get_population_estimates(db)


# Alias: frontend calls /population/estimate (singular)
@router.get("/estimate")
def get_population_estimate_alias(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Alias for /estimates — returns species metrics list for the census table."""
    data = PopulationService.get_population_estimates(db)
    # Transform to match what PopulationIntelligence.jsx expects in the table
    return [
        {
            "species_name": m["species_name"],
            "estimated_population": m["population_size"],
            "density_per_sq_km": m["density_per_sq_km"],
            "annual_growth_rate": f"+{m['growth_rate_pct']}%",
            "conservation_status": _derive_status(m["species_name"]),
        }
        for m in data.get("species_metrics", [])
    ]


@router.get("/trends")
def get_population_trends(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Multi-year species population growth trends with historical census data."""
    return PopulationService.get_population_trends(db)


@router.get("/migration")
def get_migration_corridors(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Wildlife movement patterns and migration corridors."""
    return PopulationService.get_migration_analytics(db)


@router.get("/species-distribution")
def get_species_distribution(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Species count distribution for charting."""
    data = PopulationService.get_population_estimates(db)
    return data.get("population_distribution", [])


# ---- Helpers ----
_IUCN_STATUS = {
    "Bengal Tiger": "EN",
    "Indian Elephant": "EN",
    "Asian Elephant": "EN",
    "Snow Leopard": "VU",
    "Indian Rhinoceros": "VU",
    "Asiatic Black Bear": "VU",
    "Spotted Deer": "LC",
    "Indian Peafowl": "LC",
    "Indian Leopard": "VU",
}


def _derive_status(species_name: str) -> str:
    return _IUCN_STATUS.get(species_name, "LC")
