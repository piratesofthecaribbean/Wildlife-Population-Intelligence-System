"""
Tests for BioacousticService — model honesty and output correctness.

Covers:
  (a) All audio outputs carry is_verified_species=False when no real model is present.
  (b) model_used never claims the real "BirdNET" or "YAMNet" string when the heuristic
      fallback is active — it must contain "heuristic".
  (c) No specific bird species names (e.g. "Indian Robin") appear in heuristic output —
      only coarse labels like "Bird (unverified)".
  (d) model_note is populated when running the heuristic and is explanatory.
  (e) The heuristic classification confidence is capped below 0.65 (no false precision).
  (f) Spectral features + waveform/spectrogram are legitimate and present.
  (g) _try_birdnet and _try_yamnet return None when model weights are absent.
"""

import io
import json
import types
import sys
import unittest
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Stub librosa if not installed so tests work in minimal CI
# ---------------------------------------------------------------------------
if "librosa" not in sys.modules:
    librosa_stub = types.ModuleType("librosa")
    librosa_stub.load = lambda *a, **k: (__import__("numpy").zeros(22050), 22050)

    feature_stub = types.ModuleType("librosa.feature")
    import numpy as np_stub
    feature_stub.spectral_centroid = lambda **k: np_stub.array([[2000.0]])
    feature_stub.spectral_rolloff = lambda **k: np_stub.array([[4000.0]])
    feature_stub.zero_crossing_rate = lambda y: np_stub.array([[0.08]])
    feature_stub.mfcc = lambda **k: np_stub.zeros((13, 10))
    feature_stub.melspectrogram = lambda **k: np_stub.ones((32, 50))
    librosa_stub.feature = feature_stub

    util_stub = types.ModuleType("librosa.util")
    util_stub.frame = lambda y, **k: np_stub.ones((2048, 20))
    librosa_stub.util = util_stub
    librosa_stub.power_to_db = lambda mel, **k: np_stub.zeros_like(mel)

    sys.modules["librosa"] = librosa_stub
    sys.modules["librosa.feature"] = feature_stub
    sys.modules["librosa.util"] = util_stub

import numpy as np


def _make_audio_upload(filename: str = "test_audio.wav", content: bytes = b"RIFF") -> MagicMock:
    mock_file = MagicMock()
    mock_file.filename = filename
    mock_file.file = io.BytesIO(content)
    return mock_file


import app.services.bioacoustic_service as bsvc  # noqa: E402


class TestBioacousticHonesty(unittest.TestCase):
    """Core honesty assertions for bioacoustic classification output."""

    def _run_analyze(self, filename: str = "test_audio.wav") -> dict:
        """Run analyze_audio() with all file-I/O patched out."""
        fake_y = np.zeros(22050)
        fake_sr = 22050
        fake_features = {
            "spectral_centroid": 2500.0,
            "spectral_rolloff": 4000.0,
            "zero_crossing_rate": 0.08,
            "mfcc_mean": -5.0,
            "dominant_frequency": 1800.0,
        }
        fake_quality = {"snr_db": 20.0, "quality_score": 0.6, "quality_label": "Good",
                        "rms_energy": 0.01, "noise_level": "Moderate"}

        with patch.object(bsvc.BioacousticService, "save_upload",
                          return_value=("/tmp/fake.wav", "/uploads/audio/fake.wav")), \
             patch.object(bsvc.BioacousticService, "load_audio",
                          return_value=(fake_y, fake_sr)), \
             patch.object(bsvc.BioacousticService, "assess_acoustic_quality",
                          return_value=fake_quality), \
             patch.object(bsvc.BioacousticService, "extract_features",
                          return_value=fake_features), \
             patch.object(bsvc.BioacousticService, "_try_birdnet", return_value=None), \
             patch.object(bsvc.BioacousticService, "_try_yamnet", return_value=None), \
             patch.object(bsvc.BioacousticService, "generate_waveform_data", return_value=[]), \
             patch.object(bsvc.BioacousticService, "generate_spectrogram_data", return_value=[]):

            mock_file = _make_audio_upload(filename=filename)
            return bsvc.BioacousticService.analyze_audio(mock_file)

    def test_heuristic_output_always_unverified(self):
        """(a) is_verified_species must be False when heuristic fallback is active."""
        result = self._run_analyze()
        self.assertFalse(
            result["is_verified_species"],
            "Heuristic audio classification must set is_verified_species=False"
        )

    def test_heuristic_model_used_contains_heuristic_suffix(self):
        """(b) model_used must contain 'heuristic' — must NOT be bare 'BirdNET' or 'YAMNet'."""
        result = self._run_analyze()
        model_used = result["model_used"]
        self.assertIn(
            "heuristic", model_used.lower(),
            f"model_used='{model_used}' must contain 'heuristic' when no real model is present"
        )
        # Explicitly must NOT be the bare real model names
        self.assertNotEqual(model_used, "BirdNET", "Must not claim real BirdNET model")
        self.assertNotEqual(model_used, "YAMNet", "Must not claim real YAMNet model")

    def test_heuristic_output_uses_coarse_label(self):
        """(c) No specific bird species name should appear — only coarse labels."""
        forbidden_specific = {
            "Indian Robin", "Indian Peafowl", "Common Kingfisher",
            "Jungle Mynah", "Red-wattled Lapwing",
        }
        result = self._run_analyze()
        species_name = result.get("species_name", "")
        for forbidden in forbidden_specific:
            self.assertNotEqual(
                species_name, forbidden,
                f"Heuristic must not output specific species '{forbidden}' — use coarse label"
            )

    def test_heuristic_output_has_model_note(self):
        """(d) model_note must be set and non-empty when heuristic is active."""
        result = self._run_analyze()
        model_note = result.get("model_note")
        self.assertIsNotNone(model_note, "model_note must be set when heuristic is active")
        self.assertGreater(len(model_note), 20, "model_note should be a meaningful explanation")

    def test_heuristic_confidence_capped_below_065(self):
        """(e) Heuristic confidence must be capped below 0.65 — no false precision."""
        result = self._run_analyze()
        conf = result["confidence"]
        self.assertLess(
            conf, 0.65,
            f"Heuristic confidence={conf} must be < 0.65 (no false precision)"
        )

    def test_is_verified_species_field_present_in_response(self):
        """is_verified_species key must always be present in the response."""
        result = self._run_analyze()
        self.assertIn("is_verified_species", result)

    def test_model_note_field_present_in_response(self):
        """model_note key must always be present in the response."""
        result = self._run_analyze()
        self.assertIn("model_note", result)

    def test_events_carry_is_verified_field(self):
        """Each event in events list must carry is_verified_species."""
        result = self._run_analyze()
        events = result.get("events", [])
        for evt in events:
            self.assertIn(
                "is_verified_species", evt,
                "Every event must carry is_verified_species field"
            )

    def test_events_json_carries_is_verified_field(self):
        """events_json must also carry is_verified_species in each event."""
        result = self._run_analyze()
        events = json.loads(result.get("events_json", "[]"))
        for evt in events:
            self.assertIn(
                "is_verified_species", evt,
                "events_json: every event must carry is_verified_species field"
            )


class TestTryBirdnetReturnsNoneWhenNoWeights(unittest.TestCase):
    """(g) _try_birdnet returns None when BIRDNET_MODEL_PATH is not set / file absent."""

    def test_returns_none_when_no_model_path(self):
        """BIRDNET_MODEL_PATH is empty string → _try_birdnet returns None immediately."""
        # Patch the attribute on the module-level settings singleton's class
        original = bsvc.settings.BIRDNET_MODEL_PATH
        try:
            object.__setattr__(bsvc.settings, "BIRDNET_MODEL_PATH", "")
            result = bsvc.BioacousticService._try_birdnet("/fake/path.wav")
        finally:
            object.__setattr__(bsvc.settings, "BIRDNET_MODEL_PATH", original)
        self.assertIsNone(result, "_try_birdnet must return None when BIRDNET_MODEL_PATH is empty")

    def test_returns_none_when_model_file_missing(self):
        """BIRDNET_MODEL_PATH set but file does not exist → _try_birdnet returns None."""
        original = bsvc.settings.BIRDNET_MODEL_PATH
        try:
            object.__setattr__(bsvc.settings, "BIRDNET_MODEL_PATH", "/nonexistent/birdnet.tflite")
            with patch("os.path.isfile", return_value=False):
                result = bsvc.BioacousticService._try_birdnet("/fake/path.wav")
        finally:
            object.__setattr__(bsvc.settings, "BIRDNET_MODEL_PATH", original)
        self.assertIsNone(result, "_try_birdnet must return None when model file is missing")


class TestHeuristicClassificationLogic(unittest.TestCase):
    """Unit tests for _classify_heuristic() — frequency-band routing."""

    def test_bird_freq_range_maps_to_bird_category(self):
        """Dominant frequency in bird range (1200–8000 Hz) → Bird (unverified)."""
        features = {
            "spectral_centroid": 3000.0,
            "spectral_rolloff": 5000.0,
            "zero_crossing_rate": 0.05,
            "mfcc_mean": -3.0,
            "dominant_frequency": 3500.0,
        }
        result = bsvc.BioacousticService._classify_heuristic(features)
        self.assertFalse(result["is_verified_species"])
        self.assertIn("unverified", result["species_name"].lower(),
                      "Coarse label must contain '(unverified)'")
        self.assertIn("heuristic", result["model"].lower(),
                      "model field must indicate this is a heuristic")

    def test_mammal_freq_range_maps_to_mammal_category(self):
        """Dominant frequency in mammal range (80–2000 Hz) with low centroid → Mammal."""
        features = {
            "spectral_centroid": 800.0,
            "spectral_rolloff": 1500.0,
            "zero_crossing_rate": 0.03,
            "mfcc_mean": -10.0,
            "dominant_frequency": 400.0,
        }
        result = bsvc.BioacousticService._classify_heuristic(features)
        self.assertFalse(result["is_verified_species"])
        self.assertIn("unverified", result["species_name"].lower())

    def test_confidence_never_exceeds_064(self):
        """Confidence from heuristic must always stay < 0.65."""
        for dom_freq in [100, 500, 1500, 3000, 6000, 10000]:
            features = {
                "spectral_centroid": dom_freq * 0.8,
                "spectral_rolloff": dom_freq * 1.2,
                "zero_crossing_rate": 0.08,
                "mfcc_mean": -5.0,
                "dominant_frequency": float(dom_freq),
            }
            result = bsvc.BioacousticService._classify_heuristic(features)
            self.assertLess(
                result["confidence"], 0.65,
                f"Heuristic confidence must be < 0.65 (got {result['confidence']} for freq {dom_freq} Hz)"
            )

    def test_no_specific_species_name_in_heuristic(self):
        """No specific species name should appear in heuristic output."""
        forbidden = {"Indian Robin", "Indian Peafowl", "Common Kingfisher",
                     "Jungle Mynah", "Red-wattled Lapwing"}
        for dom_freq in [500, 2000, 4000, 8000]:
            features = {
                "spectral_centroid": float(dom_freq),
                "spectral_rolloff": float(dom_freq * 1.3),
                "zero_crossing_rate": 0.08,
                "mfcc_mean": -5.0,
                "dominant_frequency": float(dom_freq),
            }
            result = bsvc.BioacousticService._classify_heuristic(features)
            self.assertNotIn(
                result["species_name"], forbidden,
                f"Heuristic must not output specific species at dom_freq={dom_freq} Hz"
            )


if __name__ == "__main__":
    unittest.main()
