"""
main.py
-------
FastAPI application entry point for the
Wildlife Population Intelligence System.

Run locally:
    uvicorn app.main:app --reload

Deployed on Render with:
    uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import Base, engine
from app.database.migrate import run_migrations
import app.models  # ensure models are imported to register with Base
from app.routers import health, auth, species, survey, detection, habitat, dashboard, audio, biodiversity, population, conservation, admin
from app.services.alert_worker import AlertWorker

# Create SQLite database tables if they do not exist
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered platform for wildlife species identification, "
                 "population estimation, biodiversity monitoring, and "
                 "endangered species detection.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

@app.on_event("startup")
def startup_event():
    import threading
    # Run a single initial dispatch on startup
    threading.Thread(target=AlertWorker.run_worker_task, daemon=True).start()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Static Files (uploaded images) ----------------
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.AUDIO_UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ---------------- Routers ----------------
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(species.router, prefix=settings.API_V1_PREFIX)
app.include_router(survey.router, prefix=settings.API_V1_PREFIX)
app.include_router(detection.router, prefix=settings.API_V1_PREFIX)
app.include_router(habitat.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(audio.router, prefix=settings.API_V1_PREFIX)
app.include_router(biodiversity.router, prefix=settings.API_V1_PREFIX)
app.include_router(population.router, prefix=settings.API_V1_PREFIX)
app.include_router(conservation.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    """Root endpoint - simple API landing message."""
    return {
        "message": f"{settings.APP_NAME} API is running.",
        "docs": "/api/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }
