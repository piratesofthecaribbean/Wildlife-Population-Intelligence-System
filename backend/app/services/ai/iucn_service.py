"""
iucn_service.py
---------------
IUCN Red List conservation status resolution.
Expanded to cover all wildlife species now recognised by the 2-stage EfficientNetV2 classifier.
"""

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

IUCN_DESCRIPTIONS: Dict[str, str] = {
    "EX": "Extinct — no reasonable doubt that the last individual has died.",
    "EW": "Extinct in the Wild — survives only in captivity or cultivation.",
    "CR": "Critically Endangered — facing extremely high risk of extinction.",
    "EN": "Endangered — facing very high risk of extinction in the wild.",
    "VU": "Vulnerable — facing high risk of extinction in the wild.",
    "NT": "Near Threatened — likely to qualify for threatened category soon.",
    "LC": "Least Concern — lowest risk; does not qualify for at-risk categories.",
    "DD": "Data Deficient — inadequate information to assess extinction risk.",
    "NE": "Not Evaluated — has not yet been evaluated against IUCN criteria.",
}

IUCN_THREAT_LEVELS: Dict[str, int] = {
    "EX": 0, "EW": 1, "CR": 2, "EN": 3, "VU": 4,
    "NT": 5, "LC": 6, "DD": 7, "NE": 8,
}

# Curated local catalogue: common/scientific name → IUCN category
# Covers all species recognised by the 2-stage EfficientNetV2 pipeline.
_LOCAL_CATALOG: Dict[str, str] = {
    # ── Tigers ──
    "bengal tiger": "EN",       "panthera tigris tigris": "EN",
    "tiger": "EN",              "panthera tigris": "EN",
    "tiger cat": "EN",          "amur tiger": "EN",        "sumatran tiger": "CR",

    # ── Other Big Cats ──
    "snow leopard": "VU",       "panthera uncia": "VU",
    "leopard": "VU",            "panthera pardus": "VU",    "amur leopard": "CR",
    "jaguar": "NT",             "panthera onca": "NT",
    "lion": "VU",               "panthera leo": "VU",
    "cheetah": "VU",            "acinonyx jubatus": "VU",
    "cougar": "LC",             "puma concolor": "LC",
    "lynx": "LC",               "wild cat": "LC",

    # ── Bears ──
    "polar bear": "VU",         "ursus maritimus": "VU",
    "asiatic black bear": "VU", "ursus thibetanus": "VU",
    "brown bear": "LC",         "ursus arctos": "LC",
    "sloth bear": "VU",         "melursus ursinus": "VU",
    "giant panda": "VU",        "ailuropoda melanoleuca": "VU",
    "red panda": "EN",          "ailurus fulgens": "EN",

    # ── Elephants ──
    "indian elephant": "EN",    "elephas maximus indicus": "EN",
    "asian elephant": "EN",     "elephas maximus": "EN",
    "african elephant": "VU",   "loxodonta africana": "VU",
    "african forest elephant": "CR",

    # ── Rhinos & Hippo ──
    "indian rhino": "VU",       "rhinoceros unicornis": "VU",
    "black rhino": "CR",        "diceros bicornis": "CR",
    "white rhino": "NT",        "ceratotherium simum": "NT",
    "hippopotamus": "VU",       "hippopotamus amphibius": "VU",

    # ── Wild Canids ──
    "timber wolf": "LC",        "grey wolf": "LC",          "wolf": "LC",
    "white wolf": "LC",         "red wolf": "CR",           "canis lupus": "LC",
    "dhole": "EN",              "cuon alpinus": "EN",
    "african wild dog": "EN",   "lycaon pictus": "EN",
    "hyena": "LC",              "crocuta crocuta": "LC",
    "red fox": "LC",            "vulpes vulpes": "LC",
    "arctic fox": "VU",         "vulpes lagopus": "VU",
    "grey fox": "LC",           "coyote": "LC",             "dingo": "VU",

    # ── Deer / Ungulates ──
    "spotted deer": "LC",       "axis axis": "LC",          "chital": "LC",
    "deer": "LC",               "gazelle": "LC",
    "hartebeest": "LC",         "impala": "LC",
    "ibex": "LC",               "bighorn sheep": "LC",
    "bison": "NT",              "wild boar": "LC",          "warthog": "LC",
    "water buffalo": "NT",      "giraffe": "VU",            "giraffa camelopardalis": "VU",
    "zebra": "NT",              "equus quagga": "NT",

    # ── Primates ──
    "gorilla": "CR",            "gorilla gorilla": "CR",    "mountain gorilla": "EN",
    "chimpanzee": "EN",         "pan troglodytes": "EN",
    "orangutan": "CR",          "pongo pygmaeus": "CR",
    "gibbon": "EN",             "siamang": "EN",
    "proboscis monkey": "EN",   "nasalis larvatus": "EN",
    "spider monkey": "EN",      "howler monkey": "LC",
    "colobus monkey": "LC",     "langur": "LC",
    "baboon": "LC",             "macaque": "LC",
    "capuchin monkey": "LC",    "marmoset": "LC",
    "guenon monkey": "LC",      "patas monkey": "LC",
    "squirrel monkey": "LC",    "titi monkey": "LC",
    "indri lemur": "CR",        "madagascar cat": "EN",

    # ── Small Carnivores ──
    "mongoose": "LC",           "meerkat": "LC",
    "otter": "NT",              "badger": "LC",
    "weasel": "LC",             "mink": "NT",
    "skunk": "LC",              "porcupine": "LC",
    "beaver": "LC",             "armadillo": "LC",
    "three-toed sloth": "LC",

    # ── Marsupials ──
    "koala": "VU",              "phascolarctos cinereus": "VU",
    "wallaby": "LC",            "wombat": "LC",             "tasmanian devil": "EN",
    "platypus": "NT",

    # ── Birds ──
    "peacock": "LC",            "pavo cristatus": "LC",     "indian peafowl": "LC",
    "bald eagle": "LC",         "haliaeetus leucocephalus": "LC",
    "peregrine falcon": "LC",   "falco peregrinus": "LC",
    "flamingo": "LC",           "crane": "LC",
    "hornbill": "NT",           "vulture": "NT",
    "great grey owl": "LC",     "ostrich": "LC",
    "macaw": "LC",              "toucan": "LC",
    "black stork": "LC",        "white stork": "LC",
    "african grey parrot": "EN",
    "blue heron": "LC",         "egret": "LC",              "pelican": "LC",
    "hornbill": "NT",           "bee-eater": "LC",          "hummingbird": "LC",

    # ── Reptiles ──
    "indian cobra": "LC",       "naja naja": "LC",
    "rock python": "NT",        "python molurus": "NT",
    "komodo dragon": "VU",      "varanus komodoensis": "VU",
    "african crocodile": "LC",  "american alligator": "LC",
    "boa constrictor": "LC",    "green mamba": "LC",
    "horned viper": "LC",       "king cobra": "VU",

    # ── Aquatic / Marine ──
    "great white shark": "VU",  "carcharodon carcharias": "VU",
    "whale shark": "EN",        "rhincodon typus": "EN",
    "hammerhead shark": "CR",   "tiger shark": "NT",
    "dugong": "VU",             "orca": "LC",               "grey whale": "LC",
    "sea lion": "LC",
}


def get_iucn_status(species_name: str) -> Dict[str, Any]:
    """
    Returns IUCN conservation status for a species name.
    Checks local catalogue (exact + partial match).
    """
    if not species_name or not isinstance(species_name, str):
        return _build_result("NE")

    key = species_name.strip().lower()
    category = _LOCAL_CATALOG.get(key)

    # Partial match fallback
    if category is None:
        for catalog_key, cat in _LOCAL_CATALOG.items():
            if catalog_key in key or key in catalog_key:
                category = cat
                break

    if category is None:
        logger.debug("IUCN status unknown for '%s' — returning NE.", species_name)
        category = "NE"

    return _build_result(category)


def _build_result(category: str) -> Dict[str, Any]:
    is_endangered = category in {"CR", "EN", "VU", "EW", "EX"}
    return {
        "iucn_category":    category,
        "iucn_label":       _label(category),
        "iucn_description": IUCN_DESCRIPTIONS.get(category, "Status unknown."),
        "is_endangered":    is_endangered,
        "threat_level":     IUCN_THREAT_LEVELS.get(category, 8),
    }


def _label(category: str) -> str:
    labels = {
        "EX": "Extinct", "EW": "Extinct in Wild", "CR": "Critically Endangered",
        "EN": "Endangered", "VU": "Vulnerable", "NT": "Near Threatened",
        "LC": "Least Concern", "DD": "Data Deficient", "NE": "Not Evaluated",
    }
    return labels.get(category, "Unknown")
