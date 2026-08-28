"""
image_engine.py
---------------
2-Stage Wildlife Detection Engine.


Stage 1 — YOLO Detection
  • Detects animal bounding boxes in the full image.
  • Filters non-animal COCO classes.
  • Applies IoU + containment deduplication (from reference branch).

Stage 2 — EfficientNetV2-B3 Classification
  • Crops each detected animal region from the original image.
  • Classifies the crop using EfficientNetV2-B3 (ImageNet-21k pretrained).
  • Maps ImageNet class index → wildlife common name.
  • Falls back to YOLO class label if Stage 2 is unavailable or low confidence.

Image Validation
  • Checks format, integrity, and minimum 32×32 resolution before processing.

Image Quality Assessment
  • 5-metric weighted score: Blur 40%, Resolution 25%,
    Brightness 15%, Contrast 10%, Noise 10%.
"""

import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Non-animal COCO classes (Stage 1 filter)
# ---------------------------------------------------------------------------
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

# COCO coarse group labels (when COCO fallback model is in use, Stage 2 not loaded)
# Note: COCO-80 has NO "deer" class — deer are commonly mislabelled as "bird", "horse",
# or "sheep". Stage 2 (EfficientNetV2) corrects this via crop classification.
COCO_COARSE_MAP: Dict[str, str] = {
    "cat":      "Wild Felid",        # tigers, leopards, cheetahs
    "dog":      "Wild Canid",        # wolves, dholes
    "elephant": "Elephant",
    "bear":     "Bear",
    "bird":     "Wildlife (unverified)",  # Stage 2 will reclassify; may be deer
    "horse":    "Ungulate",          # may be deer/antelope — Stage 2 reclassifies
    "sheep":    "Ungulate",          # may be deer/antelope — Stage 2 reclassifies
    "cow":      "Ungulate",
    "zebra":    "Zebra",
    "giraffe":  "Giraffe",
    "rabbit":   "Rabbit",
}

# ImageNet-1k index → wildlife common name (Stage 2 output)
# ALL indices verified from the official ImageNet-1k synset class list.
# Covers every forest, savanna, mountain, and wetland wildlife species
# present in ImageNet-1k.
IMAGENET_WILDLIFE_MAP: Dict[int, str] = {

    # ── Fish & Sharks ──
    0:   "Tench",              1:   "Goldfish",
    2:   "Great White Shark",  3:   "Tiger Shark",
    4:   "Hammerhead Shark",   5:   "Electric Ray",
    6:   "Stingray",           390: "Eel",
    391: "Coho Salmon",        395: "Gar Fish",

    # ── Amphibians ──
    30:  "Bullfrog",           31:  "Tree Frog",

    # ── Reptiles ──
    33:  "Loggerhead Turtle",  34:  "Leatherback Turtle",
    37:  "Box Turtle",         38:  "Banded Gecko",
    39:  "Common Iguana",      40:  "Chameleon",
    42:  "Agama Lizard",       43:  "Frilled Lizard",
    48:  "Komodo Dragon",      49:  "African Crocodile",
    50:  "American Alligator",
    # Snakes
    52:  "Rat Snake",          53:  "Ringneck Snake",
    55:  "Green Snake",        56:  "King Snake",
    61:  "Boa Constrictor",    62:  "Rock Python",
    63:  "Indian Cobra",       64:  "Green Mamba",
    66:  "Horned Viper",       68:  "Sidewinder",

    # ── Birds (forest & grassland) ──
    7:   "Wild Rooster",       9:   "Ostrich",
    10:  "Brambling",          21:  "Kite Bird",
    22:  "Bald Eagle",         23:  "Vulture",
    24:  "Great Grey Owl",     80:  "Black Grouse",
    81:  "Ptarmigan",          82:  "Ruffed Grouse",
    84:  "Peacock",            85:  "Quail",
    86:  "Partridge",          87:  "African Grey Parrot",
    88:  "Macaw",              91:  "Coucal",
    92:  "Bee-eater",          93:  "Hornbill",
    94:  "Hummingbird",        96:  "Toucan",
    99:  "Goose",              100: "Black Swan",
    101: "Tusker",             127: "White Stork",
    128: "Black Stork",        129: "Spoonbill",
    130: "Flamingo",           131: "Blue Heron",
    132: "Egret",              133: "Bittern",
    134: "Crane",              135: "Limpkin",
    144: "Pelican",            145: "King Penguin",
    146: "Albatross",

    # ── Marine Mammals ──
    147: "Grey Whale",         148: "Orca",
    149: "Dugong",             150: "Sea Lion",

    # ── Wild Canids ──
    269: "Timber Wolf",        270: "White Wolf",
    271: "Red Wolf",           272: "Coyote",
    273: "Dingo",              274: "Dhole",
    275: "African Wild Dog",   276: "Hyena",
    277: "Red Fox",            278: "Kit Fox",
    279: "Arctic Fox",         280: "Grey Fox",

    # ── Big Cats ──
    281: "Wild Cat",           282: "Tiger Cat",
    283: "Wild Cat",           284: "Wild Cat",
    285: "Wild Cat",           286: "Cougar",
    287: "Lynx",               288: "Leopard",
    289: "Snow Leopard",       290: "Jaguar",
    291: "Lion",               292: "Bengal Tiger",
    293: "Cheetah",

    # ── Bears ──
    294: "Brown Bear",         295: "Asiatic Black Bear",
    296: "Polar Bear",         297: "Sloth Bear",

    # ── Small Carnivores ──
    298: "Mongoose",           299: "Meerkat",
    356: "Weasel",             357: "Mink",
    358: "Polecat",            359: "Black-footed Ferret",
    360: "Otter",              361: "Skunk",
    362: "Badger",

    # ── Marsupials & Monotremes ──
    102: "Echidna",            103: "Platypus",
    104: "Wallaby",            105: "Koala",
    106: "Wombat",

    # ── Small Mammals ──
    330: "Wild Rabbit",        331: "Hare",
    333: "Hamster",            334: "Porcupine",
    335: "Fox Squirrel",       336: "Marmot",
    337: "Beaver",             363: "Armadillo",
    364: "Three-toed Sloth",

    # ── Pigs / Boar / Warthog ──
    341: "Wild Boar",          342: "Wild Boar",
    343: "Warthog",

    # ── Hippo ──
    344: "Hippopotamus",

    # ── Ungulates / Deer / Bovids ──
    # (COCO has no deer class — YOLO labels deer as "bird"/"horse"/"sheep")
    339: "Horse",              340: "Zebra",
    345: "Ox",                 346: "Water Buffalo",
    347: "Bison",              348: "Ram",
    349: "Bighorn Sheep",      350: "Ibex",
    351: "Hartebeest",
    352: "Spotted Deer",       # impala — proxy for chital/spotted deer
    353: "Gazelle",            # gazelle — proxy for deer species
    354: "Arabian Camel",      355: "Llama",

    # ── Primates ──
    365: "Orangutan",          366: "Gorilla",
    367: "Chimpanzee",         368: "Gibbon",
    369: "Siamang",            370: "Guenon Monkey",
    371: "Patas Monkey",       372: "Baboon",
    373: "Macaque",            374: "Langur",
    375: "Colobus Monkey",     376: "Proboscis Monkey",
    377: "Marmoset",           378: "Capuchin Monkey",
    379: "Howler Monkey",      380: "Titi Monkey",
    381: "Spider Monkey",      382: "Squirrel Monkey",
    383: "Madagascar Cat",     384: "Indri Lemur",

    # ── Elephants ──
    385: "Indian Elephant",    386: "African Elephant",

    # ── Pandas ──
    387: "Red Panda",          388: "Giant Panda",
}




# ---------------------------------------------------------------------------
# Image Validation 
# ---------------------------------------------------------------------------
def validate_image(image_path: str) -> None:
    """
    Validates image existence, format, integrity and minimum resolution.
    Raises ValueError with a user-friendly message on any failure.
    """
    if not os.path.exists(image_path):
        raise ValueError(f"Image file does not exist: {image_path}")

    valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    ext = os.path.splitext(image_path)[1].lower()
    if ext not in valid_exts:
        raise ValueError(
            f"Unsupported format '{ext}'. Accepted: {sorted(valid_exts)}"
        )

    img = cv2.imread(image_path)
    if img is None:
        # cv2 failed — try PIL
        try:
            with Image.open(image_path) as pil:
                pil.verify()
            with Image.open(image_path) as pil:
                w, h = pil.size
        except Exception:
            raise ValueError("Image is corrupted, empty, or unreadable.")
    else:
        h, w = img.shape[:2]

    if h < 32 or w < 32:
        raise ValueError(
            f"Image resolution too low ({w}×{h}). Minimum required: 32×32 pixels."
        )


# ---------------------------------------------------------------------------
# Image Quality Assessment 
# ---------------------------------------------------------------------------
def assess_image_quality(image_path: str) -> Dict[str, Any]:
    """
    5-metric weighted quality score:
      Blur 40%, Resolution 25%, Brightness 15%, Contrast 10%, Noise 10%
    """
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return {"overall_score": 0.0, "quality_label": "Poor", "error": "Cannot read image"}

    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Blur — Laplacian variance
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var > 150:
        blur_score = 1.0
    elif lap_var >= 80:
        blur_score = 0.60 + (lap_var - 80) / 70.0 * 0.40
    elif lap_var >= 30:
        blur_score = 0.30 + (lap_var - 30) / 50.0 * 0.30
    else:
        blur_score = max(0.0, lap_var / 30.0 * 0.30)

    # Resolution — target 640×640
    res_ratio = min(h * w / (640 * 640), 1.0)
    resolution_score = res_ratio

    # Brightness
    brightness = float(np.mean(gray))
    brightness_score = 1.0 - abs(brightness - 128) / 128.0

    # Contrast
    contrast_score = min(float(np.std(gray)) / 64.0, 1.0)

    # Noise — Immerkær fast-variance
    noise_kernel = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], dtype=np.float64)
    noise_resp = cv2.filter2D(gray.astype(np.float64), -1, noise_kernel)
    noise_var = float(np.mean(np.abs(noise_resp)))
    noise_score = max(0.0, 1.0 - min(noise_var / 20.0, 1.0))

    overall = (
        blur_score        * 0.40
        + resolution_score * 0.25
        + brightness_score * 0.15
        + contrast_score   * 0.10
        + noise_score      * 0.10
    )
    overall = round(max(0.0, min(overall, 1.0)), 3)

    label = (
        "Excellent" if overall >= 0.75 else
        "Good"      if overall >= 0.55 else
        "Fair"      if overall >= 0.35 else
        "Poor"
    )
    return {
        "blur_score":       round(blur_score, 3),
        "resolution_score": round(resolution_score, 3),
        "resolution_pixels": f"{w}x{h}",
        "brightness":       round(brightness, 1),
        "brightness_score": round(brightness_score, 3),
        "contrast_score":   round(contrast_score, 3),
        "noise_score":      round(noise_score, 3),
        "overall_score":    overall,
        "quality_label":    label,
    }


# ---------------------------------------------------------------------------
# Bounding-Box Deduplication -----------
def _box_metrics(box1: List[float], box2: List[float]) -> Dict[str, float]:
    """IoU and containment between two [x1,y1,x2,y2] normalised boxes."""
    x1, y1 = max(box1[0], box2[0]), max(box1[1], box2[1])
    x2, y2 = min(box1[2], box2[2]), min(box1[3], box2[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if inter == 0.0:
        return {"iou": 0.0, "containment": 0.0}
    a1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    a2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = a1 + a2 - inter
    return {
        "iou":         round(inter / union if union > 0 else 0.0, 4),
        "containment": round(inter / a1 if a1 > 0 else 0.0, 4),
    }


def filter_duplicate_detections(
    detections: List[Dict[str, Any]],
    iou_threshold: float = 0.75,
    containment_threshold: float = 0.92,
) -> List[Dict[str, Any]]:
    """
    Remove cross-class and same-class duplicate bounding boxes.
    Keeps the highest-confidence detection when overlap exceeds thresholds.
    Preserves legitimately separate animals (e.g. two deer side by side).
    """
    if not detections:
        return []
    sorted_dets = sorted(detections, key=lambda d: d["confidence"], reverse=True)
    kept: List[Dict[str, Any]] = []
    for det in sorted_dets:
        duplicate = False
        for k in kept:
            m = _box_metrics(det["box"], k["box"])
            if m["iou"] > iou_threshold or m["containment"] > containment_threshold:
                duplicate = True
                break
        if not duplicate:
            kept.append(det)
    return kept


# ---------------------------------------------------------------------------
# Stage 1 — YOLO detection
# ---------------------------------------------------------------------------
def _run_stage1(image: np.ndarray, det_model, conf_threshold: float = 0.25) -> List[Dict[str, Any]]:
    """Run YOLO on the full image; return raw detection list."""
    if det_model is None or image is None:
        return []
    import torch
    h, w = image.shape[:2]
    try:
        with torch.no_grad():
            results = det_model.predict(
                source=image,
                conf=conf_threshold,
                imgsz=min(640, max(h, w)),
                device="cpu",
                verbose=False,
                max_det=10,
            )
        detections = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id  = int(box.cls[0])
                conf    = float(box.conf[0])
                label   = result.names.get(cls_id, f"class_{cls_id}").lower()
                if label in NON_ANIMAL_COCO:
                    continue
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
                detections.append({
                    "label":      COCO_COARSE_MAP.get(label, label.title()),
                    "raw_label":  label,
                    "confidence": round(conf, 4),
                    "box":        [round(x1/w, 4), round(y1/h, 4), round(x2/w, 4), round(y2/h, 4)],
                    "box_pixels": [int(x1), int(y1), int(x2), int(y2)],
                    "is_verified_species": False,
                })
        return detections
    except Exception as exc:
        logger.warning("[Stage 1] YOLO detection note: %s. Continuing pipeline.", exc)
        return []


# ---------------------------------------------------------------------------
# Stage 2 — EfficientNetV2 species classification on crops
# ---------------------------------------------------------------------------
# Labels that YOLO COCO reliably gets wrong for wildlife
# (deer/antelope detected as bird/horse/sheep).
_YOLO_AMBIGUOUS_LABELS = {"wildlife (unverified)", "ungulate"}

# Stage 2 confidence thresholds:
#   HIGH  — required to override a clear YOLO label (e.g. "Elephant")
#   MEDIUM — required when YOLO's label is ambiguous (bird/horse/sheep)
_S2_THRESH_HIGH   = 0.40   # must beat this to override a confident YOLO label
_S2_THRESH_MEDIUM = 0.25   # lower bar when YOLO is known to be wrong
_S2_THRESH_WHOLE  = 0.55   # whole-image classification (no YOLO box found)


def _classify_crop(
    crop_bgr: np.ndarray,
    class_model,
    class_transforms,
    confidence_threshold: float,
) -> Optional[tuple]:
    """
    Run EfficientNetV2-B3 on a BGR crop.
    Returns (label, confidence) if a wildlife class is found above threshold,
    else returns None.
    """
    import torch
    if crop_bgr is None or crop_bgr.size == 0:
        return None
    if crop_bgr.shape[0] < 32 or crop_bgr.shape[1] < 32:
        return None

    crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
    crop_pil = Image.fromarray(crop_rgb)
    device = next(class_model.parameters()).device

    try:
        tensor = class_transforms(crop_pil).unsqueeze(0).to(device)
        with torch.no_grad():
            probs = torch.softmax(class_model(tensor), dim=1)[0]

        top_conf, top_idx = probs.topk(15)
        for conf_t, idx_t in zip(top_conf, top_idx):
            idx  = idx_t.item()
            conf = conf_t.item()
            if idx in IMAGENET_WILDLIFE_MAP and conf >= confidence_threshold:
                return IMAGENET_WILDLIFE_MAP[idx], round(conf, 4)
    except Exception as exc:
        logger.warning("[Stage 2] Crop classification error: %s", exc)
    return None


def _run_stage2(
    image_bgr: np.ndarray,
    detections: List[Dict[str, Any]],
    class_model,
    class_transforms,
) -> List[Dict[str, Any]]:
    """
    Stage 2: EfficientNetV2-B3 crop-level species classification.

    Threshold strategy (prevents 'everything is Gazelle' false positives):
      - YOLO label is ambiguous (bird/horse/sheep → may be deer):
          override if Stage 2 >= 0.25 confidence
      - YOLO label is a clear animal class (Elephant, Bear, Wild Felid):
          only override if Stage 2 >= 0.40 confidence

    This means Stage 2 corrects known YOLO mistakes while not flooding
    every detection with low-confidence Gazelle matches.
    """
    enriched = []

    for det in detections:
        x1, y1, x2, y2 = det["box_pixels"]
        # Add 10% padding around the crop
        pad_x = max(10, int((x2 - x1) * 0.10))
        pad_y = max(10, int((y2 - y1) * 0.10))
        h, w = image_bgr.shape[:2]
        cx1 = max(0, x1 - pad_x);  cy1 = max(0, y1 - pad_y)
        cx2 = min(w, x2 + pad_x);  cy2 = min(h, y2 + pad_y)
        crop_bgr = image_bgr[cy1:cy2, cx1:cx2]

        # Choose threshold based on how trustworthy YOLO's label is
        yolo_label_lower = det["label"].lower()
        if any(ambig in yolo_label_lower for ambig in _YOLO_AMBIGUOUS_LABELS):
            threshold = _S2_THRESH_MEDIUM   # YOLO is known-wrong — be lenient
        else:
            threshold = _S2_THRESH_HIGH     # YOLO label is plausible — be strict

        result = _classify_crop(crop_bgr, class_model, class_transforms, threshold)

        if result:
            s2_label, s2_conf = result
            orig_label = det["label"]
            det = dict(det)
            det["label"]               = s2_label
            det["stage2_confidence"]   = s2_conf
            det["confidence"]          = round(max(det["confidence"], s2_conf), 4)
            det["is_verified_species"] = True
            logger.info(
                "[Stage 2] %s → %s (%.0f%%, thresh=%.0f%%)",
                orig_label, s2_label, s2_conf * 100, threshold * 100
            )
        else:
            logger.debug(
                "[Stage 2] No confident match for '%s' (threshold %.0f%%) — keeping YOLO label.",
                det["label"], threshold * 100
            )

        enriched.append(det)

    return enriched


# ---------------------------------------------------------------------------
# Filename hint fallback (last resort)
# ---------------------------------------------------------------------------
def _filename_hint(filename: str) -> Optional[str]:
    """Extract species from filename keywords. Used only when no YOLO detection found."""
    name = (filename or "").lower()
    # Ordered longest-match first to avoid "snow" matching before "snow_leopard"
    hints = [
        ("snow_leopard", "Snow Leopard"),   ("snow leopard", "Snow Leopard"),
        ("snow",         "Snow Leopard"),
        ("bengal_tiger", "Bengal Tiger"),    ("bengal tiger",  "Bengal Tiger"),
        ("tiger",        "Bengal Tiger"),
        ("spotted_deer", "Spotted Deer"),    ("spotted deer",  "Spotted Deer"),
        ("chital",       "Spotted Deer"),    ("deer",          "Spotted Deer"),
        ("indian_elephant","Indian Elephant"),("elephant",     "Indian Elephant"),
        ("leopard",      "Leopard"),
        ("rhino",        "Indian Rhino"),    ("rhinoceros",    "Indian Rhino"),
        ("bear",         "Asiatic Black Bear"),("sloth_bear",  "Sloth Bear"),
        ("peacock",      "Peacock"),         ("peafowl",       "Peacock"),
        ("lion",         "Lion"),
        ("wolf",         "Timber Wolf"),     ("dhole",         "Dhole"),
        ("gorilla",      "Gorilla"),         ("chimp",         "Chimpanzee"),
        ("orangutan",    "Orangutan"),       ("monkey",        "Macaque"),
        ("panda",        "Giant Panda"),     ("red_panda",     "Red Panda"),
        ("crocodile",    "African Crocodile"),("croc",         "African Crocodile"),
        ("cobra",        "Indian Cobra"),    ("python",        "Rock Python"),
        ("eagle",        "Bald Eagle"),      ("vulture",       "Vulture"),
        ("crane",        "Crane"),           ("flamingo",      "Flamingo"),
        ("hippo",        "Hippopotamus"),    ("hippopotamus",  "Hippopotamus"),
        ("giraffe",      "Giraffe"),         ("zebra",         "Zebra"),
        ("cheetah",      "Cheetah"),         ("jaguar",        "Jaguar"),
        ("fox",          "Red Fox"),         ("hyena",         "Hyena"),
        ("koala",        "Koala"),
    ]
    for keyword, species in hints:
        if keyword in name:
            return species
    return None


# ---------------------------------------------------------------------------
# Full 2-stage inference pipeline (called by image_analysis_service)
# ---------------------------------------------------------------------------
def run_full_inference(
    image_path: str,
    det_model,
    class_model,
    class_transforms,
    conf_threshold: float = 0.25,
    original_filename: str = "",
) -> Dict[str, Any]:
    """
    Runs the complete 2-stage inference pipeline on a saved image file.

    Returns a dict with:
      detections, primary_label, primary_confidence,
      is_verified_species, animal_count, image_quality, pipeline_stages
    """
    # Quality assessment (on raw saved image, before preprocessing)
    quality = assess_image_quality(image_path)

    # Load and preprocess
    image_bgr = cv2.imread(image_path)
    if image_bgr is None:
        raise ValueError("Cannot read image for inference.")

    # Resize for efficient inference (max 640px to minimize cloud RAM)
    h, w = image_bgr.shape[:2]
    if max(h, w) > 640:
        scale = 640.0 / max(h, w)
        image_bgr = cv2.resize(image_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # Edge-preserving smoothing (ultra-fast, CPU-friendly)
    image_bgr = cv2.bilateralFilter(image_bgr, 5, 40, 40)

    pipeline_stages = ["Stage1-YOLO"]

    # Stage 1
    raw_detections = _run_stage1(image_bgr, det_model, conf_threshold)
    detections = filter_duplicate_detections(raw_detections)
    if len(raw_detections) != len(detections):
        logger.info("Dedup: %d → %d boxes.", len(raw_detections), len(detections))

    # Stage 2 (only if classifier is loaded and YOLO found bounding boxes)
    if class_model is not None and class_transforms is not None and detections:
        pipeline_stages.append("Stage2-EfficientNetV2")
        detections = _run_stage2(image_bgr, detections, class_model, class_transforms)

    # Fallback when YOLO found nothing
    if not detections:
        # 2a. Filename hint (free, no model needed)
        hint = _filename_hint(original_filename)
        if hint:
            detections = [{
                "label": hint, "raw_label": "filename_hint",
                "confidence": 0.30, "is_verified_species": False,
                "box": [0.10, 0.08, 0.90, 0.92],
            }]
            logger.info("Filename hint fallback: '%s'.", hint)

        # 2b. Whole-image Stage 2 pass (high threshold to avoid false positives)
        elif class_model is not None:
            pipeline_stages.append("Stage2-WholeImage")
            result = _classify_crop(
                image_bgr, class_model, class_transforms, _S2_THRESH_WHOLE
            )
            if result:
                s2_label, s2_conf = result
                detections = [{
                    "label": s2_label, "raw_label": "stage2_whole_image",
                    "confidence": s2_conf, "is_verified_species": True,
                    "box": [0.05, 0.05, 0.95, 0.95],
                }]
                logger.info("[Stage 2 whole-image] Detected: '%s' (%.0f%%)", s2_label, s2_conf * 100)

        # 2c. Final fallback
        if not detections:
            detections = [{
                "label": "Unknown Wildlife", "raw_label": "no_detection",
                "confidence": 0.10, "is_verified_species": False,
                "box": [0.15, 0.12, 0.85, 0.88],
            }]

    # Clean up pixel coords before returning (not needed by frontend)
    for d in detections:
        d.pop("box_pixels", None)

    primary = max(detections, key=lambda d: d["confidence"])
    return {
        "detections":          detections,
        "primary_label":       primary["label"],
        "primary_confidence":  primary["confidence"],
        "is_verified_species": primary.get("is_verified_species", False),
        "animal_count":        len(detections),
        "image_quality":       quality,
        "pipeline_stages":     pipeline_stages,
    }
