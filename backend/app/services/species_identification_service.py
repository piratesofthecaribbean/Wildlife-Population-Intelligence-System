"""
Species Identification Engine — taxonomic classification and endangered species detection.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.data.species_catalog import ENDANGERED_STATUSES, enrich_detection, list_catalog_species, lookup_species
from app.models.species import Species


class SpeciesIdentificationService:
    @staticmethod
    def identify(label: str, confidence: float) -> Dict[str, Any]:
        """Classify a detection label with full taxonomic profile."""
        result = enrich_detection(label, confidence)
        result["endangered_alert"] = result.get("is_endangered", False)
        if result.get("requires_verification"):
            result["verification_status"] = "pending"
        else:
            result["verification_status"] = "confirmed"
        return result

    @staticmethod
    def get_species_profiles() -> List[Dict[str, Any]]:
        """Return curated species profiles from the catalog."""
        return list_catalog_species()

    @staticmethod
    def sync_catalog_to_db(db: Session) -> int:
        """Ensure catalog species exist in the database."""
        profiles = list_catalog_species()
        added = 0
        for profile in profiles:
            existing = db.query(Species).filter(
                Species.scientific_name == profile["scientific_name"]
            ).first()
            if existing:
                continue
            db.add(Species(
                name=profile["common_name"],
                scientific_name=profile["scientific_name"],
                conservation_status=profile["conservation_status"],
                taxonomic_class=profile.get("taxonomic_class"),
                taxonomic_order=profile.get("taxonomic_order"),
                family=profile.get("family"),
                diet=profile.get("diet"),
                habitat=profile.get("habitat"),
                description=f"{profile['common_name']} — {profile.get('iucn_label', '')}",
            ))
            added += 1
        if added:
            db.commit()
        return added

    @staticmethod
    def get_endangered_species(db: Session) -> List[Dict[str, Any]]:
        """List all endangered/vulnerable species from DB and catalog."""
        db_species = db.query(Species).filter(
            Species.conservation_status.in_(list(ENDANGERED_STATUSES))
        ).all()

        results = []
        for sp in db_species:
            results.append({
                "id": sp.id,
                "name": sp.name,
                "scientific_name": sp.scientific_name,
                "conservation_status": sp.conservation_status,
                "taxonomic_class": sp.taxonomic_class,
                "habitat": sp.habitat,
            })

        # Include catalog entries not yet in DB
        seen = {r["scientific_name"] for r in results}
        for profile in list_catalog_species():
            if profile["conservation_status"] in ENDANGERED_STATUSES and profile["scientific_name"] not in seen:
                results.append({
                    "id": None,
                    "name": profile["common_name"],
                    "scientific_name": profile["scientific_name"],
                    "conservation_status": profile["conservation_status"],
                    "taxonomic_class": profile.get("taxonomic_class"),
                    "habitat": profile.get("habitat"),
                })
        return results

    @staticmethod
    def lookup_by_name(name: str) -> Optional[Dict[str, Any]]:
        return lookup_species(name)
