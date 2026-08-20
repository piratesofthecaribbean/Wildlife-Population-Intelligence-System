import json
from typing import Any, Dict

from app.services.image_analysis_service import ImageAnalysisService


class DetectionService:
    @staticmethod
    def detect_species(file) -> Dict[str, Any]:
        """Run the full YOLO11 image analysis pipeline."""
        return ImageAnalysisService.analyze_image(file)

    @staticmethod
    def build_db_fields(result: Dict[str, Any]) -> Dict[str, Any]:
        """Map analysis result to Detection model fields."""
        return {
            "species_name": result["species_name"],
            "scientific_name": result.get("scientific_name"),
            "confidence": result["confidence"],
            "image_path": result["image_path"],
            "bbox_json": result["bbox_json"],
            "animal_count": result.get("animal_count", 1),
            "image_quality_json": json.dumps(result.get("image_quality", {})),
            "conservation_status": result.get("conservation_status"),
            "is_endangered": result.get("is_endangered", False),
            "taxonomy_json": json.dumps(result.get("taxonomy", {})),
            "source_type": "image",
            "model_used": result.get("model", "YOLO11"),
        }
