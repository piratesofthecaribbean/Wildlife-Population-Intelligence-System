"""
Wildlife Image Analysis Engine — YOLO11-based species recognition pipeline.

Pipeline: Image Preprocessing (OpenCV) → YOLO11 Detection → Species Classification
          → Bounding Box + Animal Counting → Image Quality Assessment

Model-awareness
---------------
_get_yolo_model() returns (model, is_custom_model: bool).

* is_custom_model = True  → custom wildlife-trained weights are loaded;
  the model's own class names are used directly as species labels and
  is_verified_species is set to True on every detection.
* is_custom_model = False → generic COCO weights (yolo11n.pt) are in use;
  detections use coarse, honestly-described group labels
  (e.g. "Wild Felid (unverified)") and is_verified_species is set to False
  so callers / the UI can surface the uncertainty instead of asserting a
  wrong species confidently.
"""

import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
import numpy as np
from fastapi import UploadFile

from app.config import settings
from app.data.species_catalog import SPECIES_CATALOG, enrich_detection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level cache: (model_instance, is_custom_model)
# ---------------------------------------------------------------------------
_yolo_model: Any = None
_is_custom_model: bool = False


def _get_yolo_model() -> Tuple[Any, bool]:
    """
    Lazy-load the YOLO model.

    Resolution order:
      1. Custom trained wildlife model at settings.YOLO_MODEL_PATH (preferred).
      2. yolo11n.pt from several common locations (COCO fallback).
      3. Let ultralytics auto-download yolo11n.pt as a last resort (COCO fallback).

    Returns
    -------
    (model, is_custom_model)
        is_custom_model is True only when the custom wildlife weights were
        successfully loaded; False for every COCO fallback variant.
    """
    global _yolo_model, _is_custom_model
    if _yolo_model is not None:
        return _yolo_model, _is_custom_model

    from ultralytics import YOLO  # noqa: PLC0415

    # 1. Try the custom wildlife model first
    custom_path = settings.YOLO_MODEL_PATH
    if os.path.isfile(custom_path):
        logger.info("Loading CUSTOM wildlife model from: %s", custom_path)
        _yolo_model = YOLO(custom_path)
        _is_custom_model = True
        logger.info("Active model: YOLO11-custom (%s)", custom_path)
        return _yolo_model, _is_custom_model

    logger.warning(
        "Custom model not found at '%s'. "
        "Falling back to generic COCO model (yolo11n.pt). "
        "Species-level identification will NOT be accurate — "
        "deploy a wildlife-trained weights file to fix this.",
        custom_path,
    )

    # 2. Fallback: search for yolo11n.pt in common locations
    fallback_paths = [
        "yolo11n.pt",
        "backend/yolo11n.pt",
        os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "yolo11n.pt")),
        os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "yolo11n.pt")),
    ]
    for fp in fallback_paths:
        if os.path.isfile(fp):
            logger.info("Loading COCO fallback model from: %s", fp)
            _yolo_model = YOLO(fp)
            _is_custom_model = False
            logger.info("Active model: YOLO11-COCO-fallback (%s)", fp)
            return _yolo_model, _is_custom_model

    # 3. Last resort: let ultralytics auto-download
    logger.info("Auto-downloading yolo11n.pt (COCO fallback)")
    _yolo_model = YOLO("yolo11n.pt")
    _is_custom_model = False
    logger.info("Active model: YOLO11-COCO-fallback (auto-downloaded)")
    return _yolo_model, _is_custom_model


# ---------------------------------------------------------------------------
# COCO fallback mapping
#
# When the GENERIC COCO model is in use, we must NOT claim a specific species
# (e.g. cat → "Leopard") because the same COCO class fires for house cats,
# tigers, leopards, and lions equally.
#
# Instead we map to an honest, coarse label that makes the uncertainty
# explicit to the user.  Every fallback detection also carries
# is_verified_species: False.
#
# Removed dead entries:
#   "mouse" — already blocked by NON_ANIMAL_COCO (it means computer mouse)
#             before this map is ever reached.
# ---------------------------------------------------------------------------
COCO_COARSE_MAP: Dict[str, str] = {
    # Felid-like (COCO "cat" fires for any large/small felid)
    "cat": "Wild Felid (unverified)",
    # Canid-like
    "dog": "Wild Canid (unverified)",
    # Elephant — specific enough at genus level in COCO
    "elephant": "Elephant (unverified)",
    # Bear — specific enough at family level in COCO
    "bear": "Bear (unverified)",
    # Birds — COCO "bird" is extremely broad
    "bird": "Bird (unverified)",
    # Ungulates — horse/sheep/cow/zebra/giraffe all map here; none
    # reliably indicates a specific deer/bovid species in camera-trap footage.
    "horse": "Ungulate (unverified)",
    "sheep": "Ungulate (unverified)",
    "cow": "Ungulate (unverified)",
    "zebra": "Ungulate (unverified)",
    "giraffe": "Ungulate (unverified)",
    # Lagomorphs
    "rabbit": "Lagomorph (unverified)",
}

# COCO classes that are NOT animals — filter these out from wildlife results
NON_ANIMAL_COCO = {
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train",
    "truck", "boat", "traffic light", "fire hydrant", "stop sign",
    "parking meter", "bench", "backpack", "umbrella", "handbag", "tie",
    "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket", "bottle", "wine glass", "cup", "fork", "knife",
    "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli",
    "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven",
    "toaster", "sink", "refrigerator", "book", "clock", "vase",
    "scissors", "teddy bear", "hair drier", "toothbrush",
}


class ImageAnalysisService:
    @staticmethod
    def save_upload(file: UploadFile) -> Tuple[str, str]:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            buffer.write(file.file.read())
        return filepath, f"/uploads/{filename}"

    @staticmethod
    def preprocess_image(image_path: str) -> np.ndarray:
        """OpenCV preprocessing: resize, denoise, normalize."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Unable to read uploaded image")

        # Resize large images for faster inference while preserving aspect ratio
        max_dim = 1280
        h, w = img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # Mild denoising for camera-trap quality images
        img = cv2.fastNlMeansDenoisingColored(img, None, 6, 6, 7, 21)
        return img

    @staticmethod
    def assess_image_quality(image_path: str) -> Dict[str, Any]:
        """Assess blur, brightness, contrast, sharpness, and overall quality."""
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return {"overall_score": 0.0, "quality_label": "Poor", "error": "Cannot read image"}

        # Blur via Laplacian variance (higher = sharper)
        laplacian_var = float(cv2.Laplacian(img, cv2.CV_64F).var())
        blur_score = min(laplacian_var / 500.0, 1.0)

        # Brightness (ideal range ~80-180)
        brightness = float(np.mean(img))
        brightness_score = 1.0 - abs(brightness - 128) / 128.0

        # Contrast via standard deviation
        contrast = float(np.std(img))
        contrast_score = min(contrast / 64.0, 1.0)

        # Sharpness (Sobel gradient magnitude)
        sobelx = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=3)
        sharpness = float(np.mean(np.sqrt(sobelx**2 + sobely**2)))
        sharpness_score = min(sharpness / 50.0, 1.0)

        # Occlusion heuristic: very dark or very bright pixel ratio
        dark_ratio = float(np.sum(img < 30) / img.size)
        bright_ratio = float(np.sum(img > 225) / img.size)
        occlusion_penalty = min(dark_ratio + bright_ratio, 0.5)

        overall = (
            blur_score * 0.30
            + brightness_score * 0.20
            + contrast_score * 0.20
            + sharpness_score * 0.20
            + (1.0 - occlusion_penalty * 2) * 0.10
        )
        overall = round(max(0.0, min(overall, 1.0)), 3)

        if overall >= 0.75:
            label = "Excellent"
        elif overall >= 0.55:
            label = "Good"
        elif overall >= 0.35:
            label = "Fair"
        else:
            label = "Poor"

        return {
            "blur_score": round(blur_score, 3),
            "brightness": round(brightness, 1),
            "brightness_score": round(brightness_score, 3),
            "contrast_score": round(contrast_score, 3),
            "sharpness_score": round(sharpness_score, 3),
            "occlusion_ratio": round(dark_ratio + bright_ratio, 3),
            "overall_score": overall,
            "quality_label": label,
        }

    @staticmethod
    def _run_yolo_detection(image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Run YOLO inference and return detection records.

        Behaviour depends on which model is loaded:

        Custom wildlife model (is_custom_model=True)
            The model's own class names are used as species labels directly.
            is_verified_species is set to True.

        COCO fallback model (is_custom_model=False)
            COCO class names are mapped to honest coarse group labels
            (e.g. "Wild Felid (unverified)") via COCO_COARSE_MAP.
            is_verified_species is set to False on every detection so
            callers and the UI know the species name is unconfirmed.
        """
        model, is_custom = _get_yolo_model()
        results = model.predict(
            source=image,
            conf=settings.YOLO_CONFIDENCE_THRESHOLD,
            device=settings.DEVICE,
            verbose=False,
        )

        h, w = image.shape[:2]
        detections = []

        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                raw_label = result.names.get(cls_id, f"class_{cls_id}").lower()

                # Skip non-animal COCO classes (applies to both model modes)
                if raw_label in NON_ANIMAL_COCO:
                    continue

                if is_custom:
                    # Custom model: use the trained class names directly as species
                    mapped_label = result.names.get(cls_id, f"class_{cls_id}").strip()
                    is_verified = True
                else:
                    # COCO fallback: use honest coarse labels, never invent a species
                    mapped_label = COCO_COARSE_MAP.get(
                        raw_label, f"{raw_label.title()} (unverified)"
                    )
                    is_verified = False

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    "label": mapped_label,
                    "raw_label": raw_label,
                    "confidence": round(conf, 4),
                    "is_verified_species": is_verified,
                    "box": [
                        round(x1 / w, 4),
                        round(y1 / h, 4),
                        round(x2 / w, 4),
                        round(y2 / h, 4),
                    ],
                })

        return detections

    @staticmethod
    def _filename_hint(filename: str) -> Optional[str]:
        """
        Extract a species hint from the filename.

        This is a LAST-RESORT fallback used ONLY when no YOLO detections
        were produced at all.  It must never override an existing detection.
        """
        name = (filename or "").lower()
        hints = {
            "tiger": "Bengal Tiger",
            "elephant": "Indian Elephant",
            "deer": "Spotted Deer",
            "chital": "Spotted Deer",
            "leopard": "Leopard",
            "snow_leopard": "Snow Leopard",
            "bear": "Asiatic Black Bear",
            "rhino": "Indian Rhino",
            "rhinoceros": "Indian Rhino",
            "peacock": "Peacock",
            "bird": "Indian Peafowl",
            "peafowl": "Peacock",
        }
        for key, species in hints.items():
            if key in name:
                return species
        return None

    @staticmethod
    def analyze_image(file: UploadFile) -> Dict[str, Any]:
        """
        Full image analysis pipeline:
        Preprocess → Detect → Classify → Quality Assessment → Observation Record
        """
        filepath, public_path = ImageAnalysisService.save_upload(file)
        quality = ImageAnalysisService.assess_image_quality(filepath)

        # Determine which model is active (triggers lazy load if needed)
        _, is_custom = _get_yolo_model()
        active_model_name = "YOLO11-custom" if is_custom else "YOLO11-COCO-fallback"

        detections: List[Dict[str, Any]] = []
        try:
            preprocessed = ImageAnalysisService.preprocess_image(filepath)
            detections = ImageAnalysisService._run_yolo_detection(preprocessed)
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error("Exception during YOLO detection: %s", e)
            detections = []

        # NOTE: filename hint is intentionally NOT applied to override existing
        # detections.  It is used below ONLY when detections is completely empty.

        # Fallback when no animal detected at all
        if not detections:
            hint = ImageAnalysisService._filename_hint(file.filename) if file else None
            if hint:
                # Filename hint: low confidence, explicitly unverified
                detections = [{
                    "label": hint,
                    "raw_label": "filename_hint",
                    "confidence": 0.30,
                    "is_verified_species": False,
                    "box": [0.10, 0.08, 0.90, 0.92],
                }]
                logger.info(
                    "No YOLO detections — using filename hint '%s' with low confidence.", hint
                )
            else:
                detections = [{
                    "label": "Unknown Wildlife",
                    "raw_label": "no_detection",
                    "confidence": 0.10,
                    "is_verified_species": False,
                    "box": [0.15, 0.12, 0.85, 0.88],
                }]

        # Primary species = highest confidence detection
        primary = max(detections, key=lambda d: d["confidence"])
        species_info = enrich_detection(primary["label"], primary["confidence"])

        # Propagate is_verified_species: if the primary detection is not verified
        # (COCO fallback or filename hint), the overall result is also not verified.
        is_verified = primary.get("is_verified_species", True)

        return {
            "species_name": species_info["common_name"],
            "scientific_name": species_info["scientific_name"],
            "confidence": primary["confidence"],
            "is_verified_species": is_verified,
            "image_path": public_path,
            "bbox_json": json.dumps(detections),
            "detections": detections,
            "animal_count": len(detections),
            "image_quality": quality,
            "taxonomy": {
                "class": species_info["taxonomic_class"],
                "order": species_info["taxonomic_order"],
                "family": species_info["family"],
                "diet": species_info["diet"],
                "habitat": species_info["habitat"],
            },
            "conservation_status": species_info["conservation_status"],
            "iucn_label": species_info["iucn_label"],
            "is_endangered": species_info.get("is_endangered", False),
            "is_known_species": species_info.get("is_known_species", True),
            "source_type": "image",
            # Active model name is now included in the response so misconfiguration
            # is visible without reading server logs.
            "model": active_model_name,
            # Infrastructure note surfaced when the custom model is absent.
            "model_note": (
                None
                if is_custom
                else (
                    f"Custom wildlife model not found at '{settings.YOLO_MODEL_PATH}'. "
                    "Using generic COCO model (yolo11n.pt). "
                    "Species names are coarse estimates only — is_verified_species is False "
                    "for all detections. Deploy a wildlife-trained weights file to enable "
                    "accurate species identification."
                )
            ),
        }
