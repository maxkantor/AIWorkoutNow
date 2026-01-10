#!/bin/bash

# Deploy frontend to AWS Amplify
set -e

echo "🚀 Deploying Frontend to AWS Amplify..."

cd frontend

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    echo "VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com" > .env
    echo "Please update .env with your API Gateway URL before deploying"
fi

# Build frontend
echo "🔨 Building frontend..."
npm run build

echo "✅ Frontend built successfully!"
echo ""
echo "📝 To deploy to Amplify:"
echo ""
echo "Option 1: AWS Amplify Console (Recommended)"
echo "  1. Go to https://console.aws.amazon.com/amplify"
echo "  2. Click 'New app' → 'Host web app'"
echo "  3. Connect your Git repository (GitHub/GitLab/Bitbucket)"
echo "  4. Build settings:"
echo "     - Build command: cd frontend && npm install && npm run build"
echo "     - Output directory: frontend/dist"
echo "  5. Add environment variable:"
echo "     - Key: VITE_API_URL"
echo "     - Value: [Your API Gateway URL]"
echo "  6. Save and deploy"
echo ""
echo "Option 2: Amplify CLI"
echo "  npm install -g @aws-amplify/cli"
echo "  amplify init"
echo "  amplify add hosting"
echo "  amplify publish"
echo ""
echo "Option 3: Manual S3 + CloudFront"
echo "  aws s3 sync dist/ s3://your-bucket-name"
echo "  aws cloudfront create-invalidation --distribution-id YOUR_ID --paths '/*'"


