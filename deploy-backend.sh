#!/bin/bash

# Deploy backend to Lambda
set -e

echo "🚀 Deploying Backend to Lambda..."

# Get AWS account and region
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
REGION=${AWS_REGION:-us-east-1}
FUNCTION_NAME="aiworkoutnow-api"

echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"

# Deploy CDK stack first if not deployed
echo "📦 Checking CDK infrastructure..."
cd infrastructure/cdk
if ! aws cloudformation describe-stacks --stack-name AIWorkoutNowStack &>/dev/null; then
    echo "Deploying CDK stack..."
    npm run build
    npx cdk deploy --require-approval never
fi

# Get Lambda role ARN
ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name AIWorkoutNowStack \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
    # Fallback: construct role ARN
    ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/AIWorkoutNow-LambdaExecutionRole"
    echo "⚠️  Using fallback role ARN: $ROLE_ARN"
else
    echo "✅ Found role ARN: $ROLE_ARN"
fi

cd ../../backend

# Check if pre-built package exists, otherwise build it
if [ -f "lambda-deployment.zip" ]; then
    echo "✅ Using existing Lambda deployment package: lambda-deployment.zip"
else
    echo "🔨 Building Lambda deployment package..."
    # Try PowerShell script first on Windows, then bash script
    if [ -f "build-lambda-package.ps1" ] && command -v powershell &> /dev/null; then
        powershell -ExecutionPolicy Bypass -File build-lambda-package.ps1
    elif [ -f "build-lambda-package.sh" ]; then
        bash build-lambda-package.sh || ./build-lambda-package.sh
    else
        echo "❌ Build script not found"
        exit 1
    fi
fi

echo "🚀 Deploying to Lambda..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
    echo "Function exists, updating code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-deployment.zip \
        --region $REGION \
        --output json > /dev/null
    
    # Update environment variables and handler
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --region $REGION \
        --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" \
        --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" \
        --timeout 30 \
        --memory-size 512 \
        --output json > /dev/null
    
    echo "✅ Lambda function updated!"
else
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime dotnet8 \
        --role "$ROLE_ARN" \
        --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" \
        --zip-file fileb://lambda-deployment.zip \
        --timeout 30 \
        --memory-size 512 \
        --region $REGION \
        --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" \
        --architectures x86_64 \
        --output json > /dev/null
    
    echo "✅ Lambda function created!"
fi

# Get function ARN
FUNCTION_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)
echo "Function ARN: $FUNCTION_ARN"

echo ""
echo "✅ Backend deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Set up API Gateway HTTP API"
echo "  2. Create routes pointing to this Lambda"
echo "  3. Enable CORS"
echo "  4. Deploy API and get the endpoint URL"

