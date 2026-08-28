"""
birdnet_engine.py
-----------------
BirdNET Bioacoustic Recognition Engine.
Cornell Lab of Ornithology BirdNET v2.4 (6,522 global wildlife & avian species).

Runs official BirdNET TFLite model:
- Input: 3.0-second audio segments at 48,000 Hz (144,000 float32 samples).
- Output: 6,522 species sigmoid probabilities.
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
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "birdnet")
)
MODEL_PATH = os.path.join(MODEL_DIR, "BirdNET_GLOBAL_6K_V2.4_Model_FP32.tflite")
LABELS_PATH = os.path.join(MODEL_DIR, "BirdNET_GLOBAL_6K_V2.4_Labels.txt")

MODEL_URL = "https://huggingface.co/justinchuby/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP32.tflite"
LABELS_URL = "https://huggingface.co/justinchuby/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Labels.txt"

SAMPLE_RATE = 48000
CHUNK_DURATION = 3.0
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION)  # 144,000

_birdnet_interpreter = None
_birdnet_labels: List[Tuple[str, str]] = []  # List of (Scientific Name, Common Name)


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


def ensure_birdnet_model_downloaded() -> bool:
    """Ensure BirdNET model weights and label files exist locally."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    headers = {"User-Agent": "Mozilla/5.0"}

    if not os.path.exists(LABELS_PATH) or os.path.getsize(LABELS_PATH) < 1000:
        logger.info("[BirdNET] Downloading labels from Hugging Face...")
        req = urllib.request.Request(LABELS_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp, open(LABELS_PATH, "wb") as f:
            f.write(resp.read())
        logger.info("[BirdNET] Labels downloaded (%d bytes).", os.path.getsize(LABELS_PATH))

    if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 1000000:
        logger.info("[BirdNET] Downloading BirdNET v2.4 TFLite model (~50MB)...")
        req = urllib.request.Request(MODEL_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=120) as resp, open(MODEL_PATH, "wb") as f:
            f.write(resp.read())
        logger.info("[BirdNET] Model downloaded (%d bytes).", os.path.getsize(MODEL_PATH))

    return os.path.exists(MODEL_PATH) and os.path.exists(LABELS_PATH)


def load_birdnet_labels() -> List[Tuple[str, str]]:
    """Parse BirdNET label file into (scientific_name, common_name)."""
    global _birdnet_labels
    if _birdnet_labels:
        return _birdnet_labels

    if not os.path.exists(LABELS_PATH):
        ensure_birdnet_model_downloaded()

    labels = []
    if os.path.exists(LABELS_PATH):
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if "_" in line:
                    parts = line.split("_", 1)
                    sci = parts[0].strip()
                    common = parts[1].strip()
                else:
                    sci = line
                    common = line
                labels.append((sci, common))
    _birdnet_labels = labels
    return _birdnet_labels


def get_birdnet_interpreter():
    """Singleton loader for the BirdNET TFLite interpreter."""
    global _birdnet_interpreter
    if _birdnet_interpreter is not None:
        return _birdnet_interpreter

    Interpreter = _get_tflite_interpreter_class()
    if Interpreter is None:
        logger.warning("[BirdNET] No TFLite runtime available (ai-edge-litert, tflite-runtime, or tensorflow).")
        return None

    if not os.path.exists(MODEL_PATH):
        try:
            ensure_birdnet_model_downloaded()
        except Exception as exc:
            logger.error("[BirdNET] Failed to download model: %s", exc)
            return None

    try:
        interp = Interpreter(model_path=MODEL_PATH)
        interp.allocate_tensors()
        _birdnet_interpreter = interp
        logger.info("[BirdNET] Loaded BirdNET v2.4 TFLite model successfully.")
        return _birdnet_interpreter
    except Exception as exc:
        logger.error("[BirdNET] Failed to load interpreter: %s", exc)
        return None


def run_birdnet_inference(y: np.ndarray, sr: int = 48000, min_confidence: float = 0.25) -> Dict[str, Any]:
    """
    Runs BirdNET inference across 3-second sliding window audio segments.
    """
    interp = get_birdnet_interpreter()
    labels = load_birdnet_labels()

    if interp is None or not labels:
        return {
            "model_used": "BirdNET (unavailable)",
            "detections": [],
            "top_species": None,
            "top_scientific": None,
            "top_confidence": 0.0,
        }

    import librosa
    # Resample to 48000 Hz if needed
    if sr != SAMPLE_RATE:
        y = librosa.resample(y, orig_sr=sr, target_sr=SAMPLE_RATE)
        sr = SAMPLE_RATE

    total_samples = len(y)
    duration = total_samples / float(SAMPLE_RATE)

    in_idx = interp.get_input_details()[0]["index"]
    out_idx = interp.get_output_details()[0]["index"]

    # Generate 3-second chunks (with 1.5s overlap for smooth coverage)
    hop_samples = CHUNK_SAMPLES // 2  # 1.5s hop
    chunks = []
    times = []

    if total_samples <= CHUNK_SAMPLES:
        # Pad short audio to 3.0 seconds
        padded = np.zeros(CHUNK_SAMPLES, dtype=np.float32)
        padded[:total_samples] = y
        chunks.append(padded)
        times.append((0.0, duration))
    else:
        start = 0
        while start < total_samples:
            end = start + CHUNK_SAMPLES
            if end <= total_samples:
                chunk = y[start:end]
            else:
                chunk = np.zeros(CHUNK_SAMPLES, dtype=np.float32)
                chunk[: total_samples - start] = y[start:]
            chunks.append(chunk)
            times.append((round(start / float(SAMPLE_RATE), 2), round(min(end, total_samples) / float(SAMPLE_RATE), 2)))
            start += hop_samples

    all_detections: List[Dict[str, Any]] = []
    species_scores: Dict[str, Tuple[str, float]] = {}  # common -> (scientific, max_conf)

    for chunk, (t_start, t_end) in zip(chunks, times):
        chunk_input = chunk.reshape(1, CHUNK_SAMPLES).astype(np.float32)
        interp.set_tensor(in_idx, chunk_input)
        interp.invoke()
        raw_output = interp.get_tensor(out_idx)[0]

        # Apply sigmoid if model outputs logits
        if np.min(raw_output) < 0.0:
            probs = 1.0 / (1.0 + np.exp(-np.clip(raw_output, -20.0, 20.0)))
        else:
            probs = raw_output

        top_indices = np.argsort(probs)[::-1][:5]
        for idx in top_indices:
            conf = float(probs[idx])
            if conf >= min_confidence and idx < len(labels):
                sci, common = labels[idx]
                all_detections.append({
                    "species_name": common,
                    "scientific_name": sci,
                    "confidence": round(conf, 4),
                    "start_time": t_start,
                    "end_time": t_end,
                })
                if common not in species_scores or conf > species_scores[common][1]:
                    species_scores[common] = (sci, conf)

    # Sort all detections by confidence
    all_detections.sort(key=lambda d: d["confidence"], reverse=True)

    if species_scores:
        best_common = max(species_scores, key=lambda k: species_scores[k][1])
        best_sci, best_conf = species_scores[best_common]
    else:
        best_common = None
        best_sci = None
        best_conf = 0.0

    return {
        "model_used": "BirdNET Global 6K v2.4 (TFLite)",
        "detections": all_detections[:10],
        "top_species": best_common,
        "top_scientific": best_sci,
        "top_confidence": round(best_conf, 4),
        "total_segments_analyzed": len(chunks),
    }
