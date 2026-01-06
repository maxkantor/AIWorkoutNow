# Add missing API Gateway routes
# Usage: .\add-missing-routes.ps1

$API_ID = "vs86hpajvb"
$REGION = "us-east-1"
$LAMBDA_ARN = "arn:aws:lambda:us-east-1:718522948657:function:aiworkoutnow-api"

Write-Host "Adding missing API Gateway routes..." -ForegroundColor Cyan
Write-Host ""

# Get the integration ID (assuming it exists)
$integrations = aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION --output json | ConvertFrom-Json
$integrationId = $integrations.Items | Where-Object { $_.IntegrationUri -like "*aiworkoutnow-api*" } | Select-Object -First 1 -ExpandProperty IntegrationId

if (-not $integrationId) {
    Write-Host "Creating Lambda integration..." -ForegroundColor Yellow
    $integrationResponse = aws apigatewayv2 create-integration `
        --api-id $API_ID `
        --integration-type AWS_PROXY `
        --integration-uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" `
        --payload-format-version "2.0" `
        --region $REGION `
        --output json | ConvertFrom-Json
    $integrationId = $integrationResponse.IntegrationId
    Write-Host "Integration created: $integrationId" -ForegroundColor Green
}

Write-Host "Using integration: $integrationId" -ForegroundColor Yellow
Write-Host ""

# Routes to create
$routes = @(
    @{ Method = "GET"; Path = "/pricing-plans" },
    @{ Method = "GET"; Path = "/user-access-status" },
    @{ Method = "GET"; Path = "/free-workouts-remaining" },
    @{ Method = "POST"; Path = "/generate-workout" },
    @{ Method = "POST"; Path = "/create-checkout-session" },
    @{ Method = "GET"; Path = "/token-balance" },
    @{ Method = "POST"; Path = "/contact" },
    @{ Method = "POST"; Path = "/track-affiliate-click" },
    @{ Method = "GET"; Path = "/admin/stats" },
    @{ Method = "GET"; Path = "/admin/customers" },
    @{ Method = "GET"; Path = "/admin/customers/{deviceId}" },
    @{ Method = "GET"; Path = "/admin/customers/{deviceId}/activities" },
    @{ Method = "POST"; Path = "/admin/customers/{deviceId}/reset-tokens" },
    @{ Method = "GET"; Path = "/admin/contacts" },
    @{ Method = "GET"; Path = "/admin/contacts/{messageId}" },
    @{ Method = "POST"; Path = "/admin/contacts/{messageId}/reply" },
    @{ Method = "GET"; Path = "/admin/purchases" },
    @{ Method = "GET"; Path = "/admin/activities" },
    @{ Method = "GET"; Path = "/admin/pricing-plans" },
    @{ Method = "POST"; Path = "/admin/pricing-plans" },
    @{ Method = "DELETE"; Path = "/admin/pricing-plans/{planId}" },
    @{ Method = "POST"; Path = "/stripe-webhook" }
)

foreach ($route in $routes) {
    $routeKey = "$($route.Method) $($route.Path)"
    Write-Host "Creating route: $routeKey" -ForegroundColor Yellow
    
    try {
        aws apigatewayv2 create-route `
            --api-id $API_ID `
            --route-key $routeKey `
            --target "integrations/$integrationId" `
            --region $REGION `
            --output json | Out-Null
        Write-Host "  Created: $routeKey" -ForegroundColor Green
    }
    catch {
        Write-Host "  Route may already exist: $routeKey" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Routes added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure CORS in API Gateway (CORS section in left sidebar)"
Write-Host "2. Deploy the API to a stage"
Write-Host "3. Test the endpoints"
