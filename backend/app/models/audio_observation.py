from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database import Base


class AudioObservation(Base):
    __tablename__ = "audio_observations"

    id = Column(Integer, primary_key=True, index=True)
    species_name = Column(String, index=True, nullable=False)
    scientific_name = Column(String, nullable=True)
    confidence = Column(Float, nullable=False)
    audio_path = Column(String, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    detection_type = Column(String, nullable=True)  # bird, mammal, amphibian, insect
    model_used = Column(String, nullable=True)      # BirdNET, YAMNet
    acoustic_quality_json = Column(Text, nullable=True)
    events_json = Column(Text, nullable=True)
    conservation_status = Column(String, nullable=True)
    is_endangered = Column(Boolean, default=False)
    taxonomy_json = Column(Text, nullable=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
