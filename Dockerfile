# =========================================================
# Root Dockerfile for Render / Cloud Deployment
# Wildlife Population Intelligence System - FastAPI Backend
# =========================================================
FROM python:3.11-slim

# System dependencies required by OpenCV, Librosa, PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libpq-dev \
    gcc \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies from backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# Ensure storage directories exist
RUN mkdir -p uploads uploads/audio model

EXPOSE 8000

# Start FastAPI using Render's dynamic $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
