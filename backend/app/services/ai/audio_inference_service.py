"""
audio_inference_service.py
--------------------------
Orchestrates multi-model Bioacoustic Intelligence:
1. BirdNET Engine (Cornell Lab Global 6K v2.4): Avian and forest soundscapes.
2. YAMNet Engine (Google AudioSet): Mammal calls, amphibian choruses, and acoustic threats (gunshots, chainsaws).
3. Audio Quality Service: SNR, clipping, noise floor, and RMS energy.
4. Taxonomic & IUCN Enrichment: Live taxonomy and conservation status.
"""

import logging
import os
from typing import Any, Dict, List, Optional
import librosa
import numpy as np

from app.services.ai.audio_quality_service import analyze_audio_quality
from app.services.ai.birdnet_engine import run_birdnet_inference
from app.services.ai.yamnet_engine import run_yamnet_inference
from app.services.ai.taxonomy_service import get_gbif_taxonomy
from app.services.ai.iucn_service import get_iucn_status
from app.data.species_catalog import enrich_detection

logger = logging.getLogger(__name__)


def run_full_audio_inference(audio_path: str) -> Dict[str, Any]:
    """
    Executes the complete bioacoustic analysis pipeline on an audio file.
    """
    if not os.path.exists(audio_path):
        raise ValueError(f"Audio file does not exist: {audio_path}")

    # 1. Load audio with Librosa (30 seconds max for telemetry efficiency)
    y_48k, sr_48k = librosa.load(audio_path, sr=48000, mono=True, duration=30.0)
    duration = float(len(y_48k)) / 48000.0

    # 2. Quality analysis
    quality = analyze_audio_quality(y_48k, sr=48000)

    # 3. Run BirdNET (48kHz)
    birdnet_res = run_birdnet_inference(y_48k, sr=48000, min_confidence=0.20)

    # 4. Run YAMNet (16kHz)
    y_16k = librosa.resample(y_48k, orig_sr=48000, target_sr=16000)
    yamnet_res = run_yamnet_inference(y_16k, sr=16000, min_confidence=0.15)

    # 5. Determine Primary Detected Species / Sound
    bird_conf = birdnet_res.get("top_confidence", 0.0)
    yam_conf = yamnet_res.get("top_confidence", 0.0)
    yam_category = yamnet_res.get("top_category")

    # If BirdNET detects a bird with high confidence (>= 0.30)
    if bird_conf >= 0.30 and birdnet_res.get("top_species"):
        primary_species = birdnet_res["top_species"]
        primary_scientific = birdnet_res.get("top_scientific")
        primary_confidence = bird_conf
        model_used = "BirdNET Global 6K v2.4"
        vocalization_type = "Bird Call / Song"
        is_verified = True
        all_events = birdnet_res.get("detections", [])
    # If YAMNet detects a specific mammal/threat/sound with higher confidence
    elif yam_conf >= 0.20 and yamnet_res.get("top_label"):
        primary_species = yamnet_res["top_label"]
        primary_scientific = None
        primary_confidence = yam_conf
        model_used = "Google YAMNet AudioSet"
        vocalization_type = f"{yam_category or 'Animal'} Call"
        is_verified = bool(yam_conf >= 0.50)
        all_events = yamnet_res.get("detections", [])
    # Fallback to the higher score between the two
    elif bird_conf > 0.15 and birdnet_res.get("top_species"):
        primary_species = birdnet_res["top_species"]
        primary_scientific = birdnet_res.get("top_scientific")
        primary_confidence = bird_conf
        model_used = "BirdNET Global 6K v2.4"
        vocalization_type = "Avian Vocalization (Low Confidence)"
        is_verified = False
        all_events = birdnet_res.get("detections", [])
    else:
        primary_species = "Ambient Forest Audio"
        primary_scientific = "N/A"
        primary_confidence = round(max(bird_conf, yam_conf, 0.10), 2)
        model_used = "BirdNET + YAMNet Bioacoustic Ensemble"
        vocalization_type = "Environmental Soundscape"
        is_verified = False
        all_events = []

    # 6. Taxonomic Enrichment (GBIF + Local Catalog)
    species_catalog_info = enrich_detection(primary_species, primary_confidence)
    gbif_info = get_gbif_taxonomy(primary_scientific or primary_species)

    if gbif_info:
        taxonomy = {
            "kingdom": gbif_info.get("kingdom", "Animalia"),
            "phylum": gbif_info.get("phylum", "Chordata"),
            "class": gbif_info.get("class_") or species_catalog_info.get("taxonomic_class", "Aves"),
            "order": gbif_info.get("order") or species_catalog_info.get("taxonomic_order", "Passeriformes"),
            "family": gbif_info.get("family") or species_catalog_info.get("family", "Unknown"),
            "genus": gbif_info.get("genus"),
            "species": gbif_info.get("species"),
        }
        if not primary_scientific:
            primary_scientific = gbif_info.get("scientific_name")
    else:
        taxonomy = {
            "class": species_catalog_info.get("taxonomic_class", "Aves"),
            "order": species_catalog_info.get("taxonomic_order", "Passeriformes"),
            "family": species_catalog_info.get("family", "Unknown"),
        }
        if not primary_scientific:
            primary_scientific = species_catalog_info.get("scientific_name")

    # 7. IUCN Conservation Status
    iucn = get_iucn_status(primary_species)
    conservation_status = iucn.get("iucn_category", "LC")
    is_endangered = iucn.get("is_endangered", False)

    # 8. Spectral Waveform & Spectrogram downsampled arrays (for Frontend UI charts)
    downsample_rate = max(1, len(y_48k) // 50)
    waveform_data = [
        {"time": f"{round(i * downsample_rate / 48000.0, 1)}s", "amp": round(float(np.abs(y_48k[i * downsample_rate])) * 100, 1)}
        for i in range(min(50, len(y_48k) // downsample_rate))
    ]

    return {
        "species_name": primary_species,
        "scientific_name": primary_scientific or "Unknown",
        "confidence": primary_confidence,
        "is_verified_species": is_verified,
        "vocalization_type": vocalization_type,
        "model_used": model_used,
        "duration_seconds": round(duration, 2),
        "conservation_status": conservation_status,
        "iucn_label": iucn.get("iucn_label", "Least Concern"),
        "iucn_description": iucn.get("iucn_description", ""),
        "is_endangered": is_endangered,
        "acoustic_quality": quality,
        "taxonomy": taxonomy,
        "events": all_events,
        "birdnet_results": birdnet_res,
        "yamnet_results": yamnet_res,
        "waveform": waveform_data,
        "source_type": "audio",
    }
