#!/bin/bash

# Build Lambda deployment package (Cross-platform: Windows/macOS/Linux)
set -e

echo "🔨 Building Lambda deployment package..."
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Windows;;
    MINGW*)     MACHINE=Windows;;
    MSYS*)      MACHINE=Windows;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

cd "$(dirname "$0")/AIWorkoutNow.Api"

# Clean previous builds (cross-platform)
if [ "$MACHINE" = "Windows" ]; then
    if [ -d "publish-lambda" ]; then
        rm -rf publish-lambda
    fi
    if [ -f "../lambda-deployment.zip" ]; then
        rm -f ../lambda-deployment.zip
    fi
else
    rm -rf publish-lambda
    rm -f ../lambda-deployment.zip
fi

# Publish for Lambda (using x86_64 for compatibility)
echo "📦 Publishing .NET application..."
dotnet publish -c Release -r linux-x64 --self-contained false -o publish-lambda

if [ ! -d "publish-lambda" ]; then
    echo "❌ Publish failed"
    exit 1
fi

# Create zip package (cross-platform)
echo "📦 Creating deployment package..."
cd publish-lambda

# Use PowerShell on Windows if available, otherwise use zip command
if [ "$MACHINE" = "Windows" ] && command -v powershell &> /dev/null; then
    # Use PowerShell Compress-Archive (creates zip files compatible with Lambda)
    powershell -Command "Compress-Archive -Path * -DestinationPath ..\..\lambda-deployment.zip -Force"
elif command -v zip &> /dev/null; then
    # Use zip command (available on macOS, Linux, and Git Bash on Windows)
    zip -r ../../lambda-deployment.zip . > /dev/null 2>&1
elif command -v 7z &> /dev/null; then
    # Fallback to 7zip if available
    7z a -tzip ../../lambda-deployment.zip * > /dev/null 2>&1
else
    echo "❌ No zip tool found. Please install zip, 7zip, or use PowerShell"
    exit 1
fi

cd ../..

# Show package info (cross-platform)
if [ "$MACHINE" = "Windows" ] && command -v powershell &> /dev/null; then
    PACKAGE_SIZE=$(powershell -Command "(Get-Item lambda-deployment.zip).Length | ForEach-Object {[math]::Round($_/1MB, 2)}")
    PACKAGE_SIZE="${PACKAGE_SIZE} MB"
elif command -v stat &> /dev/null; then
    # macOS and Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        PACKAGE_SIZE=$(stat -f%z lambda-deployment.zip | numfmt --to=iec-i --suffix=B 2>/dev/null || echo "N/A")
    else
        PACKAGE_SIZE=$(stat -c%s lambda-deployment.zip | numfmt --to=iec-i --suffix=B 2>/dev/null || echo "N/A")
    fi
else
    PACKAGE_SIZE="N/A"
fi

echo "✅ Lambda deployment package created"
echo "   Package: backend/lambda-deployment.zip"
if [ "$PACKAGE_SIZE" != "N/A" ]; then
    echo "   Size: $PACKAGE_SIZE"
fi
echo ""
echo "🚀 To deploy:"
echo "   aws lambda update-function-code \\"
echo "     --function-name aiworkoutnow-api \\"
echo "     --zip-file fileb://backend/lambda-deployment.zip \\"
echo "     --region us-east-1"
echo ""
echo "   Or use: ./deploy-backend.sh"

