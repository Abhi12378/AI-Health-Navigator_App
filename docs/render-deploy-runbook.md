# Render Full-Stack Deployment Runbook

Use this to launch a fully working prototype link (frontend + backend on one URL).

## 1) Create the Render service

1. Push latest code to GitHub.
2. Open Render dashboard.
3. Click **New +** -> **Blueprint**.
4. Select this repository.
5. Confirm it detects `render.yaml`.
6. Create service.

After first deploy, Render gives URL:

`https://<your-service>.onrender.com`

---

## 2) Set environment variables in Render

Go to **Service -> Environment -> Environment Variables**.

### Required (minimum for app startup + chat fallback)

- `NODE_ENV=production`
- `PORT=3000`
- `SESSION_SECRET=<strong-random-secret>`
- `GEMINI_API_KEY=<your-gemini-key>`
- `ALLOW_GEMINI_FALLBACK=true`
- `GEMINI_MODEL_ID=gemini-2.5-flash`

### Required (for AWS Bedrock primary model)

- `AWS_REGION=<your-bedrock-region>`
- `AWS_ACCESS_KEY_ID=<your-aws-access-key-id>`
- `AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>`
- `BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0`

Optional:
- `AWS_SESSION_TOKEN=<if-using-temporary-creds>`
- `AWS_S3_BUCKET_NAME=<bucket-name>`
- `BEDROCK_RECHECK_INTERVAL_MS=120000`

### Required (for Google login)

- `GOOGLE_CLIENT_ID=<google-oauth-client-id>`
- `GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>`
- `GOOGLE_CALLBACK_URL=https://<your-service>.onrender.com/auth/google/callback`
- `APP_BASE_URL=https://<your-service>.onrender.com`

### Required (for hospital live search)

- `GOOGLE_MAPS_API_KEY=<google-maps-places-key>`

---

## 3) Configure Google OAuth console

In Google Cloud Console -> OAuth 2.0 Client -> Authorized redirect URIs, add:

`https://<your-service>.onrender.com/auth/google/callback`

---

## 4) Redeploy after env changes

In Render service page:

- Click **Manual Deploy** -> **Deploy latest commit**

---

## 5) Verify full-stack endpoints

Open these in browser:

- `https://<your-service>.onrender.com/healthz` -> should return `{ "ok": true }`
- `https://<your-service>.onrender.com/api/user` -> should return `null` or user JSON
- `https://<your-service>.onrender.com/api/hospitals/nearby?lat=12.9716&lng=77.5946&radiusKm=30` -> hospitals JSON

App URL:

- `https://<your-service>.onrender.com`

---

## 6) If something fails

### Google Authentication not configured
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Render
- Re-check callback URL exact match in Google Console

### Bedrock AccessDenied / InvokeModel
- Ensure AWS IAM user/role used by keys has:
  - `bedrock:InvokeModel`
  - `bedrock:InvokeModelWithResponseStream`
- Ensure model access is enabled in Bedrock region
- Keep `GEMINI_API_KEY` set so fallback continues to work

### No hospitals found / real-time error
- Check `GOOGLE_MAPS_API_KEY`
- Ensure Places API is enabled in Google Cloud project

---

## 7) Production checklist

- Rotate all placeholder secrets
- Keep `.env.local` out of git
- Use least-privilege IAM policy for AWS keys
- Verify login, chat, upload, and hospitals from app UI
