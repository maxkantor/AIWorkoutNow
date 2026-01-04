#!/bin/bash

# Build Lambda deployment package
set -e

echo "🔨 Building Lambda deployment package..."
echo ""

cd "$(dirname "$0")/AIWorkoutNow.Api"

# Clean previous builds
rm -rf publish-lambda
rm -f ../lambda-deployment.zip

# Publish for Lambda
echo "📦 Publishing .NET application..."
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-lambda

if [ ! -d "publish-lambda" ]; then
    echo "❌ Publish failed"
    exit 1
fi

# Create zip package
echo "📦 Creating deployment package..."
cd publish-lambda
zip -r ../../lambda-deployment.zip . > /dev/null
cd ../..

# Show package info
PACKAGE_SIZE=$(ls -lh lambda-deployment.zip | awk '{print $5}')
echo "✅ Lambda deployment package created"
echo "   Package: backend/lambda-deployment.zip"
echo "   Size: $PACKAGE_SIZE"
echo ""
echo "🚀 To deploy:"
echo "   aws lambda update-function-code \\"
echo "     --function-name aiworkoutnow-api \\"
echo "     --zip-file fileb://backend/lambda-deployment.zip \\"
echo "     --region us-east-1"
echo ""
echo "   Or use: ./deploy-backend.sh"

