"""
taxonomy_service.py
-------------------
Live GBIF (Global Biodiversity Information Facility) taxonomy lookup.
Retrieves full taxonomic hierarchy for any species name (common or scientific).

Never raises exceptions — always returns None on any network/API failure
so the calling pipeline can proceed with local catalog fallback.
"""

import json
import logging
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# In-memory cache — avoids duplicate network calls within a session
_taxonomy_cache: Dict[str, Dict[str, Any]] = {}

# Quick common-name → binomial lookup so GBIF gets a scientific name
COMMON_TO_BINOMIAL: Dict[str, str] = {
    "bengal tiger": "Panthera tigris tigris",
    "tiger": "Panthera tigris",
    "indian elephant": "Elephas maximus indicus",
    "elephant": "Elephas maximus",
    "african elephant": "Loxodonta africana",
    "spotted deer": "Axis axis",
    "chital": "Axis axis",
    "deer": "Cervidae",
    "snow leopard": "Panthera uncia",
    "leopard": "Panthera pardus",
    "indian rhino": "Rhinoceros unicornis",
    "rhinoceros": "Rhinocerotidae",
    "asiatic black bear": "Ursus thibetanus",
    "bear": "Ursidae",
    "brown bear": "Ursus arctos",
    "polar bear": "Ursus maritimus",
    "peacock": "Pavo cristatus",
    "indian peafowl": "Pavo cristatus",
    "lion": "Panthera leo",
    "jaguar": "Panthera onca",
    "cougar": "Puma concolor",
    "gorilla": "Gorilla gorilla",
    "chimpanzee": "Pan troglodytes",
    "red panda": "Ailurus fulgens",
    "giant panda": "Ailuropoda melanoleuca",
    "hippopotamus": "Hippopotamus amphibius",
    "giraffe": "Giraffa camelopardalis",
    "zebra": "Equus quagga",
    "bald eagle": "Haliaeetus leucocephalus",
    "peregrine falcon": "Falco peregrinus",
    "flamingo": "Phoenicopterus roseus",
    "great white shark": "Carcharodon carcharias",
    "whale shark": "Rhincodon typus",
}


def _gbif_match(name: str) -> Optional[Dict[str, Any]]:
    """Query GBIF species/match endpoint. Returns raw GBIF dict or None."""
    enc = urllib.parse.quote(name)
    url = f"https://api.gbif.org/v1/species/match?name={enc}&verbose=false"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WildlifePopulationSystem/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        logger.debug("GBIF match request failed for '%s': %s", name, exc)
        return None


def get_gbif_taxonomy(species_name: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve full taxonomic classification from GBIF for a species.

    Supports common names and scientific names.
    Returns a dict with keys: kingdom, phylum, class_, order, family,
    genus, species, scientific_name, status, confidence.
    Returns None on any failure.
    """
    if not species_name or not isinstance(species_name, str):
        return None

    clean = species_name.strip()
    cache_key = clean.lower()

    # Skip non-species placeholders
    if cache_key in {"unknown", "none", "background", "no animal detected", "n/a",
                     "unknown wildlife", "unverified"}:
        return None

    if cache_key in _taxonomy_cache:
        return _taxonomy_cache[cache_key]

    # Resolve common name → binomial if possible
    query = COMMON_TO_BINOMIAL.get(cache_key, clean)

    data = _gbif_match(query)
    if data is None and query != clean:
        # Try original name as fallback
        data = _gbif_match(clean)

    if data is None or data.get("matchType") == "NONE":
        _taxonomy_cache[cache_key] = None
        return None

    result = {
        "kingdom":         data.get("kingdom"),
        "phylum":          data.get("phylum"),
        "class_":          data.get("class"),
        "order":           data.get("order"),
        "family":          data.get("family"),
        "genus":           data.get("genus"),
        "species":         data.get("species"),
        "scientific_name": data.get("canonicalName") or data.get("scientificName"),
        "gbif_status":     data.get("status"),
        "gbif_confidence": data.get("confidence"),
        "source":          "GBIF",
    }
    _taxonomy_cache[cache_key] = result
    logger.info("GBIF taxonomy resolved for '%s': %s %s", clean,
                result.get("class_"), result.get("family"))
    return result
