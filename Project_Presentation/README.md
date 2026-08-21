# 📊 Wildlife Population Intelligence System — Project Presentation

Comprehensive presentation material, slide deck overview, and resources for the **Wildlife Population Intelligence System**.

📥 **Presentation File:** [Wildlife_Population_Intelligence_System_Presentation.pptx](./Wildlife_Population_Intelligence_System_Presentation.pptx)

---

## 🌐 Live Deployments & Repository Links

- **Live Web Application (Frontend - Vercel):** [https://wildlife-population-intelligence-sy-five.vercel.app](https://wildlife-population-intelligence-sy-five.vercel.app)
- **Live API Backend (Render):** [https://wildlife-population-intelligence-system-1.onrender.com](https://wildlife-population-intelligence-system-1.onrender.com)
- **Interactive Swagger API Docs:** [https://wildlife-population-intelligence-system-1.onrender.com/api/docs](https://wildlife-population-intelligence-system-1.onrender.com/api/docs)
- **Production Repository:** [https://github.com/piratesofthecaribbean/Wildlife-Population-Intelligence-System](https://github.com/piratesofthecaribbean/Wildlife-Population-Intelligence-System)
- **Group 2 Development Repository (`Ayush-Verma` Branch):** [https://github.com/springboardmentor27400b/Wildlife-Population-Intelligence-System-Group-2/tree/Ayush-Verma](https://github.com/springboardmentor27400b/Wildlife-Population-Intelligence-System-Group-2/tree/Ayush-Verma)

---

## 📑 Slide Deck Structure & Summary

### Slide 1: Title & Overview
- **Title:** Wildlife Population Intelligence System
- **Focus:** AI-powered full-stack platform for species identification, bioacoustics, population dynamics, and ecological conservation.
- **Pillars:** Computer Vision • Bioacoustics • Population Analytics • GIS + Conservation.

---

### Slide 2: Problem Statement — The Challenge in Modern Conservation
- **Data Deluge:** Millions of camera-trap photos and continuous audio recordings exceed manual human capacity.
- **Delayed Intervention:** Critical threats (poaching, abrupt population drops, habitat fragmentation) missed due to slow processing.
- **Fragmented Workflows:** Field surveys, GIS layers, taxonomy records, and alerts stored in siloed tools.
- **Weak Prediction:** Traditional tools only report historical observations without forward-looking risk models.

---

### Slide 3: The Solution — Unified Intelligence Across Conservation Workflow
- **1. Ingest:** Camera-trap images, field audio, survey logs, device metadata.
- **2. Understand:** Automated YOLO species detection, BirdNET acoustic classification, habitat vegetation signals.
- **3. Estimate:** Lincoln-Petersen mark-recapture population size, Shannon-Wiener / Simpson diversity indices, movement corridors.
- **4. Act:** Real-time threat alerts, automated intervention recommendations, PDF audits, and GIS decision support.

---

### Slide 4: End-to-End System Architecture
- **Client Layer:** React 18, Vite, Tailwind CSS, Leaflet GIS Interactive Maps, Recharts.
- **API & Services Layer:** FastAPI asynchronous REST engine, JWT authentication, Multi-role RBAC, ReportLab export services.
- **AI / ML Layer:** Ultralytics YOLO, PyTorch, OpenCV, Librosa, BirdNET, NDVI geospatial estimators.
- **Data Layer:** PostgreSQL / SQLite with SQLAlchemy ORM, file storage for imagery and audio spectrograms.

---

### Slide 5: Core Workflow — From Field Data to Conservation Action
- **01 Ingest:** Bulk upload camera trap media and field sensor telemetry.
- **02 Preprocess:** Extract EXIF GPS timestamps, compute audio features (MFCC, Spectral Centroid).
- **03 Infer:** Run deep learning inference, generate bounding boxes, classify species, and score confidence.
- **04 Aggregate:** Update population numbers, biodiversity indices, and movement corridors.
- **05 Alert:** Automated alerts for endangered fauna in risk zones or poaching indicators.
- **06 Decide:** Export one-click executive PDF/Excel reports for policy decisions.

---

### Slide 6: Computer Vision Engine — Camera-Trap Intelligence
- **Object Detection & Counting:** YOLO + PyTorch + OpenCV for multi-animal detection in complex backgrounds and low-light night-vision.
- **Metadata Linking:** Automatically tags observations with capture time, GPS coordinates, and camera trap device IDs.
- **Extensible Architecture:** Supports regional fine-tuned model checkpoints (`.pt` weights).

---

### Slide 7: Bioacoustic Intelligence — Listen Before You Intervene
- **Feature Extraction:** Librosa & SoundFile extracting MFCCs, Spectral Centroids, Zero Crossing Rate, Spectral Roll-off, and Chroma.
- **Deep Acoustic Classifier:** BirdNET integration for avian and mammal vocalization recognition.
- **Interactive Spectrograms:** Frontend visual spectrograms enabling researchers to analyze acoustic signatures.

---

### Slide 8: Ecological Intelligence & Biodiversity Analytics
- **Mathematical Diversity Indices:**
  - *Shannon-Wiener Index ($H'$):* Evaluates species richness and community evenness.
  - *Simpson Index ($D$):* Quantifies species dominance across sanctuaries.
- **Abundance Modeling:** Mark-Recapture / Lincoln-Petersen estimation for true population size.
- **Trend Forecasting:** Time-series projection to detect early decline and evaluate conservation recovery.

---

### Slide 9: Habitat Health & Conservation Risk Prediction
- **Ecosystem Health Score (EHS):** Aggregates vegetation index (NDVI), water availability, and human disturbance.
- **Poaching Risk Engine:** Dynamic risk heatmaps combining perimeter proximity and incident clusters.
- **Prescriptive Interventions:** Generates actionable field tasks (patrol dispatch, perimeter maintenance, water restoration).

---

### Slide 10: Users & Role-Based Access Control (RBAC)
- **Administrator:** Full system configuration, hardware device registry, and telemetry diagnostics.
- **Lead Researcher / Ecologist:** Access to raw datasets, taxonomy tuning, biodiversity metrics, and forecasts.
- **Forest Ranger / Field Officer:** Field survey creation, media uploads, and real-time alerts.
- **Conservation Officer:** Threat prioritization, zone restoration planning, and inter-agency coordination.

---

### Slide 11: Complete Technology Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Leaflet GIS, React-Leaflet, Recharts.
- **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic, SQLAlchemy, Alembic.
- **Computer Vision:** Ultralytics YOLO, PyTorch, Torchvision, OpenCV, Pillow.
- **Bioacoustics:** Librosa, SoundFile, BirdNET.
- **Reporting & Auth:** ReportLab (PDF), OpenPyXL (Excel), python-jose (JWT), Passlib (bcrypt).
- **DevOps:** Docker, Docker Compose, Nginx, Render (Backend), Vercel (Frontend).

---

### Slide 12: Production & Cloud Deployment
- **Frontend (Vercel):** Edge-cached single-page application with automated CI/CD.
- **Backend (Render):** Containerized Python ASGI FastAPI service running with live health checks.
- **Database:** Relational persistence with volume isolation and seamless migrations.

---

### Slide 13: Practical Benefits & Conservation Impact
- ⏱️ **90% Reduction in Manual Review Time:** Automated classification processes thousands of media items in minutes.
- 🎯 **Standardized Scientific Data:** Eliminates human bias and inconsistencies across field teams.
- 🚨 **Proactive Threat Detection:** Early alert dispatches enable rangers to prevent poaching and habitat damage.
- 📈 **Evidence-Based Policy:** Comprehensive reporting empowers conservation leaders with audit-ready documentation.
