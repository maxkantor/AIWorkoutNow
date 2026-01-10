#!/bin/bash

# Configure CORS for API Gateway HTTP API
# This script configures CORS at the API Gateway level for better compatibility

set -e

API_ID="vs86hpajvb"
REGION="us-east-1"
STAGE="api"

echo "🔧 Configuring CORS for API Gateway HTTP API..."
echo "   API ID: $API_ID"
echo ""

# Get the API Gateway ID (if not provided, try to find it)
if [ -z "$API_ID" ] || [ "$API_ID" == "YOUR_API_ID" ]; then
    echo "⚠️  Please set API_ID in this script"
    echo "   You can find it in: AWS Console > API Gateway > Your API > Settings"
    exit 1
fi

# Configure CORS for API Gateway HTTP API
echo "📋 Configuring CORS settings..."

aws apigatewayv2 update-api --api-id "$API_ID" --cors-configuration '{
    "AllowCredentials": false,
    "AllowHeaders": ["Content-Type", "Authorization", "X-Requested-With"],
    "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    "AllowOrigins": ["*"],
    "ExposeHeaders": ["*"],
    "MaxAge": 3600
}' --region "$REGION" || {
    echo "⚠️  Failed to configure CORS via API Gateway update"
    echo "   You may need to configure CORS manually in the AWS Console:"
    echo "   1. Go to API Gateway > Your API"
    echo "   2. Click on 'CORS' in the left menu"
    echo "   3. Configure:"
    echo "      - Allow Origins: *"
    echo "      - Allow Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH"
    echo "      - Allow Headers: Content-Type, Authorization, X-Requested-With"
    echo "      - Max Age: 3600"
    echo "   4. Save and deploy"
}

echo ""
echo "✅ CORS configuration complete!"
echo ""
echo "💡 Note: For API Gateway HTTP API, CORS should also be handled by Lambda"
echo "   The Lambda function is now configured to set CORS headers on all responses."
echo ""
echo "🚀 Next steps:"
echo "   1. Deploy the updated Lambda: ./deploy-backend.sh"
echo "   2. Test the API endpoints"
echo "   3. If CORS still fails, manually configure CORS in API Gateway Console"

