#!/usr/bin/env python3
"""
Post-training: copy best.pt from training run to model/best.pt
Run this after train_wildlife_model.py completes.
"""
import os, shutil, sys

PROJECT_ROOT = "/Users/ayushverma/Downloads/WildlifePopulationSystem"
RUNS_DIR = os.path.join(PROJECT_ROOT, "backend", "runs_wildlife", "african_wildlife_yolo11n", "weights")
TARGET = os.path.join(PROJECT_ROOT, "model", "best.pt")

# Also handle the wrong path from the running job
ALT_WRONG = "/Users/ayushverma/Downloads/model/best.pt"

src = os.path.join(RUNS_DIR, "best.pt")
if os.path.isfile(src):
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    shutil.copy2(src, TARGET)
    print(f"✅ Copied {src} → {TARGET} ({os.path.getsize(TARGET)/1024/1024:.1f} MB)")
elif os.path.isfile(ALT_WRONG):
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    shutil.copy2(ALT_WRONG, TARGET)
    print(f"✅ Copied from alt path {ALT_WRONG} → {TARGET} ({os.path.getsize(TARGET)/1024/1024:.1f} MB)")
else:
    print(f"❌ best.pt not found at {src}")
    print(f"   Looked also at: {ALT_WRONG}")
    sys.exit(1)
