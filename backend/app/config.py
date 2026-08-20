"""
config.py
---------
Centralized application configuration.
Reads values from environment variables / .env file using pydantic-settings.
Import `settings` anywhere in the app to access config values.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    # ---------------- App ----------------
    APP_NAME: str = "Wildlife Population Intelligence System"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ---------------- Database ----------------
    DATABASE_URL: str = "sqlite:///./wildlife.db"

    # ---------------- JWT Auth ----------------
    JWT_SECRET_KEY: str = "change_this_to_a_long_random_secret_key_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ---------------- CORS ----------------
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000"

    # ---------------- File Storage ----------------
    UPLOAD_DIR: str = "uploads"
    AUDIO_UPLOAD_DIR: str = "uploads/audio"
    MAX_UPLOAD_SIZE_MB: int = 15
    MAX_AUDIO_SIZE_MB: int = 25

    # ---------------- AI Model ----------------
    YOLO_MODEL_PATH: str = "model/best.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.25
    BIRDNET_CONFIDENCE_THRESHOLD: float = 0.4
    # Path to real BirdNET checkpoint (birdnetlib format). Leave empty if not installed.
    BIRDNET_MODEL_PATH: str = ""
    DEVICE: str = "cpu"

    # ---------------- Alert Delivery ----------------
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "alerts@wildlife-system.local"
    # Comma-separated list of recipient emails
    ALERT_EMAIL_RECIPIENTS: str = ""

    # ---------------- OAuth2 ----------------
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth2/google/callback"

    # ---------------- Deployment ----------------
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert comma-separated CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


# Singleton settings instance used across the app
settings = Settings()
