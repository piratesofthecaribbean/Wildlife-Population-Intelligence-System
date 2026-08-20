"""
Survey Router
=============
CRUD endpoints for wildlife field surveys.
Create/Update/Delete require an authenticated user (any valid role).
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.survey import Survey
from app.schemas.survey import SurveyCreate, SurveyResponse
from app.services.auth_service import get_current_user
from app.services.rbac import require_role

router = APIRouter(prefix="/surveys", tags=["Surveys"])

DEFAULT_SURVEYS = [
    {
        "title": "Sunderbans Tiger Survey 2026",
        "description": "Camera trapping survey to estimate population density of Bengal tigers.",
        "location_name": "Sunderbans Mangrove Forest",
        "start_date": datetime.now() - timedelta(days=30),
        "end_date": datetime.now() + timedelta(days=60),
    },
    {
        "title": "Western Ghats Elephant Census",
        "description": "Line transect and dung count survey to estimate elephant population.",
        "location_name": "Western Ghats Biosphere Reserve",
        "start_date": datetime.now() - timedelta(days=15),
        "end_date": datetime.now() + timedelta(days=45),
    },
    {
        "title": "Kaziranga Rhino Monitoring",
        "description": "Habitat mapping and direct counting of Indian Rhinos.",
        "location_name": "Kaziranga National Park",
        "start_date": datetime.now() - timedelta(days=60),
        "end_date": datetime.now() - timedelta(days=10),
    },
]


@router.get("", response_model=List[SurveyResponse])
def get_surveys(db: Session = Depends(get_db)):
    surveys = db.query(Survey).all()
    if not surveys:
        for surv_data in DEFAULT_SURVEYS:
            db.add(Survey(**surv_data))
        db.commit()
        surveys = db.query(Survey).all()
    return surveys


@router.post("", response_model=SurveyResponse, status_code=status.HTTP_201_CREATED)
def create_survey(
    survey_in: SurveyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(
            "Administrator",
            "Forest Department Officer",
            "Conservation Officer",
            "Wildlife Researcher",
        )
    ),
):
    """Create a new survey. Requires any authenticated officer/researcher/admin role."""
    db_surv = Survey(**survey_in.model_dump())
    db.add(db_surv)
    db.commit()
    db.refresh(db_surv)
    return db_surv


@router.put("/{survey_id}", response_model=SurveyResponse)
def update_survey(
    survey_id: int,
    survey_in: SurveyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(
            "Administrator",
            "Forest Department Officer",
            "Conservation Officer",
            "Wildlife Researcher",
        )
    ),
):
    """Update an existing survey. Requires any authenticated officer/researcher/admin role."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found"
        )
    for field, value in survey_in.model_dump(exclude_unset=True).items():
        setattr(survey, field, value)
    db.commit()
    db.refresh(survey)
    return survey


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("Administrator", "Forest Department Officer")
    ),
):
    """Delete a survey. Requires Administrator or Forest Department Officer role."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found"
        )
    db.delete(survey)
    db.commit()
