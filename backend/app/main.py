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

def _seed_default_users():
    """Ensure default demo accounts are present for authentication."""
    try:
        from app.database import SessionLocal
        from app.models.user import User
        from app.services.auth_service import hash_password

        db = SessionLocal()
        default_users = [
            ("admin@wildlife.org", "admin123", "System Administrator", "Administrator"),
            ("admin@wildlife.gov", "password123", "System Administrator", "Administrator"),
            ("researcher@wildlife.gov", "password123", "Senior Wildlife Biologist", "Wildlife Researcher"),
            ("officer@wildlife.gov", "password123", "Range Forest Officer", "Forest Department Officer"),
            ("jane@wpis.org", "password123", "Dr. Jane Doe", "Wildlife Researcher"),
        ]
        for email, plain_pwd, name, role in default_users:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                db.add(User(
                    email=email,
                    full_name=name,
                    role=role,
                    hashed_password=hash_password(plain_pwd),
                ))
            else:
                # Refresh password to ensure it matches
                existing.hashed_password = hash_password(plain_pwd)
        db.commit()
        db.close()
    except Exception as exc:
        print(f"User seeding note: {exc}")

@app.on_event("startup")
def startup_event():
    import threading
    _seed_default_users()
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
