from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.biodiversity_service import BiodiversityService
from app.services.report_service import ReportService
from app.services.species_identification_service import SpeciesIdentificationService

router = APIRouter(prefix="/biodiversity", tags=["Biodiversity Analytics"])


@router.get("/metrics")
def get_biodiversity_metrics(db: Session = Depends(get_db)):
    """Biodiversity index, diversity metrics, and species distribution."""
    return BiodiversityService.get_biodiversity_metrics(db)


@router.get("/observations")
def get_observation_history(db: Session = Depends(get_db), limit: int = 50):
    """Combined image + audio observation history."""
    return BiodiversityService.get_observation_history(db, limit=limit)


@router.get("/predictions")
def get_prediction_history(db: Session = Depends(get_db), limit: int = 30):
    """Recent AI prediction history."""
    return BiodiversityService.get_prediction_history(db, limit=limit)


@router.get("/trends")
def get_monthly_trends(db: Session = Depends(get_db)):
    """Monthly observation trends for analytics dashboard."""
    return BiodiversityService.get_monthly_trends(db)


@router.get("/endangered")
def get_endangered_species(db: Session = Depends(get_db)):
    """List endangered and vulnerable species."""
    SpeciesIdentificationService.sync_catalog_to_db(db)
    return SpeciesIdentificationService.get_endangered_species(db)


@router.get("/reports/pdf")
def export_pdf_report(db: Session = Depends(get_db)):
    """Generate and download a PDF wildlife monitoring report."""
    metrics = BiodiversityService.get_biodiversity_metrics(db)
    history = BiodiversityService.get_observation_history(db, limit=50)
    pdf_bytes = ReportService.generate_monitoring_report(metrics, history)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=wildlife_monitoring_report.pdf"},
    )


@router.get("/reports/excel")
def export_excel_report(db: Session = Depends(get_db)):
    """Generate and download an Excel biodiversity report."""
    metrics = BiodiversityService.get_biodiversity_metrics(db)
    history = BiodiversityService.get_observation_history(db, limit=50)
    excel_bytes = ReportService.generate_excel_report(metrics, history)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=biodiversity_report.xlsx"},
    )
