from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.species import Species
from app.schemas.species import SpeciesCreate, SpeciesResponse
from app.services.auth_service import get_current_user
from app.services.rbac import require_role
from app.services.species_identification_service import SpeciesIdentificationService

router = APIRouter(prefix="/species", tags=["Species"])

DEFAULT_SPECIES = [
    {"name": "Bengal Tiger", "scientific_name": "Panthera tigris tigris", "conservation_status": "EN",
     "taxonomic_class": "Mammalia", "taxonomic_order": "Carnivora", "family": "Felidae",
     "diet": "Carnivore", "habitat": "Tropical forests, mangroves",
     "description": "Endangered tiger subspecies native to the Indian subcontinent."},
    {"name": "Indian Elephant", "scientific_name": "Elephas maximus indicus", "conservation_status": "EN",
     "taxonomic_class": "Mammalia", "taxonomic_order": "Proboscidea", "family": "Elephantidae",
     "diet": "Herbivore", "habitat": "Forests, grasslands, wetlands",
     "description": "Large herbivore native to mainland Asia, facing habitat loss."},
    {"name": "Spotted Deer", "scientific_name": "Axis axis", "conservation_status": "LC",
     "taxonomic_class": "Mammalia", "taxonomic_order": "Artiodactyla", "family": "Cervidae",
     "diet": "Herbivore", "habitat": "Deciduous forests, grasslands",
     "description": "Also known as Chital deer, common prey species in Indian forests."},
    {"name": "Snow Leopard", "scientific_name": "Panthera uncia", "conservation_status": "VU",
     "taxonomic_class": "Mammalia", "taxonomic_order": "Carnivora", "family": "Felidae",
     "diet": "Carnivore", "habitat": "Alpine and subalpine zones",
     "description": "Vulnerable large cat native to mountain ranges of Central/South Asia."},
    {"name": "Asiatic Black Bear", "scientific_name": "Ursus thibetanus", "conservation_status": "VU",
     "taxonomic_class": "Mammalia", "taxonomic_order": "Carnivora", "family": "Ursidae",
     "diet": "Omnivore", "habitat": "Montane forests",
     "description": "Vulnerable medium-sized bear species, native to Asia."},
]

@router.get("", response_model=List[SpeciesResponse])
def get_species(db: Session = Depends(get_db)):
    species_list = db.query(Species).all()
    if not species_list:
        for spec_data in DEFAULT_SPECIES:
            db.add(Species(**spec_data))
        db.commit()
        species_list = db.query(Species).all()
    return species_list

@router.get("/catalog")
def get_species_catalog():
    """Curated species profiles from the identification engine."""
    return SpeciesIdentificationService.get_species_profiles()

@router.get("/identify/{label}")
def identify_species(label: str, confidence: float = 0.85):
    """Taxonomic classification and endangered species detection for a label."""
    return SpeciesIdentificationService.identify(label, confidence)

@router.post("", response_model=SpeciesResponse, status_code=status.HTTP_201_CREATED)
def create_species(
    species_in: SpeciesCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrator", "Wildlife Researcher", "Conservation Officer"))
):
    existing = db.query(Species).filter(Species.name == species_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Species already exists"
        )
    db_spec = Species(**species_in.model_dump())
    db.add(db_spec)
    db.commit()
    db.refresh(db_spec)
    return db_spec
