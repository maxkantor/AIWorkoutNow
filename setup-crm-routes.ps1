# PowerShell script to add CRM routes to API Gateway
$ErrorActionPreference = "Stop"

Write-Host "🌐 Setting up CRM API Gateway routes..." -ForegroundColor Cyan
Write-Host ""

$REGION = "us-east-1"
$LAMBDA_NAME = "aiworkoutnow-api"
$API_NAME = "aiworkoutnow-api"

# Get Lambda ARN
Write-Host "🔍 Finding Lambda function..." -ForegroundColor Cyan
$lambdaArn = aws lambda get-function --function-name $LAMBDA_NAME --region $REGION --query 'Configuration.FunctionArn' --output text 2>$null

if (-not $lambdaArn) {
    Write-Host "❌ Lambda function not found: $LAMBDA_NAME" -ForegroundColor Red
    Write-Host "   Please deploy Lambda first: .\deploy-backend.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found Lambda: $lambdaArn" -ForegroundColor Green
Write-Host ""

# Get API ID
Write-Host "🔍 Finding API Gateway..." -ForegroundColor Cyan
$apiId = aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='$API_NAME'].ApiId" --output text 2>$null

if (-not $apiId -or $apiId -eq "None") {
    Write-Host "❌ API Gateway not found: $API_NAME" -ForegroundColor Red
    Write-Host "   Please run setup-api-gateway.sh first" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found API: $apiId" -ForegroundColor Green
Write-Host ""

# Get Integration ID
Write-Host "🔍 Finding Lambda integration..." -ForegroundColor Cyan
$integrationId = aws apigatewayv2 get-integrations --api-id $apiId --region $REGION --query 'Items[0].IntegrationId' --output text 2>$null

if (-not $integrationId) {
    Write-Host "❌ Integration not found. Creating..." -ForegroundColor Yellow
    $integrationId = aws apigatewayv2 create-integration `
        --api-id $apiId `
        --integration-type AWS_PROXY `
        --integration-uri $lambdaArn `
        --payload-format-version "2.0" `
        --region $REGION `
        --query 'IntegrationId' `
        --output text
}

Write-Host "✅ Integration ID: $integrationId" -ForegroundColor Green
Write-Host ""

# Create CRM routes
Write-Host "🛣️  Creating CRM routes..." -ForegroundColor Cyan
Write-Host ""

$routes = @(
    @{Method="GET"; Path="/admin/customers"},
    @{Method="GET"; Path="/admin/customers/{deviceId}"},
    @{Method="GET"; Path="/admin/customers/{deviceId}/activities"},
    @{Method="POST"; Path="/admin/customers/{deviceId}/reset-tokens"},
    @{Method="GET"; Path="/admin/contacts"},
    @{Method="GET"; Path="/admin/contacts/{messageId}"},
    @{Method="POST"; Path="/admin/contacts/{messageId}/reply"},
    @{Method="GET"; Path="/admin/purchases"},
    @{Method="GET"; Path="/admin/purchases/{deviceId}"},
    @{Method="GET"; Path="/admin/activities"}
)

foreach ($route in $routes) {
    $routeKey = "$($route.Method) $($route.Path)"
    Write-Host "   Creating: $routeKey" -ForegroundColor Gray
    
    $result = aws apigatewayv2 create-route `
        --api-id $apiId `
        --route-key $routeKey `
        --target "integrations/$integrationId" `
        --region $REGION 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Route: $routeKey" -ForegroundColor Green
    } else {
        if ($result -match "already exists") {
            Write-Host "   ⚠️  Route already exists: $routeKey" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ Failed to create: $routeKey" -ForegroundColor Red
            Write-Host "      $result" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "✅ CRM routes setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Added routes:" -ForegroundColor Cyan
foreach ($route in $routes) {
    Write-Host "   $($route.Method) $($route.Path)" -ForegroundColor White
}
Write-Host ""
