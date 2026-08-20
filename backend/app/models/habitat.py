from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Habitat(Base):
    __tablename__ = "habitats"

    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String, index=True, nullable=False)
    vegetation_index = Column(Float, nullable=False)     # e.g., NDVI score between -1 and 1
    water_availability = Column(Float, nullable=False)   # e.g., index between 0 and 1
    human_disturbance = Column(Float, nullable=False)    # e.g., index between 0 and 1
    health_score = Column(Float, nullable=False)         # e.g., computed index between 0 and 1
    created_at = Column(DateTime(timezone=True), server_default=func.now())
