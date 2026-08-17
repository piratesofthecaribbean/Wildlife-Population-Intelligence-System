# Wildlife Population Intelligence System (WildlifeAI)

An enterprise-grade, full-stack AI-powered platform for wildlife researchers, wardens, and forest departments. This system utilizes advanced computer vision (Gemini 3.5 Flash Vision API), real-time GIS telemetry mapping, dynamic biodiversity metrics (Shannon-Wiener and Simpson Indices), and secure audit logs to assist in sanctuary management.

---

## 🌌 System Architecture

```
                                  +-----------------------------------------+
                                  |            GIS Camera Traps             |
                                  |      (Raw Field Images Capture)         |
                                  +--------------------+--------------------+
                                                       |
                                                       v Base64 Upload
+------------------------------------------------------+--------------------+
|                                                                           |
|  Full-Stack Enterprise Server (Express + Node.js)                         |
|                                                                           |
|  +--------------------+   +---------------------+   +------------------+  |
|  |   Auth Controller  |   | Image AI Controller |   | Analytics Engine |  |
|  | (Production Auth)  |   | (Gemini 3.5 Flash)  |   |  (Diversity H')  |  |
|  +---------+----------+   +----------+----------+   +--------+---------+  |
|            |                         |                       |            |
|            +-------------------------+-----------------------+            |
|                                      |                                    |
|                                      v                                    |
|                        +-------------+-------------+                      |
|                        |  Supabase Cloud Database  |                      |
|                        | (PostgreSQL & S3 Storage) |                      |
|                        +---------------------------+                      |
|                                                                           |
+--------------------------------------+------------------------------------+
                                       |
                                       v React 19 Client SPA
+--------------------------------------+------------------------------------+
|                                                                           |
|  Wildlife Population Control Room Dashboard                               |
|                                                                           |
|  +---------------------+   +--------------------+   +------------------+  |
|  |   GIS Vector Map    |   | Interactive Canvas |   | Recharts Metrics |  |
|  | (SVG Radar Anchors) |   | (Bounding Overlays)|   |   (Trend Lines)  |  |
|  +---------------------+   +--------------------+   +------------------+  |
|                                                                           |
+---------------------------------------------------------------------------+
```

---

## 📊 Core Scientific Algorithms

### 1. Shannon-Wiener Diversity Index ($H'$)
Measures species uncertainty and evenness:
$$H' = -\sum (p_i \cdot \ln(p_i))$$
where $p_i$ is the proportion of individuals found in species $i$.

### 2. Simpson's Index of Diversity ($1 - D$)
Calculates probability that two individuals chosen at random belong to different species:
$$1 - D = 1 - \sum (p_i^2)$$
Values closer to $1.0$ indicate flawless ecological diversity.

---

## ⚡ Technical Stack

- **Frontend**: React 19, Vite, Recharts, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express, tsx, esbuild
- **AI Integration**: `@google/genai` (utilizing `gemini-3.5-flash`)
- **Database**: Supabase PostgreSQL with fully normalized tables, indexed coordinates, and relational constraints
- **Storage**: Supabase Storage Buckets (`wildlife-images`) with public asset reference URLs

---

## 🐳 Quickstart via Docker

To spin up the entire production-grade full-stack environment with zero local dependencies:

```bash
# 1. Clone the repository and navigate to root
cd WildlifeAI

# 2. Spin up the application container
docker compose up --build
```

The application is served at `http://localhost:3000` with the custom Express API gateway mounted at `http://localhost:3000/api`.

---

## 🔧 Local Developer Setup

If you prefer to run outside of Docker:

```bash
# Install dependencies
npm install

# Run the full-stack development server (Express + Vite)
npm run dev

# Build the complete compiled production bundle
npm run build

# Start the bundled production server
npm run start
```

---

## 🔒 Security & Compliance

- **Role-Based Access Control (RBAC)**: Supports specific workspaces for **Researchers** ( Elena Rostova), **Forest Officers** (Warden Mpata), and **System Administrators** (Full deletion capability).
- **Audit Logging Trails**: ISO/IEC 27001 compliant cryptographically signed transaction history tracing all camera trap analyses.
- **TLS Protection**: Secured by enterprise SSL protocols.
