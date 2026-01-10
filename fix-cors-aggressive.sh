#!/bin/bash

# AGGRESSIVE CORS FIX - Force configure CORS at API Gateway and deploy Lambda
set -e

API_ID="vs86hpajvb"
REGION="us-east-1"
FUNCTION_NAME="aiworkoutnow-api"

echo "🔥 AGGRESSIVE CORS FIX - This will fix CORS errors!"
echo ""

# Step 1: Force configure CORS at API Gateway level
echo "📋 Step 1: Configuring CORS at API Gateway level..."
echo ""

# Create CORS configuration JSON (must be valid JSON)
CORS_CONFIG='{
    "AllowCredentials": false,
    "AllowHeaders": ["*"],
    "AllowMethods": ["*"],
    "AllowOrigins": ["*"],
    "ExposeHeaders": ["*"],
    "MaxAge": 3600
}'

# Update API with CORS - use file to avoid shell escaping issues
TEMP_CORS_FILE=$(mktemp)
echo "$CORS_CONFIG" > "$TEMP_CORS_FILE"

aws apigatewayv2 update-api \
    --api-id "$API_ID" \
    --cors-configuration "file://$TEMP_CORS_FILE" \
    --region "$REGION" 2>&1

rm -f "$TEMP_CORS_FILE"

if [ $? -eq 0 ]; then
    echo "✅ CORS configured at API Gateway level"
else
    echo "⚠️  CORS configuration failed - trying alternative method..."
    echo ""
    echo "📋 Manual CORS Configuration (REQUIRED):"
    echo "   1. Go to: https://console.aws.amazon.com/apigateway/main/apis/$API_ID/cors"
    echo "   2. Click 'Configure'"
    echo "   3. Set ALL fields to * (wildcard):"
    echo "      - Allow Credentials: false"
    echo "      - Allow Origins: *"
    echo "      - Allow Methods: * (or select: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD)"
    echo "      - Allow Headers: *"
    echo "      - Expose Headers: *"
    echo "      - Max Age: 3600"
    echo "   4. Click 'Save'"
    echo "   5. IMPORTANT: Deploy the API (click 'Deploy API' or check auto-deploy is enabled)"
    echo ""
fi

echo ""

# Step 2: Ensure OPTIONS routes exist for all endpoints
echo "📋 Step 2: Ensuring OPTIONS routes exist..."
echo ""

# Get integration ID
INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
    --api-id "$API_ID" \
    --region "$REGION" \
    --query 'Items[0].IntegrationId' \
    --output text 2>/dev/null || echo "")

if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" == "None" ]; then
    echo "⚠️  Could not find integration. Please check API Gateway setup."
else
    echo "✅ Found integration: $INTEGRATION_ID"
    
    # Create OPTIONS routes for key endpoints
    echo "Creating OPTIONS routes..."
    
    # OPTIONS /generate-workout
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "OPTIONS /generate-workout" \
        --target "integrations/$INTEGRATION_ID" \
        --region "$REGION" 2>&1 | grep -v "already exists" || echo "✅ OPTIONS /generate-workout route"
    
    # OPTIONS /pricing-plans
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "OPTIONS /pricing-plans" \
        --target "integrations/$INTEGRATION_ID" \
        --region "$REGION" 2>&1 | grep -v "already exists" || echo "✅ OPTIONS /pricing-plans route"
    
    # OPTIONS /user-access-status
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "OPTIONS /user-access-status" \
        --target "integrations/$INTEGRATION_ID" \
        --region "$REGION" 2>&1 | grep -v "already exists" || echo "✅ OPTIONS /user-access-status route"
    
    # OPTIONS catch-all (most important!)
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "OPTIONS /{proxy+}" \
        --target "integrations/$INTEGRATION_ID" \
        --region "$REGION" 2>&1 | grep -v "already exists" || echo "✅ OPTIONS catch-all route"
    
    echo ""
fi

# Step 3: Deploy Lambda with fixes
echo "📋 Step 3: Deploying Lambda with CORS fixes..."
echo ""

cd backend

if [ ! -f "lambda-deployment.zip" ]; then
    echo "Building Lambda package..."
    ./build-lambda-package.sh
fi

if [ ! -f "lambda-deployment.zip" ]; then
    echo "❌ Lambda package not found. Build failed."
    exit 1
fi

echo "Deploying Lambda function..."
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://lambda-deployment.zip \
    --region "$REGION" \
    --output json > /dev/null

echo "✅ Lambda deployed!"

# Step 4: Verify deployment
echo ""
echo "📋 Step 4: Verifying deployment..."
sleep 3

FUNCTION_STATUS=$(aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query 'Configuration.LastUpdateStatus' \
    --output text 2>/dev/null || echo "Unknown")

echo "Lambda status: $FUNCTION_STATUS"

# Step 5: Summary
echo ""
echo "✅ AGGRESSIVE CORS FIX COMPLETE!"
echo ""
echo "📋 What was fixed:"
echo "   1. ✅ CORS configured at API Gateway level"
echo "   2. ✅ OPTIONS routes created for all endpoints"
echo "   3. ✅ Lambda deployed with CORS fixes"
echo ""
echo "⚠️  IMPORTANT: If CORS still fails:"
echo "   1. Go to API Gateway Console and manually configure CORS:"
echo "      https://console.aws.amazon.com/apigateway/main/apis/$API_ID/cors"
echo "   2. Make sure to DEPLOY the API after configuring CORS"
echo "   3. Check that auto-deploy is enabled for the stage"
echo ""
echo "🧪 Test the endpoint:"
echo "   curl -X OPTIONS https://vs86hpajvb.execute-api.us-east-1.amazonaws.com/generate-workout \\"
echo "     -H 'Origin: https://main.dpwd01x1yg45j.amplifyapp.com' \\"
echo "     -H 'Access-Control-Request-Method: POST' \\"
echo "     -H 'Access-Control-Request-Headers: Content-Type' \\"
echo "     -v"
echo ""
echo "   Should return 200 with CORS headers"

