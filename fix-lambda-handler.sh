#!/bin/bash

# Script to fix Lambda handler configuration (Cross-platform)
set -e

FUNCTION_NAME="aiworkoutnow-api"
REGION="us-east-1"

echo "🔧 Fixing Lambda handler configuration..."
echo ""

# Check if function exists
if ! aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
    echo "❌ Lambda function not found: $FUNCTION_NAME"
    echo "   Please deploy the function first using:"
    echo "     - Windows: .\deploy-backend.ps1"
    echo "     - macOS/Linux: ./deploy-backend.sh"
    exit 1
fi

echo "✅ Found Lambda function: $FUNCTION_NAME"
echo ""

# Update handler to correct format for .NET 8 with ASP.NET Core
echo "📝 Updating handler configuration..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" \
    --runtime "dotnet8" \
    --architectures "x86_64" \
    --output json > /dev/null

echo "✅ Handler updated successfully!"
echo ""
echo "📋 Updated configuration:"
echo "   Handler: AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync"
echo "   Runtime: dotnet8"
echo "   Architecture: x86_64"
echo ""
echo "🔄 If the function still fails, you may need to:"
echo "   1. Rebuild the deployment package:"
echo "      - Windows: cd backend && .\build-lambda-package.ps1"
echo "      - macOS/Linux: cd backend && ./build-lambda-package.sh"
echo "   2. Redeploy:"
echo "      - Windows: .\deploy-backend.ps1"
echo "      - macOS/Linux: ./deploy-backend.sh"
echo ""
