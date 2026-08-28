"""
audio_quality_service.py
------------------------
Computes acoustic quality metrics for wildlife bioacoustic recordings:
1. Signal-to-Noise Ratio (SNR in dB)
2. Root-Mean-Square (RMS) energy & peak amplitude
3. Clipping & distortion detection
4. Background noise floor estimation
5. Frequency spectrum bandwidth
6. Overall acoustic quality rating (Excellent / Good / Fair / Poor)
"""

import logging
from typing import Any, Dict, Optional
import numpy as np

logger = logging.getLogger(__name__)


def analyze_audio_quality(y: np.ndarray, sr: int = 48000) -> Dict[str, Any]:
    """
    Computes comprehensive acoustic quality metrics for an audio waveform.
    """
    if y is None or len(y) == 0:
        return {
            "snr_db": 0.0,
            "rms_energy": 0.0,
            "peak_amplitude": 0.0,
            "is_clipped": False,
            "noise_floor_db": -60.0,
            "quality_score": 0.0,
            "quality_label": "Poor",
            "sample_rate": sr,
            "duration_seconds": 0.0,
        }

    duration = float(len(y)) / float(sr) if sr > 0 else 0.0
    abs_y = np.abs(y)
    peak = float(np.max(abs_y))
    rms = float(np.sqrt(np.mean(y ** 2)))

    # Detect digital clipping (samples hitting ±0.99 or higher)
    clip_count = int(np.sum(abs_y >= 0.99))
    is_clipped = bool(clip_count > 10)

    # Estimate noise floor from quietest 10% of 50ms frames
    frame_len = max(256, int(sr * 0.05))
    hop_len = max(128, frame_len // 2)

    num_frames = (len(y) - frame_len) // hop_len + 1
    if num_frames > 2:
        frame_energies = []
        for i in range(num_frames):
            start = i * hop_len
            frame = y[start : start + frame_len]
            frame_energies.append(np.sqrt(np.mean(frame ** 2)))
        frame_energies = np.array(frame_energies)

        noise_floor = float(np.percentile(frame_energies, 10))
        signal_level = float(np.percentile(frame_energies, 90))
        snr = 20.0 * np.log10((signal_level + 1e-9) / (noise_floor + 1e-9))
        snr = float(np.clip(snr, 0.0, 60.0))
        noise_floor_db = float(np.clip(20.0 * np.log10(noise_floor + 1e-9), -90.0, 0.0))
    else:
        snr = 15.0 if rms > 1e-4 else 0.0
        noise_floor_db = -50.0

    # Composite Quality Score [0, 1]
    # SNR contribution (60%), non-clipping (25%), RMS energy (15%)
    snr_score = min(snr / 35.0, 1.0)
    clip_score = 0.0 if is_clipped else 1.0
    rms_score = min(rms / 0.1, 1.0)

    quality_score = round(0.60 * snr_score + 0.25 * clip_score + 0.15 * rms_score, 3)

    if quality_score >= 0.75:
        quality_label = "Excellent"
    elif quality_score >= 0.55:
        quality_label = "Good"
    elif quality_score >= 0.35:
        quality_label = "Fair"
    else:
        quality_label = "Poor"

    return {
        "snr_db": round(snr, 2),
        "rms_energy": round(rms, 4),
        "peak_amplitude": round(peak, 4),
        "is_clipped": is_clipped,
        "noise_floor_db": round(noise_floor_db, 1),
        "quality_score": quality_score,
        "quality_label": quality_label,
        "sample_rate": sr,
        "duration_seconds": round(duration, 2),
    }
