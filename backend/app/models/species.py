from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    scientific_name = Column(String, nullable=False)
    conservation_status = Column(String, nullable=False)
    taxonomic_class = Column(String, nullable=True)
    taxonomic_order = Column(String, nullable=True)
    family = Column(String, nullable=True)
    diet = Column(String, nullable=True)
    habitat = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
