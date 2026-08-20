from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class BiodiversityMetrics(BaseModel):
    total_observations: int
    species_richness: int
    shannon_diversity_index: float
    simpson_diversity_index: float
    biodiversity_index: float
    biodiversity_health: str
    endangered_detections: int
    species_distribution: List[Dict[str, Any]]
    image_observations: int
    audio_observations: int


class ObservationHistoryItem(BaseModel):
    id: int
    source_type: str
    species_name: str
    scientific_name: Optional[str] = None
    confidence: float
    conservation_status: Optional[str] = None
    is_endangered: Optional[bool] = False
    survey_id: Optional[int] = None
    created_at: Optional[str] = None
    media_path: Optional[str] = None
