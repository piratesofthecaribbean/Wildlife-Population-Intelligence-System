"""
Bioacoustic Recognition Engine — Spectral-heuristic pipeline.

Pipeline: Audio Preprocessing (Librosa) → Spectral Feature Extraction
          → Frequency-band heuristic classification → Acoustic Quality Assessment
          → Observation Record

Model availability
------------------
Neither BirdNET nor YAMNet model weights are currently installed in this
environment (infrastructure gap — see model_note in API responses).

* All classification results carry is_verified_species: False.
* model_used strings are "BirdNET-heuristic" and "YAMNet-heuristic"
  (NOT the real BirdNET/YAMNet models) so callers / the UI can surface
  the uncertainty instead of asserting a wrong species confidently.

To enable real model-based classification:
  1. BirdNET: install birdnetlib (pip install birdnetlib) and point
     BIRDNET_MODEL_PATH to the downloaded checkpoint.
  2. YAMNet: install tensorflow_hub and load the published YAMNet SavedModel.
  The code has stub hooks (see _try_birdnet / _try_yamnet below) to make
  the upgrade path clear.
"""

import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

import librosa
import numpy as np
from fastapi import UploadFile

from app.config import settings
from app.data.species_catalog import enrich_detection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Infrastructure-gap note (mirrors image_analysis_service pattern)
# ---------------------------------------------------------------------------
_AUDIO_MODEL_NOTE = (
    "No real BirdNET or YAMNet model weights are installed in this environment. "
    "Classification is performed by a spectral frequency-band heuristic. "
    "All audio detections carry is_verified_species=False and coarse-group labels only "
    "(e.g. 'Bird (unverified)', 'Mammal Vocalization (unverified)'). "
    "To enable accurate species-level audio ID: install birdnetlib and place the "
    "BirdNET checkpoint at the path set by BIRDNET_MODEL_PATH, then restart the service."
)


# ---------------------------------------------------------------------------
# YAMNet-style animal call categories (coarse only — no specific species)
# ---------------------------------------------------------------------------
YAMNET_CATEGORIES = [
    {"label": "Mammal Vocalization (unverified)", "type": "mammal",      "freq_range": (80, 2000)},
    {"label": "Bird (unverified)",                "type": "bird",        "freq_range": (1200, 8000)},
    {"label": "Amphibian Call (unverified)",       "type": "amphibian",  "freq_range": (200, 4000)},
    {"label": "Insect Sound (unverified)",         "type": "insect",     "freq_range": (4000, 12000)},
    {"label": "Environmental Noise (unverified)",  "type": "environment","freq_range": (0, 500)},
]


class BioacousticService:
    @staticmethod
    def save_upload(file: UploadFile) -> Tuple[str, str]:
        os.makedirs(settings.AUDIO_UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.AUDIO_UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            buffer.write(file.file.read())
        return filepath, f"/uploads/audio/{filename}"

    @staticmethod
    def load_audio(filepath: str, duration: float = 30.0) -> Tuple[np.ndarray, int]:
        """Load and trim audio to max duration using Librosa."""
        y, sr = librosa.load(filepath, sr=22050, mono=True, duration=duration)
        return y, sr

    @staticmethod
    def assess_acoustic_quality(y: np.ndarray, sr: int) -> Dict[str, Any]:
        """SNR estimation, recording quality, and noise impact assessment."""
        rms = float(np.sqrt(np.mean(y**2)))
        if rms < 1e-6:
            return {
                "snr_db": 0.0,
                "rms_energy": 0.0,
                "noise_level": "Silent",
                "quality_score": 0.0,
                "quality_label": "Poor",
            }

        # Estimate noise floor from quietest 10% of frames
        frame_length = 2048
        hop = 512
        frames = librosa.util.frame(y, frame_length=frame_length, hop_length=hop)
        frame_rms = np.sqrt(np.mean(frames**2, axis=0))
        noise_floor = float(np.percentile(frame_rms, 10))
        signal_level = float(np.percentile(frame_rms, 90))

        snr = 20 * np.log10((signal_level + 1e-10) / (noise_floor + 1e-10))
        snr = float(np.clip(snr, 0, 60))

        quality_score = min(snr / 40.0, 1.0)
        if quality_score >= 0.75:
            label = "Excellent"
        elif quality_score >= 0.55:
            label = "Good"
        elif quality_score >= 0.35:
            label = "Fair"
        else:
            label = "Poor"

        noise_level = "Low" if snr > 25 else "Moderate" if snr > 15 else "High"

        return {
            "snr_db": round(snr, 2),
            "rms_energy": round(rms, 6),
            "noise_level": noise_level,
            "quality_score": round(quality_score, 3),
            "quality_label": label,
        }

    @staticmethod
    def extract_features(y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract spectral features for classification."""
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        spectral_rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_mean = float(np.mean(mfccs))

        # Dominant frequency via FFT
        fft = np.abs(np.fft.rfft(y))
        freqs = np.fft.rfftfreq(len(y), 1 / sr)
        dominant_freq = float(freqs[np.argmax(fft)])

        return {
            "spectral_centroid": spectral_centroid,
            "spectral_rolloff": spectral_rolloff,
            "zero_crossing_rate": zcr,
            "mfcc_mean": mfcc_mean,
            "dominant_frequency": dominant_freq,
        }

    # -----------------------------------------------------------------------
    # Real-model stubs — upgrade hooks for when model weights are available
    # -----------------------------------------------------------------------

    @staticmethod
    def _try_birdnet(filepath: str) -> Optional[Dict[str, Any]]:
        """
        Attempt real BirdNET classification (requires birdnetlib + model checkpoint).
        Returns None if birdnetlib is not installed or BIRDNET_MODEL_PATH is unset.
        """
        birdnet_path = getattr(settings, "BIRDNET_MODEL_PATH", "")
        if not birdnet_path or not os.path.isfile(birdnet_path):
            return None
        try:
            from birdnetlib import Recording  # noqa: PLC0415
            from birdnetlib.analyzer import Analyzer  # noqa: PLC0415
            analyzer = Analyzer()
            recording = Recording(analyzer, filepath, min_conf=settings.BIRDNET_CONFIDENCE_THRESHOLD)
            recording.analyze()
            if recording.detections:
                top = max(recording.detections, key=lambda d: d["confidence"])
                return {
                    "species_name": top["common_name"],
                    "scientific_name": top.get("scientific_name", ""),
                    "confidence": round(top["confidence"], 3),
                    "detection_type": "bird",
                    "model": "BirdNET",
                    "is_verified_species": True,
                }
        except Exception as exc:
            logger.warning("BirdNET inference failed: %s", exc)
        return None

    @staticmethod
    def _try_yamnet(y: np.ndarray, sr: int) -> Optional[Dict[str, Any]]:
        """
        Attempt real YAMNet classification (requires tensorflow_hub).
        Returns None if tensorflow_hub is not installed.
        """
        try:
            import tensorflow_hub as hub  # noqa: PLC0415
            import tensorflow as tf  # noqa: PLC0415
            model = hub.load("https://tfhub.dev/google/yamnet/1")
            waveform = tf.constant(y, dtype=tf.float32)
            scores, _, _ = model(waveform)
            top_class = int(tf.argmax(scores.numpy().mean(axis=0)))
            # Map to our coarse categories (simplified)
            return {
                "species_name": "Animal Sound (unverified)",
                "scientific_name": "",
                "confidence": round(float(scores.numpy().mean(axis=0)[top_class]), 3),
                "detection_type": "unknown",
                "model": "YAMNet",
                "is_verified_species": True,
            }
        except Exception as exc:
            logger.debug("YAMNet inference skipped: %s", exc)
        return None

    # -----------------------------------------------------------------------
    # Spectral heuristic classification (fallback when no real model is present)
    # -----------------------------------------------------------------------

    @staticmethod
    def _classify_heuristic(features: Dict[str, float]) -> Dict[str, Any]:
        """
        Frequency-band heuristic classification.

        # HEURISTIC_ALGORITHM: dominant-frequency-band matching
        # This is NOT a trained model.  Frequency overlap between species
        # means this heuristic CANNOT reliably identify specific bird species.
        # Output is intentionally restricted to coarse group labels
        # (e.g. "Bird (unverified)") with is_verified_species=False.
        #
        # Replace with _try_birdnet / _try_yamnet for species-level output.
        """
        dom_freq = features["dominant_frequency"]
        centroid = features["spectral_centroid"]
        zcr = features["zero_crossing_rate"]

        best_match = YAMNET_CATEGORIES[0]
        best_score = 0.0

        for cat in YAMNET_CATEGORIES:
            low, high = cat["freq_range"]
            if low <= dom_freq <= high:
                score = 1.0 - abs(dom_freq - (low + high) / 2) / max((high - low) / 2, 1)
            else:
                score = 0.2

            if cat["type"] == "insect" and zcr > 0.15:
                score += 0.3
            if cat["type"] == "mammal" and centroid < 2000:
                score += 0.2
            if cat["type"] == "bird" and centroid > 1500:
                score += 0.2

            if score > best_score:
                best_score = score
                best_match = cat

        # Cap confidence below 0.65 — heuristic cannot be more accurate than this
        confidence = round(min(0.45 + best_score * 0.20, 0.64), 3)

        return {
            "species_name": best_match["label"],
            "scientific_name": f"Unknown {best_match['type']}",
            "confidence": confidence,
            "detection_type": best_match["type"],
            "model": "BirdNET-heuristic" if best_match["type"] == "bird" else "YAMNet-heuristic",
            "is_verified_species": False,
        }

    @staticmethod
    def generate_spectrogram_data(y: np.ndarray, sr: int, n_points: int = 50) -> List[Dict[str, float]]:
        """Generate downsampled spectrogram data for frontend visualization."""
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=32)
        mel_db = librosa.power_to_db(mel, ref=np.max)

        # Downsample time axis for lightweight JSON payload
        step = max(mel_db.shape[1] // n_points, 1)
        points = []
        for t_idx in range(0, mel_db.shape[1], step):
            col = mel_db[:, t_idx]
            points.append({
                "time": round(t_idx * 512 / sr, 2),
                "frequency_energy": round(float(np.mean(col)), 2),
                "peak_freq_bin": int(np.argmax(col)),
            })
        return points[:n_points]

    @staticmethod
    def generate_waveform_data(y: np.ndarray, sr: int, n_points: int = 100) -> List[Dict[str, float]]:
        """Generate downsampled waveform for frontend visualization."""
        step = max(len(y) // n_points, 1)
        return [
            {"time": round(i * step / sr, 3), "amplitude": round(float(y[i]), 5)}
            for i in range(0, len(y), step)
        ][:n_points]

    @staticmethod
    def analyze_audio(file: UploadFile) -> Dict[str, Any]:
        """
        Full bioacoustic pipeline:
        Preprocess → try real BirdNET → try real YAMNet → spectral heuristic fallback
        → Quality → Observation Record
        """
        filepath, public_path = BioacousticService.save_upload(file)
        y, sr = BioacousticService.load_audio(filepath)
        quality = BioacousticService.assess_acoustic_quality(y, sr)
        features = BioacousticService.extract_features(y, sr)

        # 1. Try real BirdNET first (returns None if weights not installed)
        classification = BioacousticService._try_birdnet(filepath)

        # 2. Try real YAMNet (returns None if tensorflow_hub not installed)
        if classification is None:
            classification = BioacousticService._try_yamnet(y, sr)

        # 3. Fall back to spectral heuristic
        is_heuristic = classification is None
        if is_heuristic:
            classification = BioacousticService._classify_heuristic(features)
            logger.info(
                "Audio classification: using spectral heuristic (no real BirdNET/YAMNet model). "
                "Result is coarse/unverified — is_verified_species=False."
            )

        # model_note: None when a real model ran; explanatory string for heuristic fallback
        model_note = _AUDIO_MODEL_NOTE if is_heuristic else None
        is_verified = classification.get("is_verified_species", False)

        species_info = enrich_detection(
            classification["species_name"],
            classification["confidence"],
        )

        duration = round(len(y) / sr, 2)
        events = [{
            "species": classification["species_name"],
            "confidence": classification["confidence"],
            "start_time": 0.0,
            "end_time": duration,
            "model": classification["model"],
            "is_verified_species": is_verified,
        }]

        return {
            "species_name": species_info["common_name"],
            "scientific_name": species_info["scientific_name"],
            "confidence": classification["confidence"],
            "is_verified_species": is_verified,
            "audio_path": public_path,
            "duration_seconds": duration,
            "detection_type": classification["detection_type"],
            "model_used": classification["model"],
            "model_note": model_note,
            "acoustic_quality": quality,
            "acoustic_features": features,
            "events_json": json.dumps(events),
            "events": events,
            "waveform": BioacousticService.generate_waveform_data(y, sr),
            "spectrogram": BioacousticService.generate_spectrogram_data(y, sr),
            "taxonomy": {
                "class": species_info["taxonomic_class"],
                "order": species_info["taxonomic_order"],
                "family": species_info["family"],
            },
            "conservation_status": species_info["conservation_status"],
            "iucn_label": species_info["iucn_label"],
            "is_endangered": species_info.get("is_endangered", False),
            "source_type": "audio",
        }
