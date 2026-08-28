"""
image_analysis_service.py
--------------------------
Wildlife Image Analysis Service — orchestrates the 2-stage AI pipeline.

Architecture:
  Stage 1: YOLO detection model  → animal bounding boxes
  Stage 2: EfficientNetV2-B3     → crop-level species classification
  Stage 3: GBIF taxonomy API     → live taxonomic enrichment
           IUCN catalogue        → conservation status lookup
           Local species catalog → scientific name & habitat metadata

This module is the single entry point called by the detection router.
"""

import json
import logging
import os
import uuid
from typing import Any, Dict, Tuple

from fastapi import UploadFile

from app.config import settings
from app.data.species_catalog import enrich_detection
from app.services.ai import image_engine, model_loader
from app.services.ai.iucn_service import get_iucn_status
from app.services.ai.taxonomy_service import get_gbif_taxonomy

logger = logging.getLogger(__name__)


class ImageAnalysisService:

    @staticmethod
    def save_upload(file: UploadFile) -> Tuple[str, str]:
        """Save uploaded file to disk; return (absolute_path, public_url_path)."""
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        with open(filepath, "wb") as buf:
            buf.write(file.file.read())
        return filepath, f"/uploads/{filename}"

    @staticmethod
    def analyze_image(file: UploadFile) -> Dict[str, Any]:
        """
        Full 2-stage analysis pipeline:

        1. Save upload to disk
        2. Validate image (format / integrity / minimum resolution)
        3. Load Stage 1 (YOLO) and Stage 2 (EfficientNetV2-B3) models
        4. Run image_engine.run_full_inference (Stage 1 → Stage 2 → dedup → fallback)
        5. Enrich primary species with:
           a. Local species catalog (scientific name, taxonomy, habitat)
           b. GBIF live taxonomy API (kingdom → family hierarchy)
           c. IUCN Red List conservation status
        6. Return structured result dict
        """
        # ---- 1. Save ----
        filepath, public_path = ImageAnalysisService.save_upload(file)

        # ---- 2. Validate ----
        image_engine.validate_image(filepath)

        # ---- 3. Load models ----
        det_model = model_loader.get_detection_model()
        class_model, class_transforms = model_loader.get_classification_model()

        active_model = "YOLO11"
        if class_model is not None:
            active_model = "YOLO11 + EfficientNetV2-B3 (2-stage)"

        # ---- 4. Run inference ----
        inference = image_engine.run_full_inference(
            image_path=filepath,
            det_model=det_model,
            class_model=class_model,
            class_transforms=class_transforms,
            conf_threshold=settings.YOLO_CONFIDENCE_THRESHOLD,
            original_filename=file.filename or "",
        )

        detections          = inference["detections"]
        primary_label       = inference["primary_label"]
        primary_confidence  = inference["primary_confidence"]
        is_verified         = inference["is_verified_species"]
        animal_count        = inference["animal_count"]
        quality             = inference["image_quality"]
        pipeline_stages     = inference["pipeline_stages"]

        # ---- 5a. Local species catalog enrichment ----
        species_info = enrich_detection(primary_label, primary_confidence)

        # ---- 5b. GBIF live taxonomy (non-blocking) ----
        gbif_data = None
        try:
            gbif_data = get_gbif_taxonomy(primary_label)
        except Exception as exc:
            logger.warning("GBIF lookup failed: %s", exc)

        # Build taxonomy dict — prefer GBIF data when available
        if gbif_data:
            taxonomy = {
                "kingdom": gbif_data.get("kingdom"),
                "phylum":  gbif_data.get("phylum"),
                "class":   gbif_data.get("class_") or species_info.get("taxonomic_class"),
                "order":   gbif_data.get("order")  or species_info.get("taxonomic_order"),
                "family":  gbif_data.get("family") or species_info.get("family"),
                "genus":   gbif_data.get("genus"),
                "species": gbif_data.get("species"),
                "diet":    species_info.get("diet"),
                "habitat": species_info.get("habitat"),
                "source":  "GBIF",
            }
            scientific_name = (
                gbif_data.get("scientific_name")
                or species_info.get("scientific_name")
            )
        else:
            taxonomy = {
                "class":   species_info.get("taxonomic_class"),
                "order":   species_info.get("taxonomic_order"),
                "family":  species_info.get("family"),
                "diet":    species_info.get("diet"),
                "habitat": species_info.get("habitat"),
                "source":  "local_catalog",
            }
            scientific_name = species_info.get("scientific_name")

        # ---- 5c. IUCN conservation status ----
        iucn = get_iucn_status(primary_label)
        conservation_status = iucn["iucn_category"]
        # Use local catalog status if IUCN returns NE and catalog knows it
        if conservation_status == "NE" and species_info.get("conservation_status") not in {None, "Unknown"}:
            conservation_status = species_info["conservation_status"]
        is_endangered = iucn["is_endangered"]

        # ---- 6. Build response ----
        model_note = None
        if class_model is None:
            model_note = (
                "Stage 2 classifier not loaded (timm unavailable or import error). "
                "Running Stage 1 YOLO only — species names may be coarse."
            )

        return {
            # Core detection fields
            "species_name":        species_info.get("common_name") or primary_label,
            "scientific_name":     scientific_name,
            "confidence":          primary_confidence,
            "is_verified_species": is_verified,
            "image_path":          public_path,
            "bbox_json":           json.dumps(detections),
            "detections":          detections,
            "animal_count":        animal_count,
            # Quality & taxonomy
            "image_quality":       quality,
            "taxonomy":            taxonomy,
            # Conservation
            "conservation_status": conservation_status,
            "iucn_label":          iucn["iucn_label"],
            "iucn_description":    iucn["iucn_description"],
            "is_endangered":       is_endangered,
            "threat_level":        iucn["threat_level"],
            # Metadata
            "is_known_species":    species_info.get("is_known_species", True),
            "source_type":         "image",
            "model":               active_model,
            "pipeline_stages":     pipeline_stages,
            "model_note":          model_note,
        }
