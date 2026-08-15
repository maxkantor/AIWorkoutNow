#!/bin/bash

# Complete deployment script for AIWorkoutNow
set -e

echo "🚀 Starting complete deployment of AIWorkoutNow..."
echo ""

# Step 1: Deploy CDK Infrastructure
echo "📦 Step 1: Deploying CDK Infrastructure..."
cd infrastructure/cdk
npm run build

if aws cloudformation describe-stacks --stack-name AIWorkoutNowStack &>/dev/null; then
    echo "Stack exists, updating..."
    npx cdk deploy --require-approval never
else
    echo "Creating new stack..."
    npx cdk deploy --require-approval never
fi

# Wait for stack to be ready
echo "Waiting for stack to be ready..."
MAX_WAIT=300
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(aws cloudformation describe-stacks --stack-name AIWorkoutNowStack --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    if [ "$STATUS" = "CREATE_COMPLETE" ] || [ "$STATUS" = "UPDATE_COMPLETE" ]; then
        echo "✅ Stack ready!"
        break
    elif [ "$STATUS" = "CREATE_FAILED" ] || [ "$STATUS" = "UPDATE_FAILED" ] || [ "$STATUS" = "ROLLBACK_COMPLETE" ]; then
        echo "❌ Stack deployment failed with status: $STATUS"
        exit 1
    else
        echo "   Status: $STATUS (waiting...)"
        sleep 5
        ELAPSED=$((ELAPSED + 5))
    fi
done

# Get outputs
ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name AIWorkoutNowStack \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text)

echo "✅ CDK Infrastructure deployed"
echo "   Role ARN: $ROLE_ARN"
echo ""

# Step 2: Build and Deploy Lambda
echo "🔨 Step 2: Building Lambda function..."
cd ../../backend/AIWorkoutNow.Api
dotnet publish -c Release -r linux-x64 --self-contained false -o publish

echo "📦 Creating deployment package..."
cd publish
zip -r ../deployment-package.zip . > /dev/null
cd ..

echo "🚀 Deploying Lambda function..."
if aws lambda get-function --function-name aiworkoutnow-api --region us-east-1 &>/dev/null; then
    echo "Updating existing function..."
    aws lambda update-function-code \
        --function-name aiworkoutnow-api \
        --zip-file fileb://deployment-package.zip \
        --region us-east-1 > /dev/null
    
    aws lambda update-function-configuration \
        --function-name aiworkoutnow-api \
        --region us-east-1 \
        --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" \
        --timeout 30 \
        --memory-size 512 > /dev/null
    
    echo "✅ Lambda function updated"
else
    echo "Creating new function..."
    aws lambda create-function \
        --function-name aiworkoutnow-api \
        --runtime dotnet10 \
        --role "$ROLE_ARN" \
        --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" \
        --zip-file fileb://deployment-package.zip \
        --timeout 30 \
        --memory-size 512 \
        --region us-east-1 \
        --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" \
        --architectures arm64 > /dev/null
    
    echo "✅ Lambda function created"
fi

FUNCTION_ARN=$(aws lambda get-function --function-name aiworkoutnow-api --region us-east-1 --query 'Configuration.FunctionArn' --output text)
echo "   Function ARN: $FUNCTION_ARN"
echo ""

# Step 3: Build Frontend
echo "🎨 Step 3: Building Frontend..."
cd ../../frontend
npm run build
echo "✅ Frontend built successfully"
echo ""

# Step 4: Summary
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps (Manual):"
echo ""
echo "1. Set up API Gateway:"
echo "   - Go to: https://console.aws.amazon.com/apigateway"
echo "   - Create HTTP API"
echo "   - Add Lambda integration: aiworkoutnow-api"
echo "   - Create routes: POST /generate-workout, POST /contact, etc."
echo "   - Enable CORS and deploy"
echo ""
echo "2. Update SSM Parameters:"
echo "   aws ssm put-parameter --name /aiworkoutnow/openai-api-key --value 'sk-xxx' --type SecureString --overwrite"
echo "   aws ssm put-parameter --name /aiworkoutnow/jwt-secret --value 'your-secret' --type SecureString --overwrite"
echo ""
echo "3. Deploy Frontend to Amplify:"
echo "   - Go to: https://console.aws.amazon.com/amplify"
echo "   - Connect Git repository"
echo "   - Build command: cd frontend && npm install && npm run build"
echo "   - Output: frontend/dist"
echo "   - Set VITE_API_URL environment variable"
echo ""
echo "Lambda Function: $FUNCTION_ARN"
echo "Ready for API Gateway integration!"

