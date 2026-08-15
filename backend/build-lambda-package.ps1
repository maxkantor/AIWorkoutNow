# Build Lambda deployment package (PowerShell, ASCII-only)
$ErrorActionPreference = "Stop"

Write-Host "Building Lambda deployment package..." -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Join-Path $scriptDir "AIWorkoutNow.Api"

if (-not (Test-Path $projectDir)) {
    Write-Host "ERROR: Could not find AIWorkoutNow.Api directory in $scriptDir" -ForegroundColor Red
    exit 1
}

# Clean previous builds
$publishDir = Join-Path $projectDir "publish-lambda"
$zipFile = Join-Path $scriptDir "lambda-deployment.zip"

if (Test-Path $publishDir) {
    Remove-Item -Path $publishDir -Recurse -Force
}
if (Test-Path $zipFile) {
    Remove-Item -Path $zipFile -Force
}

# Publish for Lambda (framework-dependent for dotnet10 runtime - smaller package)
Write-Host "Publishing .NET application..." -ForegroundColor Cyan
Push-Location $projectDir

try {
    dotnet publish -c Release -r linux-arm64 --self-contained false -o publish-lambda

    if (-not (Test-Path "publish-lambda")) {
        Write-Host "ERROR: Publish failed" -ForegroundColor Red
        exit 1
    }

    # Create zip package (dotnet10 runtime - no bootstrap needed)
    Write-Host "Creating deployment package..." -ForegroundColor Cyan
    Compress-Archive -Path "publish-lambda\*" -DestinationPath $zipFile -Force

    # Show package info
    $zipInfo = Get-Item $zipFile
    $sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

    Write-Host ""
    Write-Host "Lambda deployment package created" -ForegroundColor Green
    Write-Host "   Package: $zipFile"
    Write-Host "   Size: $sizeMB MB"
    Write-Host ""
    Write-Host "To deploy:" -ForegroundColor Cyan
    Write-Host "   aws lambda update-function-code --function-name aiworkoutnow-api --zip-file fileb://backend/lambda-deployment.zip --region us-east-1"
    Write-Host "   Or use: ./deploy-backend.sh"
}
finally {
    Pop-Location
}
