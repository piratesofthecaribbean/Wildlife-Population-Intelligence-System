import json
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.detection import Detection
from app.schemas.detection import DetectionResponse
from app.services.detection_service import DetectionService
from app.services.auth_service import get_current_user
from app.models.user import User
from app.services.alert_worker import AlertWorker

router = APIRouter(prefix="/detections", tags=["Detections"])

DEFAULT_DETECTIONS = [
    {
        "species_name": "Bengal Tiger", "scientific_name": "Panthera tigris tigris",
        "confidence": 0.95, "image_path": "/uploads/tiger_sample.jpg",
        "bbox_json": '[{"label": "Bengal Tiger", "confidence": 0.95, "box": [0.12, 0.18, 0.88, 0.82]}]',
        "animal_count": 1, "conservation_status": "EN", "is_endangered": True,
        "model_used": "YOLO11", "survey_id": 1, "user_id": 1,
    },
    {
        "species_name": "Spotted Deer", "scientific_name": "Axis axis",
        "confidence": 0.88, "image_path": "/uploads/deer_sample.jpg",
        "bbox_json": '[{"label": "Spotted Deer", "confidence": 0.88, "box": [0.25, 0.3, 0.65, 0.75]}]',
        "animal_count": 2, "conservation_status": "LC", "is_endangered": False,
        "model_used": "YOLO11", "survey_id": 1, "user_id": 1,
    },
    {
        "species_name": "Indian Elephant", "scientific_name": "Elephas maximus indicus",
        "confidence": 0.91, "image_path": "/uploads/elephant_sample.jpg",
        "bbox_json": '[{"label": "Indian Elephant", "confidence": 0.91, "box": [0.15, 0.1, 0.85, 0.9]}]',
        "animal_count": 1, "conservation_status": "EN", "is_endangered": True,
        "model_used": "YOLO11", "survey_id": 2, "user_id": 1,
    },
]


def _format_detection(det: Detection) -> dict:
    quality = json.loads(det.image_quality_json) if det.image_quality_json else None
    taxonomy = json.loads(det.taxonomy_json) if det.taxonomy_json else None
    detections = json.loads(det.bbox_json) if det.bbox_json else []
    return {
        "id": det.id,
        "species_name": det.species_name,
        "scientific_name": det.scientific_name,
        "confidence": det.confidence,
        "image_path": det.image_path,
        "bbox_json": det.bbox_json,
        "animal_count": det.animal_count,
        "image_quality": quality,
        "conservation_status": det.conservation_status,
        "is_endangered": det.is_endangered,
        "taxonomy": taxonomy,
        "detections": detections,
        "model_used": det.model_used,
        "survey_id": det.survey_id,
        "user_id": det.user_id,
        # GPS / habitat observation fields (spec-required)
        "latitude": det.latitude,
        "longitude": det.longitude,
        "habitat_type": det.habitat_type,
        "protected_area": det.protected_area,
        "created_at": det.created_at,
    }


@router.get("")
def get_detections(db: Session = Depends(get_db)):
    detections = db.query(Detection).all()
    if not detections:
        for det_data in DEFAULT_DETECTIONS:
            db.add(Detection(**det_data))
        db.commit()
        detections = db.query(Detection).all()
    return [_format_detection(d) for d in detections]


@router.post("/upload")
def upload_detection(
    file: UploadFile = File(...),
    survey_id: Optional[int] = Form(None),
    # GPS / observation context fields (spec-required)
    latitude: Optional[float] = Form(None, description="GPS latitude of observation"),
    longitude: Optional[float] = Form(None, description="GPS longitude of observation"),
    habitat_type: Optional[str] = Form(None, description="e.g. Forest, Grassland, Wetland"),
    protected_area: Optional[str] = Form(None, description="e.g. Kaziranga National Park"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an image for species detection.

    Optional form fields for observation context:
    - latitude / longitude: GPS coordinates of the camera trap / observation point.
    - habitat_type: Classified habitat at the observation point.
    - protected_area: Name of the protected area or reserve.

    All four fields are stored in the Detection record and used for
    migration corridor analysis and habitat intelligence.
    """
    try:
        result = DetectionService.detect_species(file)
        db_fields = DetectionService.build_db_fields(result)
        db_fields["survey_id"] = survey_id
        db_fields["user_id"] = current_user.id
        # GPS / habitat context
        db_fields["latitude"] = latitude
        db_fields["longitude"] = longitude
        db_fields["habitat_type"] = habitat_type
        db_fields["protected_area"] = protected_area

        db_det = Detection(**db_fields)
        db.add(db_det)
        db.commit()
        db.refresh(db_det)

        response = _format_detection(db_det)
        # Surface model and verification info from the AI engine
        response["is_verified_species"] = result.get("is_verified_species", False)
        response["model"] = result.get("model", "YOLO11")
        response["model_note"] = result.get("model_note")

        if background_tasks:
            background_tasks.add_task(AlertWorker.run_worker_task)

        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and save detection: {str(e)}",
        )
