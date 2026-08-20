#!/usr/bin/env python3
"""
Wildlife YOLO11 Fine-Tuning Script
====================================
Transfer-learns YOLO11n on the Ultralytics African Wildlife dataset.
Output: model/best.pt at the path settings.YOLO_MODEL_PATH expects.

Dataset: African Wildlife (Ultralytics, AGPL-3.0)
  - 4 classes: buffalo, elephant, rhino, zebra
  - 1,052 train / 225 val / 227 test images
  - Auto-downloaded on first run (~100 MB)

Hardware used: Apple M1 MPS (8 GB RAM)
Expected runtime: 60-90 minutes for 50 epochs at imgsz=640, batch=8

Usage:
    cd /path/to/WildlifePopulationSystem/backend
    venv/bin/python scripts/train_wildlife_model.py

The resulting best.pt will be placed at:
    WildlifePopulationSystem/model/best.pt
which is exactly where settings.YOLO_MODEL_PATH points.
"""

import os
import sys
import time
import shutil
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("train_wildlife")

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)          # WildlifePopulationSystem/
BACKEND_DIR  = os.path.join(PROJECT_ROOT, "backend")
OUTPUT_PATH  = os.path.join(PROJECT_ROOT, "model", "best.pt")
RUNS_DIR     = os.path.join(PROJECT_ROOT, "backend", "runs_wildlife")

# ── Hyper-parameters ─────────────────────────────────────────────────────────
BASE_MODEL   = "yolo11n.pt"   # Ultralytics nano backbone
DATASET_YAML = "african-wildlife.yaml"   # auto-downloaded by ultralytics
EPOCHS       = 50
IMG_SIZE     = 640
BATCH        = 8              # safe for 8 GB RAM on MPS
PATIENCE     = 15             # early stopping
PROJECT_NAME = "wildlife_ft"
RUN_NAME     = "african_wildlife_yolo11n"

# ── Detect device ─────────────────────────────────────────────────────────────
import torch
if torch.backends.mps.is_available():
    DEVICE = "mps"
    logger.info("Using Apple MPS (Metal Performance Shaders) for training")
elif torch.cuda.is_available():
    DEVICE = 0
    logger.info("Using CUDA GPU for training")
else:
    DEVICE = "cpu"
    logger.warning("No GPU found — training on CPU (will be slow)")


def main():
    t_start = time.time()
    logger.info("=" * 60)
    logger.info("Wildlife YOLO11 Fine-Tuning")
    logger.info("Base model : %s", BASE_MODEL)
    logger.info("Dataset    : %s", DATASET_YAML)
    logger.info("Device     : %s", DEVICE)
    logger.info("Epochs     : %d  (patience=%d)", EPOCHS, PATIENCE)
    logger.info("Batch      : %d  imgsz=%d", BATCH, IMG_SIZE)
    logger.info("Output     : %s", OUTPUT_PATH)
    logger.info("=" * 60)

    from ultralytics import YOLO

    # Load the base COCO-pretrained model
    model = YOLO(BASE_MODEL)
    logger.info("Base model loaded — %d backbone params", sum(p.numel() for p in model.model.parameters()))

    # ── Train ─────────────────────────────────────────────────────────────────
    results = model.train(
        data=DATASET_YAML,
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH,
        device=DEVICE,
        patience=PATIENCE,
        project=RUNS_DIR,
        name=RUN_NAME,
        exist_ok=True,
        # Augmentation — good defaults for camera-trap style images
        augment=True,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,        # slight rotation (animals don't always face camera)
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        mosaic=1.0,
        close_mosaic=10,
        # Logging
        verbose=True,
        save=True,
        save_period=10,
    )

    elapsed = (time.time() - t_start) / 60
    logger.info("Training complete in %.1f minutes", elapsed)

    # ── Validate on test split ────────────────────────────────────────────────
    logger.info("Running validation on test split …")
    best_weights = os.path.join(RUNS_DIR, RUN_NAME, "weights", "best.pt")
    if not os.path.isfile(best_weights):
        logger.error("best.pt not found at expected path: %s", best_weights)
        sys.exit(1)

    val_model = YOLO(best_weights)
    val_results = val_model.val(
        data=DATASET_YAML,
        split="test",
        imgsz=IMG_SIZE,
        batch=BATCH,
        device=DEVICE,
        verbose=True,
    )

    # Log key metrics
    try:
        box = val_results.box
        logger.info("=" * 60)
        logger.info("TEST SET METRICS")
        logger.info("  mAP50       : %.4f", float(box.map50))
        logger.info("  mAP50-95    : %.4f", float(box.map))
        logger.info("  Precision   : %.4f", float(box.mp))
        logger.info("  Recall      : %.4f", float(box.mr))
        logger.info("=" * 60)
    except Exception as e:
        logger.warning("Could not extract metrics: %s", e)

    # ── Copy to model/best.pt ─────────────────────────────────────────────────
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    shutil.copy2(best_weights, OUTPUT_PATH)
    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    logger.info("Copied best.pt to %s (%.1f MB)", OUTPUT_PATH, size_mb)
    logger.info("The detection pipeline will now load this as is_custom_model=True.")
    logger.info("Restart uvicorn to pick up the new weights.")
    logger.info("DONE ✓")


if __name__ == "__main__":
    main()
