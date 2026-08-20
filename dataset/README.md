# Dataset

This folder holds the wildlife image dataset used to train the YOLOv8 species-detection model.

**Primary source:** [Snapshot Serengeti / Dryad dataset](https://datadryad.org/dataset/doi:10.5061/dryad.5pt92)

## Structure (populated in the AI Module)
```
dataset/
  raw/            # original downloaded images
  processed/      # resized/cleaned images
  annotations/    # YOLO-format .txt label files
  splits/
    train/
    val/
    test/
  classes.txt     # species class names, one per line
```

Preprocessing scripts that download, clean, resize, and convert annotations
to YOLO format will be added to `/scripts` in the AI Module.
