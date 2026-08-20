from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.habitat import Habitat
from app.schemas.habitat import HabitatCreate, HabitatResponse
from app.services.auth_service import get_current_user
from app.services.rbac import require_role

router = APIRouter(prefix="/habitat", tags=["Habitat Monitoring"])

DEFAULT_HABITATS = [
    {"location_name": "Sunderbans Mangrove Forest", "vegetation_index": 0.72, "water_availability": 0.85, "human_disturbance": 0.15, "health_score": 0.81},
    {"location_name": "Western Ghats", "vegetation_index": 0.84, "water_availability": 0.90, "human_disturbance": 0.28, "health_score": 0.82},
    {"location_name": "Kaziranga Grasslands", "vegetation_index": 0.68, "water_availability": 0.75, "human_disturbance": 0.20, "health_score": 0.74},
    {"location_name": "Sariska Scrublands", "vegetation_index": 0.42, "water_availability": 0.38, "human_disturbance": 0.45, "health_score": 0.45}
]

@router.get("", response_model=List[HabitatResponse])
def get_habitats(db: Session = Depends(get_db)):
    habitats = db.query(Habitat).all()
    if not habitats:
        for hab_data in DEFAULT_HABITATS:
            db_hab = Habitat(**hab_data)
            db.add(db_hab)
        db.commit()
        habitats = db.query(Habitat).all()
    return habitats

@router.post("", response_model=HabitatResponse, status_code=status.HTTP_201_CREATED)
def create_habitat(
    habitat_in: HabitatCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrator", "Conservation Officer", "Forest Department Officer", "Wildlife Researcher"))
):
    db_hab = Habitat(**habitat_in.model_dump())
    db.add(db_hab)
    db.commit()
    db.refresh(db_hab)
    return db_hab
