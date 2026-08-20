# =========================================================
# Backend Dockerfile - Wildlife Population Intelligence System
# FastAPI + YOLOv8 + PostgreSQL client
# =========================================================
FROM python:3.11-slim

# System dependencies required by OpenCV / Torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source
COPY . .

# Ensure upload/model directories exist
RUN mkdir -p uploads model

EXPOSE 8000

# Render provides $PORT at runtime; default to 8000 for local/docker-compose
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
