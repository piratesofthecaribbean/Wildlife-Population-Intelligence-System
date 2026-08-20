"""
Tests for ImageAnalysisService — species identification correctness.

Covers:
  (a) Custom model path present → species labels passed through directly,
      is_verified_species = True.
  (b) Custom model path missing (COCO fallback) → labels are coarse / unverified,
      is_verified_species = False, no specific species fabricated.
  (c) Filename hint NEVER overrides a non-empty detection list.
  (d) Filename hint is used as last-resort fallback when detections is empty,
      but always with is_verified_species = False.
  (e) _get_yolo_model() correctly returns (model, True) for custom and
      (model, False) for fallback.
  (f) Dead "mouse" entry no longer exists in COCO_COARSE_MAP.
  (g) Active model name and model_note surface in analyze_image() response.
"""

import io
import json
import os
import sys
import types
import unittest
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Minimal stub for ultralytics so the module can be imported without the
# actual library installed (useful in CI where only dev deps are present).
# ---------------------------------------------------------------------------
if "ultralytics" not in sys.modules:
    ultralytics_stub = types.ModuleType("ultralytics")

    class _FakeYOLO:  # noqa: D101
        def __init__(self, path):
            self.path = path
            self.names = {}

        def predict(self, **kwargs):
            return []

    ultralytics_stub.YOLO = _FakeYOLO
    sys.modules["ultralytics"] = ultralytics_stub

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_box_mock(cls_id: int, conf: float, x1=0.1, y1=0.1, x2=0.9, y2=0.9):
    """Return a MagicMock that mimics a single ultralytics detection box."""
    box = MagicMock()
    box.cls = [cls_id]
    box.conf = [conf]
    import numpy as np
    box.xyxy = [np.array([x1, y1, x2, y2])]
    return box


def _make_result_mock(boxes_data: List[Dict]):
    """
    Build a fake ultralytics result with the given list of
    {cls_id, conf, raw_name} dicts.
    """
    import numpy as np

    result = MagicMock()
    result.names = {}
    mock_boxes = []
    for d in boxes_data:
        result.names[d["cls_id"]] = d["raw_name"]
        mock_boxes.append(_make_box_mock(d["cls_id"], d["conf"]))
    result.boxes = mock_boxes
    return result


def _make_upload_file(filename: str = "image.jpg", content: bytes = b"\xff\xd8\xff"):
    """Create a minimal UploadFile-like object for testing."""
    mock_file = MagicMock()
    mock_file.filename = filename
    mock_file.file = io.BytesIO(content)
    return mock_file


# ---------------------------------------------------------------------------
# Reset the module-level model cache before each test so tests are isolated.
# ---------------------------------------------------------------------------
import app.services.image_analysis_service as svc  # noqa: E402


def _reset_model_cache():
    svc._yolo_model = None
    svc._is_custom_model = False


# ===========================================================================
# Test cases
# ===========================================================================

class TestGetYoloModel(unittest.TestCase):
    """Unit tests for _get_yolo_model()."""

    def setUp(self):
        _reset_model_cache()

    def test_custom_model_returns_true_flag(self):
        """When the custom model file exists, is_custom_model must be True."""
        with patch("os.path.isfile", return_value=True), \
             patch("ultralytics.YOLO", return_value=MagicMock()) as mock_yolo:
            model, is_custom = svc._get_yolo_model()
        self.assertTrue(is_custom, "Expected is_custom_model=True for a found custom model file")

    def test_custom_model_missing_returns_false_flag(self):
        """When the custom model file is absent, is_custom_model must be False (COCO fallback)."""
        def fake_isfile(path):
            # custom path missing, but fallback yolo11n.pt found
            if "best.pt" in path:
                return False
            if "yolo11n.pt" in path:
                return True
            return False

        _reset_model_cache()
        with patch("os.path.isfile", side_effect=fake_isfile), \
             patch("ultralytics.YOLO", return_value=MagicMock()):
            model, is_custom = svc._get_yolo_model()
        self.assertFalse(is_custom, "Expected is_custom_model=False when falling back to COCO")

    def test_model_cached_after_first_call(self):
        """Subsequent calls return the cached model without re-loading."""
        fake_model = MagicMock()
        svc._yolo_model = fake_model
        svc._is_custom_model = True

        model, is_custom = svc._get_yolo_model()
        self.assertIs(model, fake_model)
        self.assertTrue(is_custom)


class TestRunYoloDetection(unittest.TestCase):
    """Unit tests for _run_yolo_detection()."""

    def setUp(self):
        _reset_model_cache()

    def _patch_model(self, results, is_custom: bool):
        """Inject a fake model and is_custom flag into the module cache."""
        import numpy as np
        fake_model = MagicMock()
        fake_model.predict.return_value = results
        svc._yolo_model = fake_model
        svc._is_custom_model = is_custom

    # ------------------------------------------------------------------
    # (a) Custom model: labels passed through directly, is_verified=True
    # ------------------------------------------------------------------

    def test_custom_model_uses_class_names_directly(self):
        """Custom model → label = model's own class name, is_verified_species = True."""
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        result_mock = _make_result_mock([
            {"cls_id": 0, "conf": 0.85, "raw_name": "Bengal Tiger"},
        ])
        self._patch_model([result_mock], is_custom=True)

        detections = svc.ImageAnalysisService._run_yolo_detection(fake_image)
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["label"], "Bengal Tiger")
        self.assertTrue(detections[0]["is_verified_species"])

    def test_custom_model_does_not_apply_coco_coarse_map(self):
        """Custom model: even if raw_name matches a COCO key, label is NOT remapped."""
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        # raw_name = "cat" — in COCO_COARSE_MAP this would be "Wild Felid (unverified)"
        result_mock = _make_result_mock([
            {"cls_id": 0, "conf": 0.70, "raw_name": "cat"},
        ])
        self._patch_model([result_mock], is_custom=True)

        detections = svc.ImageAnalysisService._run_yolo_detection(fake_image)
        self.assertEqual(len(detections), 1)
        # For a custom model named "cat", label should be "cat" (no COCO remapping)
        self.assertEqual(detections[0]["label"], "cat")
        self.assertTrue(detections[0]["is_verified_species"])

    # ------------------------------------------------------------------
    # (b) COCO fallback: coarse/unverified labels only
    # ------------------------------------------------------------------

    def test_coco_fallback_cat_maps_to_wild_felid(self):
        """COCO cat → 'Wild Felid (unverified)', is_verified_species = False."""
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        result_mock = _make_result_mock([
            {"cls_id": 15, "conf": 0.60, "raw_name": "cat"},
        ])
        self._patch_model([result_mock], is_custom=False)

        detections = svc.ImageAnalysisService._run_yolo_detection(fake_image)
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["label"], "Wild Felid (unverified)")
        self.assertFalse(detections[0]["is_verified_species"])

    def test_coco_fallback_dog_maps_to_wild_canid(self):
        """COCO dog → 'Wild Canid (unverified)', is_verified_species = False."""
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        result_mock = _make_result_mock([
            {"cls_id": 16, "conf": 0.55, "raw_name": "dog"},
        ])
        self._patch_model([result_mock], is_custom=False)

        detections = svc.ImageAnalysisService._run_yolo_detection(fake_image)
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["label"], "Wild Canid (unverified)")
        self.assertFalse(detections[0]["is_verified_species"])

    def test_coco_fallback_ungulates_all_map_to_ungulate(self):
        """COCO horse/sheep/cow/zebra/giraffe → 'Ungulate (unverified)'."""
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        for coco_class in ["horse", "sheep", "cow", "zebra", "giraffe"]:
            _reset_model_cache()
            result_mock = _make_result_mock([
                {"cls_id": 0, "conf": 0.50, "raw_name": coco_class},
            ])
            self._patch_model([result_mock], is_custom=False)
            detections = svc.ImageAnalysisService._run_yolo_detection(fake_image)
            self.assertEqual(len(detections), 1, f"Expected 1 detection for {coco_class}")
            self.assertEqual(
                detections[0]["label"], "Ungulate (unverified)",
                f"Expected 'Ungulate (unverified)' for COCO class '{coco_class}', "
                f"got '{detections[0]['label']}'"
            )
            self.assertFalse(detections[0]["is_verified_species"])

    def test_coco_fallback_no_leopard_wolf_spotted_deer_labels(self):
        """COCO fallback must never produce 'Leopard', 'Wolf', or 'Spotted Deer'."""
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        banned_labels = {"Leopard", "Wolf", "Spotted Deer"}
        coco_animal_classes = {
            "cat": 15, "dog": 16, "horse": 17, "sheep": 18,
            "cow": 19, "elephant": 20, "bear": 21, "zebra": 22, "giraffe": 23,
        }
        for name, cid in coco_animal_classes.items():
            _reset_model_cache()
            result_mock = _make_result_mock([{"cls_id": cid, "conf": 0.50, "raw_name": name}])
            self._patch_model([result_mock], is_custom=False)
            detections = svc.ImageAnalysisService._run_yolo_detection(fake_image)
            for det in detections:
                self.assertNotIn(
                    det["label"], banned_labels,
                    f"COCO class '{name}' must not produce banned label '{det['label']}'"
                )

    def test_coco_fallback_non_animal_filtered_out(self):
        """NON_ANIMAL_COCO classes produce zero detections."""
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        result_mock = _make_result_mock([
            {"cls_id": 0, "conf": 0.90, "raw_name": "person"},
            {"cls_id": 1, "conf": 0.80, "raw_name": "car"},
            {"cls_id": 2, "conf": 0.75, "raw_name": "mouse"},  # computer mouse
        ])
        self._patch_model([result_mock], is_custom=False)

        detections = svc.ImageAnalysisService._run_yolo_detection(fake_image)
        self.assertEqual(len(detections), 0, "Non-animal COCO classes must be filtered out")


class TestFilenameHint(unittest.TestCase):
    """Unit tests for the filename-hint logic."""

    def test_hint_not_applied_when_detections_exist(self):
        """
        (c) Filename hint must NEVER override an existing YOLO detection.
        Even if the filename contains 'tiger', a real detection of
        'Wild Felid (unverified)' must survive unchanged.
        """
        import numpy as np
        _reset_model_cache()

        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)
        result_mock = _make_result_mock([
            {"cls_id": 15, "conf": 0.65, "raw_name": "cat"},
        ])
        fake_model = MagicMock()
        fake_model.predict.return_value = [result_mock]
        svc._yolo_model = fake_model
        svc._is_custom_model = False

        with patch.object(svc.ImageAnalysisService, "save_upload",
                          return_value=("/tmp/fake.jpg", "/uploads/fake.jpg")), \
             patch.object(svc.ImageAnalysisService, "assess_image_quality",
                          return_value={"overall_score": 0.8, "quality_label": "Good"}), \
             patch.object(svc.ImageAnalysisService, "preprocess_image",
                          return_value=fake_image):

            mock_file = _make_upload_file(filename="tiger_photo.jpg")
            result = svc.ImageAnalysisService.analyze_image(mock_file)

        # The detection from YOLO (Wild Felid) must not have been replaced by "Bengal Tiger"
        labels = [d["label"] for d in result["detections"]]
        self.assertNotIn("Bengal Tiger", labels,
                         "Filename hint must not override real YOLO detections")
        self.assertIn("Wild Felid (unverified)", labels,
                      "Real YOLO detection label must be preserved")

    def test_hint_used_as_fallback_when_no_detections(self):
        """
        (d) When YOLO produces nothing, filename hint is used as last resort,
        but confidence is low and is_verified_species = False.
        """
        import numpy as np
        _reset_model_cache()

        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)
        fake_model = MagicMock()
        fake_model.predict.return_value = []   # no detections
        svc._yolo_model = fake_model
        svc._is_custom_model = False

        with patch.object(svc.ImageAnalysisService, "save_upload",
                          return_value=("/tmp/fake.jpg", "/uploads/fake.jpg")), \
             patch.object(svc.ImageAnalysisService, "assess_image_quality",
                          return_value={"overall_score": 0.6, "quality_label": "Good"}), \
             patch.object(svc.ImageAnalysisService, "preprocess_image",
                          return_value=fake_image):

            mock_file = _make_upload_file(filename="tiger_encounter.jpg")
            result = svc.ImageAnalysisService.analyze_image(mock_file)

        self.assertFalse(
            result["is_verified_species"],
            "Filename-hint fallback must set is_verified_species=False"
        )
        self.assertLessEqual(
            result["confidence"], 0.35,
            "Filename-hint fallback must have low confidence (<= 0.35)"
        )

    def test_hint_hint_extract_tiger(self):
        """_filename_hint correctly extracts tiger from filename."""
        self.assertEqual(svc.ImageAnalysisService._filename_hint("tiger_cam.jpg"), "Bengal Tiger")

    def test_hint_returns_none_for_unknown_filename(self):
        """_filename_hint returns None when no known keyword is in the filename."""
        self.assertIsNone(svc.ImageAnalysisService._filename_hint("IMG_20231010_123456.jpg"))


class TestCoarseMapIntegrity(unittest.TestCase):
    """Structural checks on COCO_COARSE_MAP."""

    def test_mouse_not_in_coarse_map(self):
        """'mouse' (computer mouse) must not be in COCO_COARSE_MAP — it is in NON_ANIMAL_COCO."""
        self.assertNotIn(
            "mouse", svc.COCO_COARSE_MAP,
            "'mouse' is a non-animal COCO class (computer mouse) and should NOT appear in "
            "COCO_COARSE_MAP — it is already blocked by NON_ANIMAL_COCO before this map is used."
        )

    def test_no_specific_species_in_coarse_map_values(self):
        """All values in COCO_COARSE_MAP must contain '(unverified)' — no specific species."""
        for coco_class, label in svc.COCO_COARSE_MAP.items():
            self.assertIn(
                "(unverified)", label,
                f"COCO_COARSE_MAP['{coco_class}'] = '{label}' is missing '(unverified)' suffix"
            )

    def test_banned_specific_labels_not_in_coarse_map(self):
        """Fabricated species names must not appear as values in COCO_COARSE_MAP."""
        banned = {"Leopard", "Wolf", "Spotted Deer", "Indian Field Mouse", "Bengal Fox", "Indian Hare"}
        for coco_class, label in svc.COCO_COARSE_MAP.items():
            self.assertNotIn(
                label, banned,
                f"COCO_COARSE_MAP['{coco_class}'] = '{label}' is a banned specific species name"
            )


class TestAnalyzeImageResponse(unittest.TestCase):
    """Integration-level checks on the full analyze_image() response shape."""

    def setUp(self):
        _reset_model_cache()

    def _run_analysis(self, filename: str, detections_data: List[Dict], is_custom: bool):
        import numpy as np
        fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

        result_mock = _make_result_mock(detections_data)
        fake_model = MagicMock()
        fake_model.predict.return_value = [result_mock] if detections_data else []
        svc._yolo_model = fake_model
        svc._is_custom_model = is_custom

        with patch.object(svc.ImageAnalysisService, "save_upload",
                          return_value=("/tmp/fake.jpg", "/uploads/fake.jpg")), \
             patch.object(svc.ImageAnalysisService, "assess_image_quality",
                          return_value={"overall_score": 0.7, "quality_label": "Good"}), \
             patch.object(svc.ImageAnalysisService, "preprocess_image",
                          return_value=fake_image):

            mock_file = _make_upload_file(filename=filename)
            return svc.ImageAnalysisService.analyze_image(mock_file)

    def test_custom_model_response_has_verified_true(self):
        """Custom model detection → is_verified_species = True in response."""
        result = self._run_analysis(
            filename="photo.jpg",
            detections_data=[{"cls_id": 0, "conf": 0.88, "raw_name": "Bengal Tiger"}],
            is_custom=True,
        )
        self.assertTrue(result["is_verified_species"])
        self.assertEqual(result["model"], "YOLO11-custom")
        self.assertIsNone(result["model_note"])

    def test_coco_fallback_response_has_verified_false(self):
        """COCO fallback detection → is_verified_species = False and model_note set."""
        result = self._run_analysis(
            filename="photo.jpg",
            detections_data=[{"cls_id": 15, "conf": 0.60, "raw_name": "cat"}],
            is_custom=False,
        )
        self.assertFalse(result["is_verified_species"])
        self.assertEqual(result["model"], "YOLO11-COCO-fallback")
        self.assertIsNotNone(result["model_note"])
        self.assertIn("best.pt", result["model_note"])

    def test_model_field_present_in_response(self):
        """'model' field must always be present in the response."""
        result = self._run_analysis(
            filename="photo.jpg",
            detections_data=[{"cls_id": 15, "conf": 0.55, "raw_name": "cat"}],
            is_custom=False,
        )
        self.assertIn("model", result)
        self.assertIn("model_note", result)

    def test_bbox_json_includes_is_verified_field(self):
        """Each bbox in bbox_json must carry is_verified_species."""
        result = self._run_analysis(
            filename="photo.jpg",
            detections_data=[{"cls_id": 15, "conf": 0.65, "raw_name": "cat"}],
            is_custom=False,
        )
        bboxes = json.loads(result["bbox_json"])
        for bbox in bboxes:
            self.assertIn("is_verified_species", bbox,
                          "Every detection dict must contain 'is_verified_species'")


if __name__ == "__main__":
    unittest.main()
