# ⚡ Quick Start - Deploy in 10 Minutes

## What You Need
- [ ] GitHub account
- [ ] Render account (free) - https://render.com
- [ ] This code pushed to GitHub

## 3-Step Deployment

### Step 1: Push to GitHub (2 minutes)
```bash
git add .
git commit -m "Deploy to Render"
git push origin main
```

### Step 2: Deploy on Render (3 minutes)
1. Go to https://dashboard.render.com
2. Click **New +** → **Blueprint**
3. Select your `ai-health-navigator` repo
4. Click **Apply**

### Step 3: Add Environment Variables (5 minutes)

Copy-paste these into Render Environment tab:

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-strong-session-secret-here
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL_ID=gemini-2.5-flash
ALLOW_GEMINI_FALLBACK=true
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-haiku-20240307-v1:0
```

**After first deploy**, add these with your actual Render URL:
```
GOOGLE_CALLBACK_URL=https://YOUR-URL.onrender.com/auth/google/callback
APP_BASE_URL=https://YOUR-URL.onrender.com
```

Then click **Manual Deploy** → **Deploy latest commit**

## ✅ Done!

Wait 5-10 minutes for build to complete.

Your app will be live at: `https://YOUR-SERVICE-NAME.onrender.com`

## Test It

1. Open your Render URL
2. Click "Continue as Guest"
3. Ask: "What are symptoms of flu?"
4. ✨ You should get an AI response!

## What Works

✅ AI Chat (Gemini)
✅ Guest login
✅ Document analysis
✅ Hospital locator
✅ Medical records

## What Needs Setup

⚠️ Google OAuth - Update callback URL in Google Console
⚠️ AWS Bedrock - Add AWS credentials when available

## 🎉 That's It!

Your AI Health Navigator is now live and working!

For detailed instructions, see: `deploy-to-render.md`
