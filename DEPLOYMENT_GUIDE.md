# Quick Deployment Guide - AI Health Navigator

## 🚀 FASTEST METHOD: Deploy to Render (5 minutes)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy on Render
1. Go to https://render.com (sign up if needed)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Click **Apply**

### Step 3: Set Environment Variables in Render Dashboard

Go to your service → **Environment** tab and add:

**Required (Minimum):**
```
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-strong-session-secret-here
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL_ID=gemini-2.5-flash
ALLOW_GEMINI_FALLBACK=true
```

**For AWS Bedrock (Optional but recommended):**
```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-haiku-20240307-v1:0
```
Note: You'll need to add AWS credentials when you have fresh ones

**For Google OAuth:**
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://YOUR-SERVICE-NAME.onrender.com/auth/google/callback
APP_BASE_URL=https://YOUR-SERVICE-NAME.onrender.com
```

**For Hospital Locator:**
```
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### Step 4: Update Google OAuth Callback
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client
3. Add to **Authorized redirect URIs**: `https://YOUR-SERVICE-NAME.onrender.com/auth/google/callback`
4. Save

### Step 5: Deploy
Click **Manual Deploy** → **Deploy latest commit**

Wait 5-10 minutes for build to complete.

Your app will be live at: `https://YOUR-SERVICE-NAME.onrender.com`

---

## 🔧 ALTERNATIVE: Local Docker Test

Test locally before deploying:

```bash
# Build and run
docker compose up --build

# Access at http://localhost:3000
```

---

## ✅ Verify Deployment

Once deployed, test these URLs:

1. **Health Check**: `https://YOUR-SERVICE.onrender.com/healthz`
   - Should return: `{"ok": true}`

2. **API Test**: `https://YOUR-SERVICE.onrender.com/api/user`
   - Should return: `null` (not logged in)

3. **Main App**: `https://YOUR-SERVICE.onrender.com`
   - Should load the login page

---

## 🎯 What Works Out of the Box

✅ AI Chat (using Gemini fallback)
✅ Guest mode login
✅ Document upload and analysis
✅ Hospital locator (with Google Maps API)
✅ Medical history tracking
✅ Lab reports and prescriptions

⚠️ Needs AWS credentials for:
- AWS Bedrock (Claude AI)
- AWS Textract (advanced document analysis)
- AWS Comprehend Medical

⚠️ Google OAuth needs callback URL update

---

## 🔒 Security Notes

**IMPORTANT:** The API keys in this guide are from your `.env.local` file. For production:

1. **Rotate these credentials immediately after testing:**
   - Gemini API key
   - Google OAuth credentials
   - AWS credentials (when you add them)

2. **Generate a strong SESSION_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Never commit `.env.local` to git** (already in .gitignore ✓)

---

## 📊 Expected Deployment Time

- Render: 5-10 minutes (first deploy)
- Subsequent deploys: 3-5 minutes

---

## 🆘 Troubleshooting

**Build fails:**
- Check Render logs for specific error
- Ensure all dependencies in package.json

**App loads but chat doesn't work:**
- Verify GEMINI_API_KEY is set
- Check Render logs for API errors

**Google login fails:**
- Verify callback URL matches exactly
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

**Hospital locator fails:**
- Verify GOOGLE_MAPS_API_KEY is set
- Ensure Places API is enabled in Google Cloud Console

---

## 🎉 Success Criteria

Your deployment is 100% working when:

✅ App loads at your Render URL
✅ Can login as guest
✅ Can send chat messages and get AI responses
✅ Can upload documents for analysis
✅ Can search for nearby hospitals
✅ Can view and manage medical records

