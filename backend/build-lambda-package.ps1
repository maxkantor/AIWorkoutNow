# Build Lambda deployment package (PowerShell version for Windows)
# Usage: .\build-lambda-package.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔨 Building Lambda deployment package..." -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Join-Path $ScriptDir "AIWorkoutNow.Api"
$OutputZip = Join-Path $ScriptDir "lambda-deployment.zip"
$PublishDir = Join-Path $ProjectDir "publish-lambda"

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path $PublishDir) {
    Remove-Item -Path $PublishDir -Recurse -Force
}
if (Test-Path $OutputZip) {
    Remove-Item -Path $OutputZip -Force
}

# Publish for Lambda
Write-Host "📦 Publishing .NET application..." -ForegroundColor Yellow
Push-Location $ProjectDir
try {
    dotnet publish -c Release -r linux-x64 --self-contained false -o publish-lambda
    
    if (-not (Test-Path "publish-lambda")) {
        Write-Host "❌ Publish failed" -ForegroundColor Red
        exit 1
    }
    
    # Create zip package
    Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
    Push-Location "publish-lambda"
    try {
        Compress-Archive -Path * -DestinationPath $OutputZip -Force
    }
    finally {
        Pop-Location
    }
    
    # Show package info
    $PackageSize = (Get-Item $OutputZip).Length
    $PackageSizeMB = [math]::Round($PackageSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "✅ Lambda deployment package created" -ForegroundColor Green
    Write-Host "   Package: backend/lambda-deployment.zip"
    Write-Host "   Size: $PackageSizeMB MB"
    Write-Host ""
    Write-Host "🚀 To deploy:" -ForegroundColor Cyan
    Write-Host "   aws lambda update-function-code `"
    Write-Host "     --function-name aiworkoutnow-api `"
    Write-Host "     --zip-file fileb://backend/lambda-deployment.zip `"
    Write-Host "     --region us-east-1"
    Write-Host ""
    Write-Host '   Or use: deploy-backend.sh or deploy-backend.ps1' -ForegroundColor Cyan
}
finally {
    Pop-Location
}
