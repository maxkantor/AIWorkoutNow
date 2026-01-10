#!/bin/bash

# Configure CORS for API Gateway HTTP API
# This script configures CORS at the API Gateway level for better compatibility

set -e

API_ID="vs86hpajvb"
REGION="us-east-1"

echo "🔧 Configuring CORS for API Gateway HTTP API..."
echo "   API ID: $API_ID"
echo ""

# Verify API exists
if ! aws apigatewayv2 get-api --api-id "$API_ID" --region "$REGION" > /dev/null 2>&1; then
    echo "⚠️  API Gateway not found: $API_ID"
    echo "   Trying to find your API..."
    API_ID=$(aws apigatewayv2 get-apis --region "$REGION" --query 'Items[0].ApiId' --output text 2>/dev/null || echo "")
    if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
        echo "❌ Could not find API Gateway. Please create one first: ./setup-api-gateway.sh"
        exit 1
    fi
    echo "✅ Found API: $API_ID"
fi

# Configure CORS for API Gateway HTTP API
echo "📋 Configuring CORS settings at API Gateway level..."

# Create CORS configuration JSON
CORS_CONFIG='{
    "AllowCredentials": false,
    "AllowHeaders": ["Content-Type", "Authorization", "X-Requested-With", "*"],
    "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    "AllowOrigins": ["*"],
    "ExposeHeaders": ["*"],
    "MaxAge": 3600
}'

# Update API with CORS configuration
aws apigatewayv2 update-api \
    --api-id "$API_ID" \
    --cors-configuration "$CORS_CONFIG" \
    --region "$REGION" 2>&1 | head -5 || {
    echo "⚠️  Failed to configure CORS via CLI"
    echo ""
    echo "📋 Manual Configuration (AWS Console):"
    echo "   1. Go to: https://console.aws.amazon.com/apigateway/main/apis/$API_ID/cors"
    echo "   2. Click 'Configure' or 'Edit'"
    echo "   3. Set the following:"
    echo "      - Allow Credentials: false"
    echo "      - Allow Origins: *"
    echo "      - Allow Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    echo "      - Allow Headers: Content-Type, Authorization, X-Requested-With, *"
    echo "      - Expose Headers: *"
    echo "      - Max Age: 3600"
    echo "   4. Click 'Save'"
    echo "   5. Deploy your API (if needed)"
    exit 1
}

echo "✅ CORS configured at API Gateway level!"
echo ""
echo "💡 Note: Lambda function also sets CORS headers on all responses"
echo "   This provides double protection - both API Gateway and Lambda handle CORS"
echo ""
echo "🚀 Next steps:"
echo "   1. Deploy updated Lambda: ./deploy-backend.sh"
echo "   2. Test endpoints"
echo "   3. Check CloudWatch logs if issues persist"

