from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any, Dict, List, Optional

class DetectionBase(BaseModel):
    species_name: str
    confidence: float
    image_path: str
    bbox_json: Optional[str] = None
    survey_id: Optional[int] = None
    user_id: Optional[int] = None

class DetectionCreate(DetectionBase):
    pass

class DetectionResponse(DetectionBase):
    id: int
    scientific_name: Optional[str] = None
    animal_count: Optional[int] = 1
    image_quality: Optional[Dict[str, Any]] = None
    conservation_status: Optional[str] = None
    is_endangered: Optional[bool] = False
    taxonomy: Optional[Dict[str, Any]] = None
    detections: Optional[List[Dict[str, Any]]] = None
    model_used: Optional[str] = "YOLO11"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
