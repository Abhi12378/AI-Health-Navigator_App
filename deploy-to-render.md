# 🚀 Deploy AI Health Navigator to Render - Step by Step

## Prerequisites
- GitHub account
- Render account (free tier works) - Sign up at https://render.com

## Step-by-Step Instructions

### 1️⃣ Commit and Push Your Code

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

If you don't have a remote repository yet:
```bash
# Create a new repo on GitHub first, then:
git remote add origin https://github.com/YOUR-USERNAME/ai-health-navigator.git
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** in the top right
3. **Select "Blueprint"**
4. **Connect your GitHub account** (if not already connected)
5. **Select your repository**: `ai-health-navigator`
6. **Render will detect `render.yaml`** automatically
7. **Click "Apply"** to create the service

### 3️⃣ Configure Environment Variables

Once the service is created, go to **Environment** tab and add these variables:

#### Essential Variables (Add these first):
```
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-strong-session-secret-here
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL_ID=gemini-2.5-flash
ALLOW_GEMINI_FALLBACK=true
BEDROCK_RECHECK_INTERVAL_MS=120000
```

#### Google OAuth (for login):
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**IMPORTANT**: After deployment, you'll get a URL like `https://ai-health-navigator-xxxx.onrender.com`

Then add:
```
GOOGLE_CALLBACK_URL=https://YOUR-ACTUAL-URL.onrender.com/auth/google/callback
APP_BASE_URL=https://YOUR-ACTUAL-URL.onrender.com
```

#### Google Maps (for hospital locator):
```
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

#### AWS (Optional - for Bedrock/Claude):
```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-haiku-20240307-v1:0
```

Note: AWS credentials will be added when you have fresh ones. The app will work with Gemini in the meantime.

### 4️⃣ Update Google OAuth Settings

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://YOUR-ACTUAL-URL.onrender.com/auth/google/callback
   ```
4. Click **Save**

### 5️⃣ Trigger Deployment

In Render dashboard:
1. Go to your service
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait 5-10 minutes for the build to complete

### 6️⃣ Verify Your Deployment

Once deployed, test these endpoints:

**Health Check:**
```
https://YOUR-URL.onrender.com/healthz
```
Expected: `{"ok": true}`

**API Test:**
```
https://YOUR-URL.onrender.com/api/user
```
Expected: `null` (not logged in)

**Main App:**
```
https://YOUR-URL.onrender.com
```
Expected: Login page loads

### 7️⃣ Test Core Features

1. ✅ **Guest Login**: Click "Continue as Guest"
2. ✅ **AI Chat**: Send a message like "What are symptoms of flu?"
3. ✅ **Document Upload**: Click upload icon, select a PDF or image
4. ✅ **Hospital Locator**: Click hospital icon, allow location access
5. ✅ **Google Login**: Click "Sign in with Google" (after callback URL is set)

---

## 🎉 Success!

Your app is now live at: `https://YOUR-URL.onrender.com`

Share this link with anyone to access your AI Health Navigator!

---

## ⚠️ Important Notes

### Free Tier Limitations:
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds to wake up
- Upgrade to paid tier ($7/month) for always-on service

### Data Persistence:
- Current version stores data in memory
- Data resets when service restarts
- For production, implement database storage

### Security:
- Rotate all API keys after testing
- Use strong SESSION_SECRET in production
- Never commit `.env.local` to git

---

## 🔧 Troubleshooting

**Build Failed:**
- Check Render logs for specific errors
- Ensure Docker is properly configured
- Verify all dependencies are in package.json

**App Loads but Chat Doesn't Work:**
- Check GEMINI_API_KEY is set correctly
- View Render logs for API errors
- Verify Gemini API quota isn't exceeded

**Google Login Fails:**
- Ensure callback URL matches exactly (including https://)
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Verify OAuth consent screen is configured

**Hospital Locator Fails:**
- Check GOOGLE_MAPS_API_KEY is set
- Ensure Places API is enabled in Google Cloud Console
- Verify API key has no restrictions blocking your domain

---

## 📞 Need Help?

Check the logs in Render dashboard:
1. Go to your service
2. Click **Logs** tab
3. Look for error messages

Common issues are usually:
- Missing environment variables
- Incorrect callback URLs
- API key restrictions

---

## 🚀 Next Steps

Once deployed and working:

1. **Test all features thoroughly**
2. **Rotate API keys for security**
3. **Set up custom domain** (optional)
4. **Add database for persistence** (recommended for production)
5. **Set up monitoring and alerts**
6. **Implement automated tests**

Enjoy your deployed AI Health Navigator! 🏥✨
