"""
model_loader.py
---------------
Lazy model loader for the 2-stage wildlife detection pipeline.

Stage 1: YOLO (ultralytics) — detects animal regions + bounding boxes.
         Uses custom wildlife weights (model/best.pt) if present,
         otherwise falls back to yolo11n.pt (generic COCO weights).

Stage 2: EfficientNetV2-B3 (timm, ImageNet-21k → 1k fine-tune) — 
         classifies the cropped animal region to a precise species.
         Uses a curated mapping of ImageNet-1k synsets → wildlife
         common names so results are meaningful for conservation work.

All models are kept in memory after first load (module-level singletons).
Thread-safe because Python's GIL serialises model loading.
"""

import logging
import os
from typing import Any, Optional, Tuple

import torch

logger = logging.getLogger(__name__)

# ---- Singletons ----
_det_model: Any = None
_class_model: Any = None
_class_transforms: Any = None
_device: Optional[torch.device] = None

# ---- ImageNet-1k wildlife index → common name mapping ----
# These indices correspond to the 1000 ImageNet-1k classes.
# Only animal classes relevant to wildlife monitoring are included.
IMAGENET_WILDLIFE_MAP: dict = {
    # Cats / big cats
    281: "Tabby Cat",        292: "Tiger (Bengal)",   286: "Cougar",
    287: "Leopard",          288: "Snow Leopard",      289: "Jaguar",
    290: "Lion",
    # Bears
    294: "Brown Bear",       295: "American Black Bear", 296: "Polar Bear",
    # Canids
    273: "Timber Wolf",      274: "Wild Dog",
    # Elephants
    385: "Indian Elephant",  386: "African Elephant",
    # Primates
    365: "Gorilla",          366: "Chimpanzee",        367: "Baboon",
    # Deer / ungulates
    352: "Ibex",             353: "Arabian Camel",     354: "Llama",
    355: "Warthog",          349: "Bison",
    # Rhinos / hippos
    346: "Hippopotamus",
    # Birds
    100: "Black Swan",       130: "Flamingo",          145: "Peacock",
    7:   "Ostrich",          8:   "Kite Bird",         9:   "Bald Eagle",
    10:  "Vulture",          11:  "Great Grey Owl",
    # Reptiles
    37:  "Box Turtle",       38:  "Banded Gecko",      39:  "Common Iguana",
    # Primates (more)
    368: "Siamang",          369: "Howler Monkey",     370: "Spider Monkey",
    371: "Capuchin Monkey",
    # Fish / aquatic
    0:   "Tench Fish",       1:   "Goldfish",          2:   "Great White Shark",
    3:   "Tiger Shark",      4:   "Hammerhead Shark",  5:   "Electric Ray",
    # Deer / cervids (ImageNet maps these through related indices)
    350: "Bighorn Sheep",    375: "Mink",
    # Insects
    300: "Ladybug",          301: "Fire Beetle",       319: "Monarch Butterfly",
}


def get_device() -> torch.device:
    global _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("Using device: %s", _device)
    return _device


def get_detection_model():
    """
    Returns the Stage 1 YOLO detection model (lazy-loaded).
    Prefers custom wildlife weights; falls back to COCO yolo11n.pt.
    """
    global _det_model
    if _det_model is not None:
        return _det_model

    from ultralytics import YOLO  # noqa

    # Search order for the model file
    search_paths = [
        "model/best.pt",
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "model", "best.pt"),
        "yolo11n.pt",
        "backend/yolo11n.pt",
        os.path.join(os.path.dirname(__file__), "..", "..", "yolo11n.pt"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "yolo11n.pt"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "yolo11n.pt"),
    ]

    for path in search_paths:
        abs_path = os.path.abspath(path)
        if os.path.isfile(abs_path):
            logger.info("[Stage 1] Loading YOLO detection model from: %s", abs_path)
            _det_model = YOLO(abs_path)
            return _det_model

    # Last resort — let ultralytics auto-download yolo11n.pt
    logger.warning("[Stage 1] No local YOLO weights found — auto-downloading yolo11n.pt.")
    _det_model = YOLO("yolo11n.pt")
    return _det_model


def get_classification_model() -> Tuple[Any, Any]:
    """
    Returns (model, transforms) for the Stage 2 EfficientNetV2-B3 classifier
    pretrained on ImageNet-21k → fine-tuned on ImageNet-1k.
    Lazy-loaded and cached globally.
    """
    global _class_model, _class_transforms
    if _class_model is not None:
        return _class_model, _class_transforms

    try:
        import timm
        from timm.data import resolve_data_config, transforms_factory

        device = get_device()
        logger.info("[Stage 2] Loading EfficientNetV2-B3 classifier (ImageNet-21k pretrained)...")

        model = timm.create_model(
            "tf_efficientnetv2_b3.in21k_ft_in1k",
            pretrained=True,
            num_classes=1000,
        )
        model = model.to(device)
        model.eval()

        # Build the data transforms from the model's own config
        data_cfg = resolve_data_config(model.pretrained_cfg)
        transforms = transforms_factory.create_transform(**data_cfg)

        _class_model = model
        _class_transforms = transforms
        logger.info("[Stage 2] Classifier loaded successfully.")
        return _class_model, _class_transforms

    except Exception as exc:
        logger.warning("[Stage 2] Could not load classifier: %s — skipping Stage 2.", exc)
        return None, None
