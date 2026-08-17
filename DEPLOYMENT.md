# Production Deployment Guide
## Wildlife Population Intelligence System

This document provides step-by-step instructions to configure and deploy the Wildlife Population Intelligence System to production using **Supabase**, **Docker**, **Render**, and **Vercel**.

---

## 1. Supabase Infrastructure Setup

The application uses **Supabase PostgreSQL** for robust relational data persistence and **Supabase Storage** for storing camera trap images.

### Step 1.1: Database Schema & Migration
1. Log in to the [Supabase Dashboard](https://supabase.com).
2. Create a new project.
3. Once the project is provisioned, navigate to the **SQL Editor** from the left-hand sidebar.
4. Click **New Query**.
5. Copy the entire contents of the `/supabase-schema.sql` file in this repository and paste it into the editor.
6. Click **Run** to execute the script. This will:
   - Create all 9 normalized relational tables.
   - Establish appropriate indexes for high-speed queries.
   - Seed initial records (Users, Monitoring Sites, Surveys, Species, and initial Camera Trap images).

### Step 1.2: Storage Bucket Configuration
1. In your Supabase Dashboard, navigate to **Storage** (the bucket icon).
2. Click **New Bucket**.
3. Set the Bucket Name to exactly **`wildlife-images`**.
4. Set the bucket privacy to **Public** so that generated camera-trap public URLs can be displayed in the application UI.
5. Click **Save**.

### Step 1.3: Retrieve Connection Credentials
1. Go to **Project Settings** (the gear icon) -> **API**.
2. Locate the following keys under **Project API Keys**:
   - **`Project URL`** (this is your `SUPABASE_URL`).
   - **`anon public`** or **`service_role`** (on server-side we prefer using the service_role key as `SUPABASE_KEY` for seamless bypass of RLS or full access, but `anon` works if RLS is not enforced).

---

## 2. Environment Variables

To run the application in production mode, you must set the following environment variables:

```env
# Gemini AI Vision API Key
GEMINI_API_KEY="your_gemini_api_key"

# Supabase Configurations
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_KEY="your-supabase-service-role-or-anon-key"

# Production Flag
NODE_ENV="production"
```

---

## 3. Deployment Targets

### A. Containerized Docker Deployment

This repository includes a multi-stage, production-ready `Dockerfile` and a `.dockerignore` file.

#### To build and run the Docker image locally or on any cloud server:

1. **Build the Docker Image**:
   ```bash
   docker build -t wildlife-intelligence-system .
   ```

2. **Run the Container**:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e GEMINI_API_KEY="your_gemini_api_key" \
     -e SUPABASE_URL="your_supabase_url" \
     -e SUPABASE_KEY="your_supabase_key" \
     -e NODE_ENV="production" \
     --name wildlife-app \
     wildlife-intelligence-system
   ```

3. Access the application in your browser at `http://localhost:3000`.

---

### B. Render Deployment (Recommended for Full-Stack Node)

Render provides direct integration with your GitHub repository to run full-stack Express servers.

1. Create an account or log in to the [Render Dashboard](https://render.com).
2. Click **New** -> **Web Service**.
3. Connect your Git repository.
4. Set the following configurations:
   - **Name**: `wildlife-intelligence-system`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start` (which runs `node dist/server.cjs`)
5. Click **Advanced** and add your **Environment Variables**:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `NODE_ENV` = `production`
6. Click **Create Web Service**.

---

### C. Vercel Deployment

Vercel is an excellent option for serverless edge deployment.

1. Install the Vercel CLI or link your repository through the [Vercel Dashboard](https://vercel.com).
2. Run the deployment:
   ```bash
   vercel
   ```
3. Set your environment variables (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `NODE_ENV` = `production`) in your Vercel Project Settings.
4. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 4. Local Development Testing

If you are running the server locally, you can create a `.env` file containing your credentials:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-key"
GEMINI_API_KEY="your-gemini-key"
```

Run `npm run dev` to start the local Vite development server with the integrated Express server proxy.
