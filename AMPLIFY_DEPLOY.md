# Deploy Frontend to AWS Amplify

## Quick Deploy (Recommended)

Since you have a GitHub repository, use the Amplify Console:

### Step 1: Push to GitHub (if not already)

```bash
git push origin main
```

### Step 2: Connect to Amplify Console

1. Go to: https://console.aws.amazon.com/amplify
2. Click **"New app"** → **"Host web app"**
3. Select **"GitHub"** (or your Git provider)
4. Authorize and select repository: **AIWorkoutNow**
5. Click **"Next"**

### Step 3: Configure Build Settings

**Build settings:**
```
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

**Or use the UI:**
- Build command: `cd frontend && npm install && npm run build`
- Output directory: `frontend/dist`

### Step 4: Add Environment Variable

Click **"Advanced settings"** → **"Environment variables"**:
- **Key**: `VITE_API_URL`
- **Value**: `https://vs86hpajvb.execute-api.us-east-1.amazonaws.com`

### Step 5: Deploy

Click **"Save and deploy"**

Amplify will:
1. Clone your repository
2. Install dependencies
3. Build the frontend
4. Deploy to CloudFront
5. Give you a URL like: `https://main.xxxxx.amplifyapp.com`

## Alternative: Amplify CLI

If you prefer CLI:

```bash
cd frontend
amplify init
# Follow prompts:
# - Project name: aiworkoutnow-frontend
# - Environment: production
# - Default editor: code
# - App type: javascript
# - Framework: react
# - Source directory: .
# - Distribution directory: dist
# - Build command: npm run build
# - Start command: npm run dev

amplify add hosting
# Select: Hosting with Amplify Console
# Select: Manual deployment

amplify publish
```

## Verify Deployment

After deployment, test:
1. Visit your Amplify URL
2. Try generating a workout
3. Check browser console for errors
4. Verify API calls are going to correct endpoint

## Custom Domain (Optional)

1. In Amplify Console → App settings → Domain management
2. Add custom domain
3. Configure DNS in Route 53
4. SSL certificate auto-provisioned

## Current Status

✅ Frontend built: `frontend/dist/`
✅ API Gateway: `https://vs86hpajvb.execute-api.us-east-1.amazonaws.com`
✅ Environment configured: `.env` file has API URL
✅ Git repository: Ready to push

## Troubleshooting

**Build fails:**
- Check build logs in Amplify Console
- Verify Node.js version (should be 18+)
- Check for TypeScript errors

**API calls fail:**
- Verify `VITE_API_URL` environment variable is set
- Check CORS configuration in API Gateway
- Verify Lambda function is working

**404 errors:**
- Ensure `baseDirectory` is `frontend/dist`
- Check that `index.html` is in the dist folder
- Verify SPA routing is configured

