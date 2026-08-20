import json
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.audio_observation import AudioObservation
from app.schemas.audio import AudioObservationResponse
from app.services.bioacoustic_service import BioacousticService
from app.services.auth_service import get_current_user
from app.models.user import User
from app.services.alert_worker import AlertWorker

router = APIRouter(prefix="/audio", tags=["Bioacoustic Recognition"])


def _format_audio(obs: AudioObservation) -> dict:
    quality = json.loads(obs.acoustic_quality_json) if obs.acoustic_quality_json else None
    events = json.loads(obs.events_json) if obs.events_json else []
    taxonomy = json.loads(obs.taxonomy_json) if obs.taxonomy_json else None
    return {
        "id": obs.id,
        "species_name": obs.species_name,
        "scientific_name": obs.scientific_name,
        "confidence": obs.confidence,
        "audio_path": obs.audio_path,
        "duration_seconds": obs.duration_seconds,
        "detection_type": obs.detection_type,
        "model_used": obs.model_used,
        "acoustic_quality": quality,
        "events": events,
        "conservation_status": obs.conservation_status,
        "is_endangered": obs.is_endangered,
        "taxonomy": taxonomy,
        "survey_id": obs.survey_id,
        "user_id": obs.user_id,
        "created_at": obs.created_at,
    }


@router.get("")
def get_audio_observations(db: Session = Depends(get_db)):
    observations = db.query(AudioObservation).order_by(
        AudioObservation.created_at.desc()
    ).all()
    return [_format_audio(o) for o in observations]


@router.get("/history")
def get_audio_history(db: Session = Depends(get_db)):
    """Return recent acoustic observation history for the AudioAnalysis page."""
    observations = db.query(AudioObservation).order_by(
        AudioObservation.created_at.desc()
    ).limit(50).all()
    return [_format_audio(o) for o in observations]


@router.post("/analyze")
def analyze_audio(
    file: UploadFile = File(...),
    survey_id: Optional[int] = Form(None),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run the BirdNET → YAMNet bioacoustic recognition pipeline."""
    try:
        result = BioacousticService.analyze_audio(file)

        db_obs = AudioObservation(
            species_name=result["species_name"],
            scientific_name=result.get("scientific_name"),
            confidence=result["confidence"],
            audio_path=result["audio_path"],
            duration_seconds=result.get("duration_seconds"),
            detection_type=result.get("detection_type"),
            model_used=result.get("model_used"),
            acoustic_quality_json=json.dumps(result.get("acoustic_quality", {})),
            events_json=json.dumps(result.get("events", [])),
            conservation_status=result.get("conservation_status"),
            is_endangered=result.get("is_endangered", False),
            taxonomy_json=json.dumps(result.get("taxonomy", {})),
            survey_id=survey_id,
            user_id=current_user.id,
        )
        db.add(db_obs)
        db.commit()
        db.refresh(db_obs)

        response = _format_audio(db_obs)
        response["waveform"] = result.get("waveform", [])
        response["spectrogram"] = result.get("spectrogram", [])

        if background_tasks:
            background_tasks.add_task(AlertWorker.run_worker_task)

        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bioacoustic analysis failed: {str(e)}",
        )
