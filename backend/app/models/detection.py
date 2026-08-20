from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    species_name = Column(String, index=True, nullable=False)
    scientific_name = Column(String, nullable=True)
    confidence = Column(Float, nullable=False)
    image_path = Column(String, nullable=False)
    bbox_json = Column(Text, nullable=True)
    animal_count = Column(Integer, default=1)
    image_quality_json = Column(Text, nullable=True)
    conservation_status = Column(String, nullable=True)
    is_endangered = Column(Boolean, default=False)
    taxonomy_json = Column(Text, nullable=True)
    source_type = Column(String, default="image")
    model_used = Column(String, default="YOLO11")
    # --- Spatial / habitat observation fields (spec'd, nullable for existing records) ---
    latitude = Column(Float, nullable=True)          # GPS latitude of observation
    longitude = Column(Float, nullable=True)         # GPS longitude of observation
    habitat_type = Column(String, nullable=True)     # e.g. Forest, Grassland, Wetland
    protected_area = Column(String, nullable=True)   # e.g. Kaziranga National Park
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
