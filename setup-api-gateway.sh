#!/bin/bash

# Automated API Gateway setup for AIWorkoutNow
set -e

echo "🌐 Setting up API Gateway..."
echo ""

REGION="us-east-1"
LAMBDA_NAME="aiworkoutnow-api"
API_NAME="aiworkoutnow-api"

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name $LAMBDA_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)

if [ -z "$LAMBDA_ARN" ]; then
    echo "❌ Lambda function not found: $LAMBDA_NAME"
    echo "   Please deploy Lambda first: ./deploy-backend.sh"
    exit 1
fi

echo "✅ Found Lambda: $LAMBDA_ARN"
echo ""

# Check if API already exists
EXISTING_API=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='$API_NAME'].ApiId" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_API" ] && [ "$EXISTING_API" != "None" ]; then
    echo "⚠️  API Gateway already exists: $EXISTING_API"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing API..."
        aws apigatewayv2 delete-api --api-id "$EXISTING_API" --region $REGION > /dev/null
        sleep 5
    else
        API_ID="$EXISTING_API"
        echo "Using existing API: $API_ID"
    fi
fi

# Create API if needed
if [ -z "$API_ID" ]; then
    echo "📦 Creating HTTP API..."
    API_ID=$(aws apigatewayv2 create-api \
        --name "$API_NAME" \
        --protocol-type HTTP \
        --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,PUT,DELETE,OPTIONS",AllowHeaders="*",MaxAge=300 \
        --region $REGION \
        --query 'ApiId' \
        --output text)
    echo "✅ Created API: $API_ID"
fi

# Create Lambda integration
echo "🔗 Creating Lambda integration..."
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_ARN" \
    --payload-format-version "2.0" \
    --region $REGION \
    --query 'IntegrationId' \
    --output text 2>/dev/null || \
    aws apigatewayv2 get-integrations \
        --api-id "$API_ID" \
        --region $REGION \
        --query 'Items[0].IntegrationId' \
        --output text)

echo "✅ Integration ID: $INTEGRATION_ID"
echo ""

# Create routes
echo "🛣️  Creating routes..."

# POST /generate-workout
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST /generate-workout" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || echo "Route POST /generate-workout already exists or failed"
echo "✅ Route: POST /generate-workout"

# POST /contact
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST /contact" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || echo "Route POST /contact already exists or failed"
echo "✅ Route: POST /contact"

# GET /token-balance
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "GET /token-balance" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || echo "Route GET /token-balance already exists or failed"
echo "✅ Route: GET /token-balance"

# POST /admin/login
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST /admin/login" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || echo "Route POST /admin/login already exists or failed"
echo "✅ Route: POST /admin/login"

# GET /admin/stats
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "GET /admin/stats" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || echo "Route GET /admin/stats already exists or failed"
echo "✅ Route: GET /admin/stats"

# POST /admin/send-email
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST /admin/send-email" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || echo "Route POST /admin/send-email already exists or failed"
echo "✅ Route: POST /admin/send-email"

# Catch-all route for OPTIONS (CORS preflight)
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "OPTIONS /{proxy+}" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || echo "Route OPTIONS already exists or failed"
echo "✅ Route: OPTIONS (CORS preflight)"
echo ""

# Create default stage
echo "🚀 Creating default stage..."
aws apigatewayv2 create-stage \
    --api-id "$API_ID" \
    --stage-name "\$default" \
    --auto-deploy \
    --region $REGION > /dev/null 2>&1 || echo "Stage already exists"
echo "✅ Stage created with auto-deploy"
echo ""

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id "$API_ID" --region $REGION --query 'ApiEndpoint' --output text)

echo "✅ API Gateway setup complete!"
echo ""
echo "📋 API Details:"
echo "   API ID: $API_ID"
echo "   API Endpoint: $API_ENDPOINT"
echo "   Region: $REGION"
echo ""
echo "🔗 Your API is live at:"
echo "   $API_ENDPOINT"
echo ""
echo "📝 Test endpoints:"
echo "   POST $API_ENDPOINT/generate-workout"
echo "   POST $API_ENDPOINT/contact"
echo "   GET  $API_ENDPOINT/token-balance?deviceId=test"
echo "   POST $API_ENDPOINT/admin/login"
echo ""
echo "🌐 Next: Update frontend .env file:"
echo "   VITE_API_URL=$API_ENDPOINT"
echo ""

# Save to file
echo "$API_ENDPOINT" > /tmp/api-endpoint.txt
echo "✅ API endpoint saved to /tmp/api-endpoint.txt"
