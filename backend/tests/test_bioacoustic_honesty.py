"""
Tests for BioacousticService — real BirdNET + YAMNet bioacoustic pipeline tests.
"""

import os
import unittest
import numpy as np
import soundfile as sf
import tempfile

from app.services.ai.audio_quality_service import analyze_audio_quality
from app.services.ai.birdnet_engine import load_birdnet_labels, run_birdnet_inference
from app.services.ai.yamnet_engine import load_yamnet_labels, run_yamnet_inference
from app.services.ai.audio_inference_service import run_full_audio_inference
from app.services.bioacoustic_service import BioacousticService


class TestBioacousticPipeline(unittest.TestCase):
    """Unit tests for the bioacoustic intelligence pipeline."""

    def test_birdnet_labels_loaded(self):
        """BirdNET labels file contains over 6,000 species."""
        labels = load_birdnet_labels()
        self.assertGreater(len(labels), 6000)

    def test_yamnet_labels_loaded(self):
        """YAMNet labels file contains 521 AudioSet acoustic classes."""
        labels = load_yamnet_labels()
        self.assertEqual(len(labels), 521)

    def test_audio_quality_analysis(self):
        """Acoustic quality service computes valid SNR and energy metrics."""
        sr = 48000
        t = np.linspace(0, 1.0, sr)
        audio = 0.5 * np.sin(2 * np.pi * 1000 * t).astype(np.float32)

        quality = analyze_audio_quality(audio, sr=sr)
        self.assertIn("snr_db", quality)
        self.assertIn("quality_score", quality)
        self.assertIn("quality_label", quality)
        self.assertFalse(quality["is_clipped"])

    def test_waveform_data_generation(self):
        """Waveform downsampler generates points for UI charts."""
        sr = 48000
        audio = np.random.randn(sr * 2).astype(np.float32)
        waveform = BioacousticService.generate_waveform_data(audio, sr, n_points=50)
        self.assertEqual(len(waveform), 50)
        self.assertIn("time", waveform[0])
        self.assertIn("amp", waveform[0])

    def test_full_audio_inference(self):
        """Full bioacoustic inference runs on a WAV file and produces structured output."""
        sr = 48000
        t = np.linspace(0, 3.0, sr * 3)
        audio = 0.3 * np.sin(2 * np.pi * 3000 * t).astype(np.float32)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            sf.write(f.name, audio, sr)
            temp_path = f.name

        try:
            res = run_full_audio_inference(temp_path)
            self.assertIn("species_name", res)
            self.assertIn("confidence", res)
            self.assertIn("model_used", res)
            self.assertIn("acoustic_quality", res)
            self.assertIn("waveform", res)
            self.assertGreaterEqual(res["confidence"], 0.0)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)


if __name__ == "__main__":
    unittest.main()
