# Choco360 - AI-Powered Feedback System

This is the Choco360 internal growth platform, built with React, Vite, and Supabase. It has been transitioning from an initial prototype to a production-ready system with proper environment configurations, source control, and containerized deployment.

## 🚀 1. Local Development Setup

### Prerequisites
- Node.js 20+
- Git

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment variables example file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in the `.env.local` file with your actual keys (Supabase URL/Key, Google Client ID).
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🗄️ 2. Supabase Database Setup

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Under **Project Settings -> API**, retrieve your `Project URL` and `anon key` to put into `.env.local`.
3. In the SQL Editor, copy and paste the contents of `DATABASE_SCHEMA.sql` and run it to initialize all tables, Row-Level Security (RLS) policies, and database functions.
4. **Important**: Verify that your tables have the appropriate RLS policies for anonymous access, or the React app will not be able to read data.

## 🔐 3. Google Account Authentication

Your application uses Google Sign-In for Enterprise/Internal users.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Add your permitted origins:
   - For local development: `http://localhost:5173`
   - For production: `https://your-cloud-run-domain.a.run.app`
5. Copy the generated **Client ID** and place it in your `.env.local` as `VITE_GOOGLE_CLIENT_ID`.

## ☁️ 4. Google Cloud Run Deployment

The app is containerized via Docker and served with Nginx.

### Prerequisites
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and authenticated.

### Deployment Steps
1. Build and push the Docker image using Google Cloud Build:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/choco360
   ```
2. Deploy the image to Cloud Run:
   ```bash
   gcloud run deploy choco360 \
     --image gcr.io/YOUR_PROJECT_ID/choco360 \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars VITE_SUPABASE_URL=...,VITE_SUPABASE_ANON_KEY=...,VITE_GOOGLE_CLIENT_ID=...
   ```
*(Note: Because Vite bundles environment variables at build time, it is recommended to either pass the `--build-arg` in Docker or rely on the `.env` file present at build time before running `gcloud builds submit`. If using Cloud Build, you might want to create a `cloudbuild.yaml` to handle secrets properly.)*
