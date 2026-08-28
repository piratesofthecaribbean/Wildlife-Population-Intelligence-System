"""
bioacoustic_service.py
-----------------------
Bioacoustic Recognition Service — orchestrates real BirdNET + YAMNet AI pipeline.

Pipeline:
  1. Audio Ingestion & Storage (Save Upload)
  2. Audio Quality Analysis (SNR in dB, RMS Energy, Noise Floor, Clipping)
  3. BirdNET Global 6K v2.4 (Cornell Lab Avian & Wildlife TFLite inference)
  4. Google YAMNet AudioSet (Mammal Vocalizations, Amphibian Choruses, Acoustic Threats)
  5. Taxonomy & IUCN Conservation Status Resolution
  6. Spectral Waveform & Spectrogram Generation for Visualizer
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
from app.services.ai.audio_inference_service import run_full_audio_inference

logger = logging.getLogger(__name__)


class BioacousticService:

    @staticmethod
    def save_upload(file: UploadFile) -> Tuple[str, str]:
        """Save uploaded audio file to disk and return (absolute_path, public_path)."""
        os.makedirs(settings.AUDIO_UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.AUDIO_UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            buffer.write(file.file.read())
        return filepath, f"/uploads/audio/{filename}"

    @staticmethod
    def load_audio(filepath: str, duration: float = 30.0) -> Tuple[np.ndarray, int]:
        """Load and resample audio using Librosa."""
        y, sr = librosa.load(filepath, sr=48000, mono=True, duration=duration)
        return y, sr

    @staticmethod
    def generate_waveform_data(y: np.ndarray, sr: int, n_points: int = 100) -> List[Dict[str, Any]]:
        """Generate downsampled waveform points for frontend AreaChart visualization."""
        if y is None or len(y) == 0:
            return []
        step = max(len(y) // n_points, 1)
        return [
            {
                "time": f"{round(i / float(sr), 1)}s",
                "amp": round(float(np.abs(y[i])) * 100.0, 1),
                "amplitude": round(float(y[i]), 5),
            }
            for i in range(0, len(y), step)
        ][:n_points]

    @staticmethod
    def generate_spectrogram_data(y: np.ndarray, sr: int, n_mels: int = 32, n_time_steps: int = 40) -> List[List[float]]:
        """Generate mel-spectrogram energy matrix for frontend visualization."""
        if y is None or len(y) == 0:
            return []
        try:
            S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels, fmax=sr // 2)
            S_dB = librosa.power_to_db(S, ref=np.max)
            # Normalize to [0, 1]
            S_norm = (S_dB - S_dB.min()) / (S_dB.max() - S_dB.min() + 1e-6)
            # Downsample in time dimension
            step = max(S_norm.shape[1] // n_time_steps, 1)
            spectrogram = [
                [round(float(val), 3) for val in S_norm[:, t]]
                for t in range(0, S_norm.shape[1], step)
            ][:n_time_steps]
            return spectrogram
        except Exception as exc:
            logger.warning("Spectrogram calculation error: %s", exc)
            return []

    @staticmethod
    def analyze_audio(file: UploadFile) -> Dict[str, Any]:
        """
        Executes the full bioacoustic pipeline:
        1. Saves audio file.
        2. Runs BirdNET + YAMNet multi-model inference.
        3. Generates waveform & spectrogram visualizer data.
        4. Returns comprehensive, structured bioacoustic observation record.
        """
        filepath, public_path = BioacousticService.save_upload(file)

        # 1. Run real inference via AI pipeline
        res = run_full_audio_inference(filepath)

        # 2. Compute Waveform & Spectrogram for Frontend charts
        try:
            y, sr = BioacousticService.load_audio(filepath)
            waveform = BioacousticService.generate_waveform_data(y, sr)
            spectrogram = BioacousticService.generate_spectrogram_data(y, sr)
        except Exception as exc:
            logger.warning("Failed to extract visual waveform: %s", exc)
            waveform = res.get("waveform", [])
            spectrogram = []

        return {
            "species_name": res["species_name"],
            "scientific_name": res.get("scientific_name"),
            "confidence": res["confidence"],
            "is_verified_species": res.get("is_verified_species", False),
            "audio_path": public_path,
            "duration_seconds": res.get("duration_seconds", 0.0),
            "detection_type": res.get("vocalization_type", "Acoustic Vocalization"),
            "vocalization_type": res.get("vocalization_type", "Acoustic Vocalization"),
            "model_used": res.get("model_used"),
            "acoustic_quality": res.get("acoustic_quality", {}),
            "events_json": json.dumps(res.get("events", [])),
            "events": res.get("events", []),
            "waveform": waveform,
            "spectrogram": spectrogram,
            "taxonomy": res.get("taxonomy", {}),
            "conservation_status": res.get("conservation_status", "LC"),
            "iucn_label": res.get("iucn_label", "Least Concern"),
            "iucn_description": res.get("iucn_description", ""),
            "is_endangered": res.get("is_endangered", False),
            "source_type": "audio",
        }
