#!/bin/bash

# Deploy frontend to AWS Amplify
set -e

echo "🚀 Deploying Frontend to AWS Amplify..."
echo ""

cd frontend

# Ensure .env is set
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "VITE_API_URL=https://vs86hpajvb.execute-api.us-east-1.amazonaws.com" > .env
fi

# Build frontend
echo "🔨 Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist folder not found"
    exit 1
fi

echo "✅ Frontend built successfully"
echo ""

# Check if Amplify CLI is installed
if command -v amplify &> /dev/null; then
    echo "📦 Amplify CLI found"
    echo ""
    echo "Option 1: Use Amplify CLI"
    echo "  Run: amplify init"
    echo "  Then: amplify add hosting"
    echo "  Then: amplify publish"
    echo ""
else
    echo "📦 Amplify CLI not installed"
    echo ""
    echo "Installing Amplify CLI..."
    npm install -g @aws-amplify/cli
    echo "✅ Amplify CLI installed"
    echo ""
fi

echo "📋 Amplify Deployment Options:"
echo ""
echo "Option A: AWS Amplify Console (Recommended - Easiest)"
echo "  1. Go to: https://console.aws.amazon.com/amplify"
echo "  2. Click 'New app' → 'Host web app'"
echo "  3. Connect your Git provider (GitHub/GitLab/Bitbucket)"
echo "  4. Select repository: AIWorkoutNow"
echo "  5. Build settings:"
echo "     - Build command: cd frontend && npm install && npm run build"
echo "     - Output directory: frontend/dist"
echo "  6. Environment variables:"
echo "     - Key: VITE_API_URL"
echo "     - Value: https://vs86hpajvb.execute-api.us-east-1.amazonaws.com"
echo "  7. Save and deploy"
echo ""
echo "Option B: Amplify CLI"
echo "  cd frontend"
echo "  amplify init"
echo "  amplify add hosting"
echo "  amplify publish"
echo ""
echo "Option C: Manual S3 + CloudFront"
echo "  aws s3 sync frontend/dist s3://your-bucket-name"
echo "  # Then set up CloudFront distribution"
echo ""

# Check if Git is ready
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "✅ Git repository ready"
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "No remote")
    if [ "$REMOTE_URL" != "No remote" ]; then
        echo "   Remote: $REMOTE_URL"
        echo ""
        echo "💡 To push to GitHub (if not already):"
        echo "   git push origin main"
    fi
else
    echo "⚠️  Not a git repository"
fi

echo ""
echo "✅ Frontend is ready for deployment!"
echo "   Build output: frontend/dist/"
echo "   API URL configured: $(grep VITE_API_URL .env | cut -d'=' -f2)"


