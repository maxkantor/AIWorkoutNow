# Deploy backend to Lambda (PowerShell version for Windows)
# Usage: .\deploy-backend.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Backend to Lambda..." -ForegroundColor Cyan
Write-Host ""

# Get AWS account and region
$AccountId = (aws sts get-caller-identity --query 'Account' --output text 2>$null)
if (-not $AccountId) {
    Write-Host "❌ Failed to get AWS account. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$FunctionName = "aiworkoutnow-api"

Write-Host "Account: $AccountId"
Write-Host "Region: $Region"
Write-Host ""

# Deploy CDK stack first if not deployed
Write-Host "📦 Checking CDK infrastructure..." -ForegroundColor Yellow
Push-Location "infrastructure/cdk"
try {
    $StackExists = aws cloudformation describe-stacks --stack-name AIWorkoutNowStack --region $Region 2>$null
    if (-not $StackExists) {
        Write-Host "Deploying CDK stack..." -ForegroundColor Yellow
        npm run build
        npx cdk deploy --require-approval never
    }
}
finally {
    Pop-Location
}

# Get Lambda role ARN
$RoleArn = aws cloudformation describe-stacks `
    --stack-name AIWorkoutNowStack `
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' `
    --output text `
    --region $Region `
    2>$null

if (-not $RoleArn -or $RoleArn -eq "None") {
    # Fallback: construct role ARN
    $RoleArn = "arn:aws:iam::${AccountId}:role/AIWorkoutNow-LambdaExecutionRole"
    Write-Host "⚠️  Using fallback role ARN: $RoleArn" -ForegroundColor Yellow
} else {
    Write-Host "✅ Found role ARN: $RoleArn" -ForegroundColor Green
}

Push-Location "backend"
try {
    # Check if pre-built package exists, otherwise build it
    $ZipPath = "lambda-deployment.zip"
    if (-not (Test-Path $ZipPath)) {
        Write-Host "🔨 Building Lambda deployment package..." -ForegroundColor Yellow
        if (Test-Path "build-lambda-package.ps1") {
            .\build-lambda-package.ps1
        } elseif (Test-Path "build-lambda-package.sh") {
            bash build-lambda-package.sh
        } else {
            Write-Host "❌ Build script not found" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ Using existing Lambda deployment package: $ZipPath" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🚀 Deploying to Lambda..." -ForegroundColor Yellow
    
    # Check if function exists
    $FunctionExists = aws lambda get-function --function-name $FunctionName --region $Region 2>$null
    
    if ($FunctionExists) {
        Write-Host "Function exists, updating code..." -ForegroundColor Yellow
        aws lambda update-function-code `
            --function-name $FunctionName `
            --zip-file "fileb://$ZipPath" `
            --region $Region `
            --output json | Out-Null
        
        # Update environment variables and handler
        aws lambda update-function-configuration `
            --function-name $FunctionName `
            --region $Region `
            --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" `
            --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" `
            --timeout 30 `
            --memory-size 512 `
            --output json | Out-Null
        
        Write-Host "✅ Lambda function updated!" -ForegroundColor Green
    } else {
        Write-Host "Creating new Lambda function..." -ForegroundColor Yellow
        aws lambda create-function `
            --function-name $FunctionName `
            --runtime dotnet8 `
            --role $RoleArn `
            --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" `
            --zip-file "fileb://$ZipPath" `
            --timeout 30 `
            --memory-size 512 `
            --region $Region `
            --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" `
            --architectures x86_64 `
            --output json | Out-Null
        
        Write-Host "✅ Lambda function created!" -ForegroundColor Green
    }
    
    # Get function ARN
    $FunctionArn = aws lambda get-function --function-name $FunctionName --region $Region --query 'Configuration.FunctionArn' --output text
    Write-Host "Function ARN: $FunctionArn" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Set up API Gateway HTTP API"
    Write-Host "  2. Create routes pointing to this Lambda"
    Write-Host "  3. Enable CORS"
    Write-Host "  4. Deploy API and get the endpoint URL"
}
finally {
    Pop-Location
}
