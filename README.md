# Wildlife Population Intelligence System

An AI-assisted, full-stack platform for recording wildlife observations, identifying species from images, monitoring habitats, and turning field data into conservation insights.

## What it does

- Secure researcher and administrator accounts with JWT authentication and role-based access control.
- Species, survey, habitat, and detection management from a responsive React dashboard.
- Image-based wildlife identification using a YOLO model when model weights are configured.
- Population, biodiversity, habitat, conservation, audio, and reporting workflows exposed through a FastAPI API.
- Docker Compose setup for PostgreSQL, the backend API, and the production frontend.

## Technology

| Area | Tools |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Recharts, Leaflet |
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Data | PostgreSQL (Docker) or SQLite for local development |
| AI | Ultralytics YOLO, PyTorch, OpenCV |
| Operations | Docker Compose, Nginx |

## Project layout

```text
backend/       FastAPI application, database models, services, and tests
frontend/      React/Vite single-page application
dataset/       Dataset documentation and expected training-data layout
model/         Local YOLO model weights (not committed)
scripts/       Training and model-management utilities
docs/          Supporting project documentation
```

## Run locally

### Prerequisites

- Python 3.11 or later
- Node.js 20 or later and npm
- PostgreSQL (optional when using SQLite locally)

### 1. Configure and start the backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
# Update backend/.env with a strong JWT_SECRET_KEY and your database URL.

cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API documentation is available at [http://localhost:8000/api/docs](http://localhost:8000/api/docs).

### 2. Configure and start the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the URL printed by Vite (normally [http://localhost:5173](http://localhost:5173)). `VITE_API_BASE_URL` in `frontend/.env` should point to the backend API, normally `http://localhost:8000/api/v1`.

## Run with Docker

Docker Compose starts PostgreSQL, FastAPI, and the Nginx-served frontend:

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

The frontend will be at [http://localhost:3000](http://localhost:3000); API docs will be at [http://localhost:8000/api/docs](http://localhost:8000/api/docs).

## Configuration and model files

Never commit real `.env` files, database files, uploads, datasets, virtual environments, or model weights. These are intentionally ignored by Git.

To enable image identification, put the trained YOLO weights at the path set by `YOLO_MODEL_PATH` in `backend/.env` (the example uses `model/best.pt`). See [model/README.md](model/README.md) and [dataset/README.md](dataset/README.md) for the expected model and dataset structure.

## Quality checks

```bash
# Backend tests
cd backend
pytest

# Frontend production build
cd frontend
npm run build
```

## Contributing

Create a branch, make focused changes, run the relevant checks, and open a pull request describing the behaviour changed. Do not add credentials, field-sensitive data, or large generated model/data artifacts to Git.

## License

Released under the [MIT License](LICENSE).
