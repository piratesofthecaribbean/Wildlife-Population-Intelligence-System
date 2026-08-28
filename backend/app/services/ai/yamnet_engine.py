"""
yamnet_engine.py
----------------
Google YAMNet Bioacoustic & Environmental Audio Classifier.
AudioSet ontology with 521 acoustic event classes.

Runs official Google YAMNet TFLite model:
- Input: 15,600 float32 samples at 16,000 Hz (0.975-second frames).
- Output: 521 AudioSet class probabilities per frame.
- Auto-downloads model & labels from Hugging Face on first execution.
"""

import logging
import os
import urllib.request
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Model storage directory
MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "yamnet")
)
MODEL_PATH = os.path.join(MODEL_DIR, "yamnet.tflite")
LABELS_PATH = os.path.join(MODEL_DIR, "yamnet_labels.txt")

MODEL_URL = "https://huggingface.co/thelou1s/yamnet/resolve/main/lite-model_yamnet_classification_tflite_1.tflite"
LABELS_URL = "https://huggingface.co/thelou1s/yamnet/resolve/main/labels_yamnet.txt"

SAMPLE_RATE = 16000
FRAME_SAMPLES = 15600  # 0.975s at 16kHz

# Curated AudioSet classes relevant to wildlife monitoring & acoustics
WILDLIFE_AUDIOSET_MAP: Dict[str, Dict[str, str]] = {
    # ── Mammals ──
    "Animal":                  {"category": "Mammal", "common_name": "Wild Mammal Vocalization"},
    "Domestic animals, pets":  {"category": "Mammal", "common_name": "Mammal Call"},
    "Dog":                     {"category": "Mammal", "common_name": "Canid Call / Bark"},
    "Bark":                    {"category": "Mammal", "common_name": "Wild Canid Alarm Call"},
    "Howl":                    {"category": "Mammal", "common_name": "Wolf / Dhole Howl"},
    "Growling":                {"category": "Mammal", "common_name": "Big Cat / Predator Growl"},
    "Roaring cats (lions, tigers)": {"category": "Mammal", "common_name": "Tiger / Lion Roar"},
    "Roar":                    {"category": "Mammal", "common_name": "Apex Predator Roar"},
    "Cat":                     {"category": "Mammal", "common_name": "Felid Vocalization"},
    "Purr":                    {"category": "Mammal", "common_name": "Felid Call"},
    "Cattle, bovinae":         {"category": "Mammal", "common_name": "Wild Bovid / Bison Vocalization"},
    "Moo":                     {"category": "Mammal", "common_name": "Ungulate Call"},
    "Pig":                     {"category": "Mammal", "common_name": "Wild Boar Grunt"},
    "Grunt":                   {"category": "Mammal", "common_name": "Wild Boar / Deer Grunt"},
    "Horse":                   {"category": "Mammal", "common_name": "Wild Equid Call"},
    "Neigh, whinny":           {"category": "Mammal", "common_name": "Wild Equid Neigh"},
    "Bleat":                   {"category": "Mammal", "common_name": "Mountain Goat / Ibex Bleat"},
    "Frog":                    {"category": "Amphibian", "common_name": "Amphibian Chorus"},
    "Croak":                   {"category": "Amphibian", "common_name": "Tree Frog Croak"},
    "Toad":                    {"category": "Amphibian", "common_name": "Toad Call"},
    "Insect":                  {"category": "Insect", "common_name": "Forest Insect Stridulation"},
    "Cricket":                 {"category": "Insect", "common_name": "Cricket Chirp"},
    "Cicada":                  {"category": "Insect", "common_name": "Cicada Chorus"},
    "Bee, wasp, etc.":         {"category": "Insect", "common_name": "Wild Bee / Pollinator Buzz"},
    "Bird":                    {"category": "Bird", "common_name": "Avian Vocalization"},
    "Bird vocalization, bird call, bird song": {"category": "Bird", "common_name": "Wild Bird Song"},
    "Chirp, tweet":            {"category": "Bird", "common_name": "Bird Chirp"},
    "Squawk":                  {"category": "Bird", "common_name": "Peafowl / Parrot Squawk"},
    "Caw":                     {"category": "Bird", "common_name": "Corvid / Forest Bird Call"},
    "Owl":                     {"category": "Bird", "common_name": "Nocturnal Owl Hoot"},
    "Hoot":                    {"category": "Bird", "common_name": "Great Grey Owl Hoot"},
    "Crow":                    {"category": "Bird", "common_name": "Jungle Crow Call"},
    "Gull, seagull":           {"category": "Bird", "common_name": "Wetland Bird Call"},
    "Water":                   {"category": "Environment", "common_name": "Stream / River Flow"},
    "Rain":                    {"category": "Environment", "common_name": "Rainfall in Canopy"},
    "Wind":                    {"category": "Environment", "common_name": "Canopy Wind Gust"},
    "Thunderstorm":            {"category": "Environment", "common_name": "Thunderstorm"},
    "Gunshot, gunfire":        {"category": "Threat", "common_name": "Poaching Alert: Gunshot Detected"},
    "Chainsaw":                {"category": "Threat", "common_name": "Illegal Logging: Chainsaw Sound"},
    "Vehicle":                 {"category": "Human Activity", "common_name": "Motor Vehicle in Reserve"},
}

_yamnet_interpreter = None
_yamnet_labels: List[str] = []


def _get_tflite_interpreter_class():
    try:
        from ai_edge_litert.interpreter import Interpreter
        return Interpreter
    except ImportError:
        try:
            from tflite_runtime.interpreter import Interpreter
            return Interpreter
        except ImportError:
            try:
                import tensorflow as tf
                return tf.lite.Interpreter
            except ImportError:
                return None


def ensure_yamnet_weights() -> bool:
    """Ensure YAMNet model weights and label files exist locally."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    headers = {"User-Agent": "Mozilla/5.0"}

    if not os.path.exists(LABELS_PATH) or os.path.getsize(LABELS_PATH) < 1000:
        logger.info("[YAMNet] Downloading labels from Hugging Face...")
        req = urllib.request.Request(LABELS_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp, open(LABELS_PATH, "wb") as f:
            f.write(resp.read())
        logger.info("[YAMNet] Labels downloaded (%d bytes).", os.path.getsize(LABELS_PATH))

    if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 100000:
        logger.info("[YAMNet] Downloading YAMNet TFLite model (~4MB)...")
        req = urllib.request.Request(MODEL_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp, open(MODEL_PATH, "wb") as f:
            f.write(resp.read())
        logger.info("[YAMNet] Model downloaded (%d bytes).", os.path.getsize(MODEL_PATH))

    return os.path.exists(MODEL_PATH) and os.path.exists(LABELS_PATH)


def load_yamnet_labels() -> List[str]:
    """Parse YAMNet label file into a list of class strings."""
    global _yamnet_labels
    if _yamnet_labels:
        return _yamnet_labels

    if not os.path.exists(LABELS_PATH):
        ensure_yamnet_weights()

    labels = []
    if os.path.exists(LABELS_PATH):
        try:
            import json
            with open(LABELS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            # data is {"0": "Speech", "1": "Child speech", ...}
            labels = [data[str(i)] for i in range(len(data))]
        except Exception:
            with open(LABELS_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip().strip(",").strip('"')
                    if ":" in line:
                        parts = line.split(":", 1)
                        labels.append(parts[1].strip().strip('"'))
                    elif line and not line.startswith("{") and not line.startswith("}"):
                        labels.append(line)
    _yamnet_labels = labels
    return _yamnet_labels


def get_yamnet_interpreter():
    """Singleton loader for the YAMNet TFLite interpreter."""
    global _yamnet_interpreter
    if _yamnet_interpreter is not None:
        return _yamnet_interpreter

    Interpreter = _get_tflite_interpreter_class()
    if Interpreter is None:
        logger.warning("[YAMNet] No TFLite runtime available.")
        return None

    if not os.path.exists(MODEL_PATH):
        try:
            ensure_yamnet_weights()
        except Exception as exc:
            logger.error("[YAMNet] Failed to download model: %s", exc)
            return None

    try:
        interp = Interpreter(model_path=MODEL_PATH)
        interp.allocate_tensors()
        _yamnet_interpreter = interp
        logger.info("[YAMNet] Loaded Google YAMNet TFLite model successfully.")
        return _yamnet_interpreter
    except Exception as exc:
        logger.error("[YAMNet] Failed to load interpreter: %s", exc)
        return None


def run_yamnet_inference(y: np.ndarray, sr: int = 16000, min_confidence: float = 0.15) -> Dict[str, Any]:
    """
    Runs YAMNet inference across 0.975-second audio frames.
    """
    interp = get_yamnet_interpreter()
    labels = load_yamnet_labels()

    if interp is None or not labels:
        return {
            "model_used": "YAMNet (unavailable)",
            "detections": [],
            "top_category": None,
            "top_label": None,
            "top_confidence": 0.0,
        }

    import librosa
    # Resample to 16000 Hz if needed
    if sr != SAMPLE_RATE:
        y = librosa.resample(y, orig_sr=sr, target_sr=SAMPLE_RATE)
        sr = SAMPLE_RATE

    total_samples = len(y)
    in_idx = interp.get_input_details()[0]["index"]
    out_idx = interp.get_output_details()[0]["index"]

    hop_samples = FRAME_SAMPLES // 2  # 50% overlap (~0.48s hop)
    frames = []
    times = []

    if total_samples <= FRAME_SAMPLES:
        padded = np.zeros(FRAME_SAMPLES, dtype=np.float32)
        padded[:total_samples] = y
        frames.append(padded)
        times.append((0.0, round(total_samples / float(SAMPLE_RATE), 2)))
    else:
        start = 0
        while start < total_samples:
            end = start + FRAME_SAMPLES
            if end <= total_samples:
                frame = y[start:end]
            else:
                frame = np.zeros(FRAME_SAMPLES, dtype=np.float32)
                frame[: total_samples - start] = y[start:]
            frames.append(frame)
            times.append((round(start / float(SAMPLE_RATE), 2), round(min(end, total_samples) / float(SAMPLE_RATE), 2)))
            start += hop_samples

    all_detections: List[Dict[str, Any]] = []
    class_max_scores: Dict[str, float] = {}

    for frame, (t_start, t_end) in zip(frames, times):
        frame_input = frame.astype(np.float32)
        interp.set_tensor(in_idx, frame_input)
        interp.invoke()
        output = interp.get_tensor(out_idx)
        # Output shape is typically (1, 521)
        probs = output[0] if len(output.shape) == 2 else output

        top_indices = np.argsort(probs)[::-1][:5]
        for idx in top_indices:
            conf = float(probs[idx])
            if conf >= min_confidence and idx < len(labels):
                raw_label = labels[idx]
                mapping = WILDLIFE_AUDIOSET_MAP.get(raw_label, {"category": "Other Sound", "common_name": raw_label})
                all_detections.append({
                    "raw_label": raw_label,
                    "species_name": mapping["common_name"],
                    "category": mapping["category"],
                    "confidence": round(conf, 4),
                    "start_time": t_start,
                    "end_time": t_end,
                })
                if raw_label not in class_max_scores or conf > class_max_scores[raw_label]:
                    class_max_scores[raw_label] = conf

    # Sort detections by confidence
    all_detections.sort(key=lambda d: d["confidence"], reverse=True)

    if class_max_scores:
        best_raw = max(class_max_scores, key=class_max_scores.get)
        best_mapping = WILDLIFE_AUDIOSET_MAP.get(best_raw, {"category": "General Audio", "common_name": best_raw})
        best_conf = class_max_scores[best_raw]
    else:
        best_raw = None
        best_mapping = {"category": None, "common_name": None}
        best_conf = 0.0

    return {
        "model_used": "Google YAMNet (AudioSet TFLite)",
        "detections": all_detections[:10],
        "top_label": best_mapping["common_name"],
        "top_category": best_mapping["category"],
        "raw_audioset_class": best_raw,
        "top_confidence": round(best_conf, 4),
        "total_frames_analyzed": len(frames),
    }
