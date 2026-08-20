from pydantic import BaseModel, ConfigDict
from datetime import datetime

class HabitatBase(BaseModel):
    location_name: str
    vegetation_index: float
    water_availability: float
    human_disturbance: float
    health_score: float

class HabitatCreate(HabitatBase):
    pass

class HabitatResponse(HabitatBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
