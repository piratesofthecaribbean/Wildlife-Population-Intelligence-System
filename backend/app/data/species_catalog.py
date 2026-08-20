"""
Curated species profiles with taxonomy and conservation metadata.
Used by the Species Identification Engine to enrich detections.
"""

from typing import Any, Dict, List, Optional

# Maps common detection labels (YOLO / filename hints) to full species profiles.
SPECIES_CATALOG: Dict[str, Dict[str, Any]] = {
    "Bengal Tiger": {
        "common_name": "Bengal Tiger",
        "scientific_name": "Panthera tigris tigris",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Carnivora",
        "family": "Felidae",
        "diet": "Carnivore",
        "habitat": "Tropical forests, mangroves, grasslands",
        "conservation_status": "EN",
        "iucn_label": "Endangered",
        "is_endangered": True,
    },
    "Tiger": {
        "common_name": "Bengal Tiger",
        "scientific_name": "Panthera tigris tigris",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Carnivora",
        "family": "Felidae",
        "diet": "Carnivore",
        "habitat": "Tropical forests, mangroves, grasslands",
        "conservation_status": "EN",
        "iucn_label": "Endangered",
        "is_endangered": True,
    },
    "Indian Elephant": {
        "common_name": "Indian Elephant",
        "scientific_name": "Elephas maximus indicus",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Proboscidea",
        "family": "Elephantidae",
        "diet": "Herbivore",
        "habitat": "Forests, grasslands, wetlands",
        "conservation_status": "EN",
        "iucn_label": "Endangered",
        "is_endangered": True,
    },
    "Elephant": {
        "common_name": "Indian Elephant",
        "scientific_name": "Elephas maximus indicus",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Proboscidea",
        "family": "Elephantidae",
        "diet": "Herbivore",
        "habitat": "Forests, grasslands, wetlands",
        "conservation_status": "EN",
        "iucn_label": "Endangered",
        "is_endangered": True,
    },
    "Spotted Deer": {
        "common_name": "Spotted Deer",
        "scientific_name": "Axis axis",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Artiodactyla",
        "family": "Cervidae",
        "diet": "Herbivore",
        "habitat": "Deciduous forests, grasslands",
        "conservation_status": "LC",
        "iucn_label": "Least Concern",
        "is_endangered": False,
    },
    "Deer": {
        "common_name": "Spotted Deer",
        "scientific_name": "Axis axis",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Artiodactyla",
        "family": "Cervidae",
        "diet": "Herbivore",
        "habitat": "Deciduous forests, grasslands",
        "conservation_status": "LC",
        "iucn_label": "Least Concern",
        "is_endangered": False,
    },
    "Snow Leopard": {
        "common_name": "Snow Leopard",
        "scientific_name": "Panthera uncia",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Carnivora",
        "family": "Felidae",
        "diet": "Carnivore",
        "habitat": "Alpine and subalpine zones",
        "conservation_status": "VU",
        "iucn_label": "Vulnerable",
        "is_endangered": True,
    },
    "Leopard": {
        "common_name": "Snow Leopard",
        "scientific_name": "Panthera uncia",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Carnivora",
        "family": "Felidae",
        "diet": "Carnivore",
        "habitat": "Alpine and subalpine zones",
        "conservation_status": "VU",
        "iucn_label": "Vulnerable",
        "is_endangered": True,
    },
    "Asiatic Black Bear": {
        "common_name": "Asiatic Black Bear",
        "scientific_name": "Ursus thibetanus",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Carnivora",
        "family": "Ursidae",
        "diet": "Omnivore",
        "habitat": "Montane forests",
        "conservation_status": "VU",
        "iucn_label": "Vulnerable",
        "is_endangered": True,
    },
    "Bear": {
        "common_name": "Asiatic Black Bear",
        "scientific_name": "Ursus thibetanus",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Carnivora",
        "family": "Ursidae",
        "diet": "Omnivore",
        "habitat": "Montane forests",
        "conservation_status": "VU",
        "iucn_label": "Vulnerable",
        "is_endangered": True,
    },
    "Indian Rhino": {
        "common_name": "Indian Rhino",
        "scientific_name": "Rhinoceros unicornis",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Perissodactyla",
        "family": "Rhinocerotidae",
        "diet": "Herbivore",
        "habitat": "Floodplain grasslands, wetlands",
        "conservation_status": "VU",
        "iucn_label": "Vulnerable",
        "is_endangered": True,
    },
    "Rhino": {
        "common_name": "Indian Rhino",
        "scientific_name": "Rhinoceros unicornis",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Perissodactyla",
        "family": "Rhinocerotidae",
        "diet": "Herbivore",
        "habitat": "Floodplain grasslands, wetlands",
        "conservation_status": "VU",
        "iucn_label": "Vulnerable",
        "is_endangered": True,
    },
    "Indian Robin": {
        "common_name": "Indian Robin",
        "scientific_name": "Copsychus fulicatus",
        "taxonomic_class": "Aves",
        "taxonomic_order": "Passeriformes",
        "family": "Muscicapidae",
        "diet": "Insectivore",
        "habitat": "Open scrub, gardens, forest edges",
        "conservation_status": "LC",
        "iucn_label": "Least Concern",
        "is_endangered": False,
    },
    "Peacock": {
        "common_name": "Indian Peafowl",
        "scientific_name": "Pavo cristatus",
        "taxonomic_class": "Aves",
        "taxonomic_order": "Galliformes",
        "family": "Phasianidae",
        "diet": "Omnivore",
        "habitat": "Deciduous forests, cultivated areas",
        "conservation_status": "LC",
        "iucn_label": "Least Concern",
        "is_endangered": False,
    },
    "Mammal Vocalization": {
        "common_name": "Mammal Vocalization",
        "scientific_name": "Unknown mammal",
        "taxonomic_class": "Mammalia",
        "taxonomic_order": "Unknown",
        "family": "Unknown",
        "diet": "Unknown",
        "habitat": "Various",
        "conservation_status": "Unknown",
        "iucn_label": "Unclassified",
        "is_endangered": False,
    },
    "Amphibian Call": {
        "common_name": "Amphibian Call",
        "scientific_name": "Unknown amphibian",
        "taxonomic_class": "Amphibia",
        "taxonomic_order": "Unknown",
        "family": "Unknown",
        "diet": "Unknown",
        "habitat": "Wetlands, ponds",
        "conservation_status": "Unknown",
        "iucn_label": "Unclassified",
        "is_endangered": False,
    },
    "Insect Sound": {
        "common_name": "Insect Sound",
        "scientific_name": "Unknown insect",
        "taxonomic_class": "Insecta",
        "taxonomic_order": "Unknown",
        "family": "Unknown",
        "diet": "Unknown",
        "habitat": "Various",
        "conservation_status": "Unknown",
        "iucn_label": "Unclassified",
        "is_endangered": False,
    },
}

ENDANGERED_STATUSES = {"EN", "CR", "VU"}


def lookup_species(label: str) -> Optional[Dict[str, Any]]:
    """Find species profile by exact or partial label match."""
    if label in SPECIES_CATALOG:
        return SPECIES_CATALOG[label]

    label_lower = label.lower()
    for key, profile in SPECIES_CATALOG.items():
        if key.lower() in label_lower or label_lower in key.lower():
            return profile
    return None


def enrich_detection(label: str, confidence: float) -> Dict[str, Any]:
    """Return taxonomy-enriched species identification result."""
    profile = lookup_species(label)
    if profile:
        return {
            **profile,
            "confidence": confidence,
            "is_known_species": True,
            "is_endangered": profile["conservation_status"] in ENDANGERED_STATUSES,
        }

    return {
        "common_name": label,
        "scientific_name": "Unknown species",
        "taxonomic_class": "Unknown",
        "taxonomic_order": "Unknown",
        "family": "Unknown",
        "diet": "Unknown",
        "habitat": "Unknown",
        "conservation_status": "Unknown",
        "iucn_label": "Requires Verification",
        "is_endangered": False,
        "confidence": confidence,
        "is_known_species": False,
        "requires_verification": True,
    }


def list_catalog_species() -> List[Dict[str, Any]]:
    """Return unique species profiles for the identification engine."""
    seen = set()
    profiles = []
    for profile in SPECIES_CATALOG.values():
        key = profile["scientific_name"]
        if key not in seen:
            seen.add(key)
            profiles.append(profile)
    return profiles
