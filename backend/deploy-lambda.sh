#!/bin/bash

# Deployment script for .NET Lambda function

set -e

FUNCTION_NAME="aiworkoutnow-api"
REGION="us-east-1"
ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/AIWorkoutNow-LambdaExecutionRole"
# Handler for ASP.NET Core Lambda with hosting package
HANDLER="bootstrap"

echo "Building .NET Lambda function..."

cd AIWorkoutNow.Api
dotnet publish -c Release -r linux-x64 --self-contained false

echo "Creating deployment package..."
cd bin/Release/net8.0/linux-x64/publish
zip -r ../../../../../../deployment-package.zip .

cd ../../../../../../

echo "Deploying Lambda function..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
    echo "Function exists, updating code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment-package.zip \
        --region $REGION
else
    echo "Function does not exist, creating..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime provided.al2023 \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://deployment-package.zip \
        --timeout 30 \
        --memory-size 512 \
        --region $REGION \
        --environment Variables="{JWT_SECRET=from-ssm,OPENAI_API_KEY=from-ssm}" \
        --architectures arm64
fi

echo "Lambda deployment complete!"
echo "Remember to:"
echo "  1. Update API Gateway to point to this Lambda"
echo "  2. Set up environment variables or use SSM Parameter Store"
echo "  3. Configure CORS in API Gateway"

