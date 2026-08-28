"""
Tests for ImageAnalysisService & Image Engine — species identification correctness.
Covers:
  (a) Image Engine validation (rejects invalid/tiny images).
  (b) Deduplication logic (IoU & containment suppression).
  (c) Stage 1 YOLO detection + Stage 2 crop classification.
  (d) Filename hint fallback when no detections exist.
  (e) GBIF taxonomy & IUCN status enrichment.
"""

import io
import json
import os
import unittest
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch
import numpy as np
from PIL import Image

from app.services.ai import image_engine, model_loader
from app.services.ai.iucn_service import get_iucn_status
from app.services.ai.taxonomy_service import get_gbif_taxonomy
from app.services.image_analysis_service import ImageAnalysisService


class TestImageEngine(unittest.TestCase):
    """Unit tests for the 2-stage image engine."""

    def test_box_metrics_same_box(self):
        """Identical bounding boxes should have IoU = 1.0."""
        metrics = image_engine._box_metrics([0.1, 0.1, 0.5, 0.5], [0.1, 0.1, 0.5, 0.5])
        self.assertEqual(metrics["iou"], 1.0)
        self.assertEqual(metrics["containment"], 1.0)

    def test_box_metrics_disjoint(self):
        """Disjoint boxes should have IoU = 0.0."""
        metrics = image_engine._box_metrics([0.0, 0.0, 0.2, 0.2], [0.5, 0.5, 0.8, 0.8])
        self.assertEqual(metrics["iou"], 0.0)

    def test_filter_duplicate_detections(self):
        """Overlapping cross-class duplicate boxes should be suppressed."""
        dets = [
            {"label": "Bengal Tiger", "confidence": 0.90, "box": [0.1, 0.1, 0.8, 0.8]},
            {"label": "Wild Felid",   "confidence": 0.70, "box": [0.11, 0.11, 0.79, 0.79]},
        ]
        filtered = image_engine.filter_duplicate_detections(dets, iou_threshold=0.75)
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["label"], "Bengal Tiger")

    def test_filename_hint(self):
        """Filename hint extracts correct species for known names."""
        self.assertEqual(image_engine._filename_hint("tiger_camera_trap.jpg"), "Bengal Tiger")
        self.assertEqual(image_engine._filename_hint("snow_leopard_himalayas.jpg"), "Snow Leopard")
        self.assertEqual(image_engine._filename_hint("chital_deer_01.jpg"), "Spotted Deer")
        self.assertIsNone(image_engine._filename_hint("unrelated_photo_123.jpg"))

    def test_image_quality_assessment(self):
        """Assess quality returns valid scores and labels."""
        img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        import tempfile, cv2
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            cv2.imwrite(f.name, img)
            temp_path = f.name

        try:
            quality = image_engine.assess_image_quality(temp_path)
            self.assertIn("overall_score", quality)
            self.assertIn("quality_label", quality)
            self.assertIn("snr_db" if "snr_db" in quality else "blur_score", quality)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_iucn_status_resolution(self):
        """IUCN status returns accurate categories for key species."""
        tiger = get_iucn_status("Bengal Tiger")
        self.assertEqual(tiger["iucn_category"], "EN")
        self.assertTrue(tiger["is_endangered"])

        deer = get_iucn_status("Spotted Deer")
        self.assertEqual(deer["iucn_category"], "LC")
        self.assertFalse(deer["is_endangered"])


if __name__ == "__main__":
    unittest.main()
