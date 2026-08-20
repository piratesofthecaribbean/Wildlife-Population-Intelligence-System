from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class SpeciesBase(BaseModel):
    name: str
    scientific_name: str
    conservation_status: str
    taxonomic_class: Optional[str] = None
    taxonomic_order: Optional[str] = None
    family: Optional[str] = None
    diet: Optional[str] = None
    habitat: Optional[str] = None
    description: Optional[str] = None

class SpeciesCreate(SpeciesBase):
    pass

class SpeciesResponse(SpeciesBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
