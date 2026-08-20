from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any, Dict, List, Optional


class AudioObservationResponse(BaseModel):
    id: int
    species_name: str
    scientific_name: Optional[str] = None
    confidence: float
    audio_path: str
    duration_seconds: Optional[float] = None
    detection_type: Optional[str] = None
    model_used: Optional[str] = None
    acoustic_quality: Optional[Dict[str, Any]] = None
    events: Optional[List[Dict[str, Any]]] = None
    waveform: Optional[List[Dict[str, float]]] = None
    spectrogram: Optional[List[Dict[str, Any]]] = None
    conservation_status: Optional[str] = None
    is_endangered: Optional[bool] = False
    taxonomy: Optional[Dict[str, Any]] = None
    survey_id: Optional[int] = None
    user_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
