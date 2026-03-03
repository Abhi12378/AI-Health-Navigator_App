# AI Health Navigator

AI Health Navigator is a full-stack healthcare assistant that helps users:
- chat about symptoms with medical safety guardrails,
- upload and analyze medical documents,
- find nearby hospitals using live location,
- track lab reports and prescriptions,
- authenticate with Google OAuth or continue as guest.

> ⚠️ Important: This app provides educational guidance only and is **not** a substitute for professional medical diagnosis or treatment.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [AI Routing & Fallback Behavior](#ai-routing--fallback-behavior)
- [Data Storage Notes](#data-storage-notes)
- [Security & Privacy Notes](#security--privacy-notes)
- [Troubleshooting](#troubleshooting)
- [Deployment Notes](#deployment-notes)

---

## Key Features

### 1) AI Health Chat
- Primary model path uses AWS Bedrock (Claude).
- Automatic Gemini fallback path is available when Bedrock is unavailable (based on error conditions and configuration).
- Structured response style with health safety advisories and disclaimers.

### 2) Medical Document Analysis
- Supports upload of PDF and image files.
- Converts/normalizes unsupported image formats for analysis where possible.
- Extracts structured findings (e.g., summary, abnormal values, urgency/safety cues).

### 3) Lab Reports & Prescriptions Management
- Separate APIs and UI sections for:
   - lab reports,
   - prescriptions.
- Basic document-type validation/classification for prescription uploads.

### 4) Hospital Locator
- Uses user geolocation and Google Places nearby search.
- Returns nearby hospitals with distance/open status.
- Supports quick actions for maps navigation and phone dialing.

### 5) Emergency-Oriented UX
- Emergency mode with nearest-hospital lookup.
- UI flow for emergency alert confirmation and logging.

### 6) Authentication
- Google OAuth via Passport.
- Guest mode for quick access.
- Session-backed user context for authenticated routes.

### 7) Admin Analytics UI
- Dashboard view with charts and usage metrics (UI-level analytics simulation).

---

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- React Router
- Framer Motion
- Recharts
- Lucide React
- React Markdown

### Backend
- Node.js + Express
- TypeScript runtime via `tsx`
- `express-session`
- Passport + `passport-google-oauth20`
- `dotenv`

### AI & Cloud Integrations
- AWS Bedrock Runtime (Claude)
- Google Gemini (`@google/genai`) for fallback/document-related model interactions
- AWS Textract
- AWS Comprehend Medical
- AWS S3 client integration
- Google Places API (hospital discovery)

### Tooling
- TypeScript compiler checks (`tsc --noEmit`)
- Vite build/preview
- Custom verification scripts under `scripts/`

---

## Architecture Overview

1. The server (`server.ts`) runs an Express API on port `3000`.
2. In development, Vite middleware is attached to the same server.
3. Frontend pages call `/api/*` endpoints for chat, auth status, history, hospitals, reports, and prescriptions.
4. AI requests are routed to Bedrock first, then optionally Gemini fallback.
5. Sessions are managed through `express-session` + Passport.

---

## Project Structure

```text
.
├── server.ts                     # Express server + API routes + AI orchestration
├── src/
│   ├── App.tsx                   # Route wiring and auth-protected navigation
│   ├── pages/
│   │   ├── LoginPage.tsx         # Google/guest login
│   │   ├── ChatPage.tsx          # Main assistant UI
│   │   └── AdminDashboard.tsx    # Analytics dashboard UI
│   ├── components/
│   │   ├── DocumentUploadModal.tsx
│   │   ├── HospitalLocator.tsx
│   │   ├── PrivacyCenter.tsx
│   │   ├── RiskAssessmentCard.tsx
│   │   └── ...
│   ├── context/AuthContext.tsx   # Auth state management
│   ├── config/passport.ts        # Google OAuth strategy config
│   ├── services/authService.ts   # Auth API helpers
│   └── utils/api.ts              # API wrapper
├── scripts/                      # Health checks and flow verification scripts
├── package.json
└── README.md
```

---

## Environment Variables

Create a `.env.local` file in the project root.

### Required for AI and cloud flows

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini access (fallback/document flows). |
| `AWS_REGION` | AWS region (e.g., `us-east-1`). |
| `AWS_ACCESS_KEY_ID` | AWS credential (if not using profile/default chain). |
| `AWS_SECRET_ACCESS_KEY` | AWS credential (if not using profile/default chain). |
| `AWS_S3_BUCKET_NAME` | S3 bucket name used by the app integration. |

### Optional / recommended

| Variable | Default / Behavior |
|---|---|
| `AWS_SESSION_TOKEN` | Optional session token for temporary AWS creds. |
| `AWS_PROFILE` | If set, shared AWS profile/default provider chain is used. |
| `BEDROCK_MODEL_ID` | Default: `anthropic.claude-3-haiku-20240307-v1:0`. |
| `GEMINI_MODEL_ID` | Default: `gemini-2.5-flash`. |
| `ALLOW_GEMINI_FALLBACK` | Default: `true`. |
| `BEDROCK_RECHECK_INTERVAL_MS` | Default: `120000` (min effective floor is `30000`). |
| `GOOGLE_MAPS_API_KEY` | If missing, code attempts to reuse `GEMINI_API_KEY`. |
| `GOOGLE_CLIENT_ID` | Required for Google OAuth login. |
| `GOOGLE_CLIENT_SECRET` | Required for Google OAuth login. |
| `GOOGLE_CALLBACK_URL` | Optional explicit callback URL override. |
| `APP_BASE_URL` | Used for callback URL construction when needed. |
| `SESSION_SECRET` | Session signing secret (set a strong value in production). |
| `NODE_ENV` | Runtime environment (`production` affects cookie config). |

### Google OAuth callback note

If using Google login locally, typical callback URL is:

`http://localhost:3000/auth/google/callback`

Use the same value in Google Cloud Console (Authorized redirect URIs).

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+ recommended
- npm
- AWS and Gemini credentials for AI features

### 1) Install dependencies

```bash
npm install
```

If PowerShell policy causes issues:

```powershell
npm.cmd install
```

### 2) Configure environment

Create `.env.local` and fill variables listed above.

### 3) Start development server

```bash
npm run dev
```

PowerShell alternative:

```powershell
npm.cmd run dev
```

App runs at:

`http://localhost:3000`

---

## Run with Docker

### Prerequisites
- Docker Desktop installed and running

### 1) Configure environment

Create `.env.local` from `.env.example` and set required values.

### 2) Build and run with Docker Compose

```bash
docker compose up -d --build
```

### 3) Check status/logs

```bash
docker compose ps
docker compose logs -f
```

### 4) Stop containers

```bash
docker compose down
```

### Direct Docker commands (optional)

```bash
npm run docker:build
npm run docker:run
```

---

## Available Scripts

From `package.json`:

```bash
npm run dev      # Start Express + Vite middleware (tsx server.ts)
npm run build    # Build frontend with Vite
npm run preview  # Preview Vite build
npm run lint     # TypeScript type-check only (no emit)
npm run clean    # Remove dist (Unix command: rm -rf dist)
```

### Verification scripts

The `scripts/` folder includes helper checks such as:
- `health-check.js`
- `verify-chat-modes.js`
- `verify-lab-reports-flow.js`
- `verify-prescriptions-rules.js`
- `verify-webp-analysis.js`
- and more.

Run directly with Node when needed:

```bash
node scripts/health-check.js
```

---

## API Endpoints

### Chat & AI
- `POST /api/chat`
   - Main chat endpoint.
   - Handles standard symptom chat and optional file-attached analysis.

### Hospital Search
- `GET /api/hospitals/nearby?lat=<number>&lng=<number>&radiusKm=<1-50>`

### Authentication & Session
- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /api/user`
- `POST /api/logout`
- `POST /api/login` (basic/mock-style route)

### Medical History
- `GET /api/medical-history`
- `POST /api/medical-history`
- `DELETE /api/medical-history/:id`

### Lab Reports
- `GET /api/lab-reports`
- `GET /api/lab-reports/:id`
- `POST /api/lab-reports`
- `DELETE /api/lab-reports/:id`

### Prescriptions
- `GET /api/prescriptions`
- `GET /api/prescriptions/:id`
- `POST /api/prescriptions`
- `DELETE /api/prescriptions/:id`

### Chats (management route)
- `DELETE /api/chats/:id`

---

## Authentication Flow

1. User clicks Google login (`/auth/google`) or guest mode.
2. Google OAuth users return to `/auth/google/callback`.
3. Session is established via Passport and `express-session`.
4. Frontend checks auth via `GET /api/user`.

Guest mode is available for non-authenticated exploration, with limited trust guarantees compared to full OAuth sessions.

---

## AI Routing & Fallback Behavior

- Primary provider: AWS Bedrock (`BEDROCK_MODEL_ID`).
- On configured/eligible failures, app falls back to Gemini (`GEMINI_MODEL_ID`) if enabled.
- Billing/access edge cases are handled with temporary Bedrock block + periodic recheck.
- Document uploads are processed through the backend and returned with structured safety-first output.

---

## Data Storage Notes

Current code stores several entities in memory (per running process), including:
- medical history,
- lab report payloads,
- prescription payloads.

Implications:
- data resets when server restarts,
- no horizontal scaling consistency,
- best suited for prototype/demo usage unless replaced with durable storage.

---

## Security & Privacy Notes

- Session cookies use `httpOnly`; production mode enables secure/sameSite adjustments.
- Avoid committing `.env.local` or secrets to source control.
- Use strong `SESSION_SECRET` in production.
- Restrict cloud IAM permissions to least privilege for Bedrock/S3/Textract/Comprehend.
- Validate and sanitize uploads in any production hardening pass.

---

## Troubleshooting

### Google login returns “not configured”
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- Confirm callback URL matches Google Cloud Console configuration.

### Hospital locator fails
- Ensure geolocation permission is granted in browser.
- Set `GOOGLE_MAPS_API_KEY` (or ensure fallback behavior is acceptable).

### AI chat/document analysis fails
- Verify AWS credentials/region/model access.
- Confirm `GEMINI_API_KEY` is valid for fallback/document paths.
- Check server logs for provider-specific error details.

### Missing data after restart
- Expected with current in-memory stores; migrate to durable DB for persistence.

---

## Deployment Notes

- Set `NODE_ENV=production`.
- Provide all required environment variables in deployment secrets.
- Configure HTTPS and trusted proxy headers if running behind a reverse proxy.
- Replace in-memory data stores with persistent storage before production use.

### Automatic AWS prototype link (App Runner)

This repository includes automatic deployment tooling for a public prototype URL on AWS App Runner.

#### Local one-command deploy

1. Ensure prerequisites:
   - Docker installed and running
   - AWS credentials configured (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or profile)
   - `AWS_REGION` set

2. Run:

```bash
npm install
npm run deploy:aws
```

This command automatically:
- creates (or reuses) an ECR repository,
- builds and pushes Docker image,
- creates (or updates) an App Runner service,
- prints your live prototype URL.

#### Fully automatic deploy from GitHub

Workflow file: `.github/workflows/deploy-apprunner.yml`

On every push to `main`, GitHub Actions deploys the latest version.

Required GitHub repository secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `SESSION_SECRET`
- `GEMINI_API_KEY` (if Gemini flows are used)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (if OAuth is used)
- optional: `GOOGLE_MAPS_API_KEY`, `AWS_SESSION_TOKEN`

Recommended GitHub repository variables:
- `APP_RUNNER_SERVICE_NAME`
- `ECR_REPOSITORY_NAME`
- `BEDROCK_MODEL_ID`
- `GEMINI_MODEL_ID`
- `ALLOW_GEMINI_FALLBACK`
- `BEDROCK_RECHECK_INTERVAL_MS`
- `GOOGLE_CALLBACK_URL`
- `APP_BASE_URL`
- `AWS_S3_BUCKET_NAME`

---

## Alternative: Full-stack prototype on Render (recommended fallback)

If App Runner or Netlify function permissions block AI/provider calls, deploy the same full-stack app on Render using Docker.

### Why Render here

- Single web service runs both UI and API (`/api/*`, `/auth/*`) together.
- No serverless cold-start role confusion for AWS SDK credentials.
- Existing `Dockerfile` already works for production.

### Quick deploy steps

1. Push this repo to GitHub (if not already).
2. In Render, click **New +** -> **Blueprint** and select this repo.
3. Render auto-detects [`render.yaml`](render.yaml) and creates the web service.
4. Add secrets from [`.env.render.example`](.env.render.example) in Render dashboard.
5. Deploy and open your Render URL.

Detailed step-by-step guide: [docs/render-deploy-runbook.md](docs/render-deploy-runbook.md)

### Required production secrets on Render

- `SESSION_SECRET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (for OAuth)
- `GOOGLE_MAPS_API_KEY` (optional but recommended)

### Google OAuth callback on Render

Set:

`GOOGLE_CALLBACK_URL=https://<your-render-service>.onrender.com/auth/google/callback`

Also add the same URL in Google Cloud Console -> OAuth -> Authorized redirect URIs.

---

## Disclaimer

This software is intended for informational and educational assistance. It does **not** provide medical diagnosis, emergency triage guarantees, or professional treatment recommendations. Always consult a licensed healthcare professional for medical decisions.
