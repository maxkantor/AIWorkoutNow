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

# Get script directory (works on Mac, Linux, Windows with Git Bash)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/AIWorkoutNow.Api" || {
    echo "❌ Could not find AIWorkoutNow.Api directory in $SCRIPT_DIR"
    exit 1
}

# Clean previous builds (cross-platform)
if [ -d "publish-lambda" ]; then
    rm -rf publish-lambda
fi

ZIP_PATH="$SCRIPT_DIR/lambda-deployment.zip"
if [ -f "$ZIP_PATH" ]; then
    rm -f "$ZIP_PATH"
fi

# Publish for Lambda (.NET managed runtime)
echo "📦 Publishing .NET application..."
dotnet publish -c Release --self-contained false -o publish-lambda

if [ ! -d "publish-lambda" ]; then
    echo "❌ Publish failed"
    exit 1
fi

# Create zip package (cross-platform)
echo "📦 Creating deployment package..."
cd publish-lambda

# CRITICAL: Zip contents must be in ROOT of zip, not in publish-lambda/ subdirectory
# Use PowerShell on Windows if available, otherwise use zip command
if [ "$MACHINE" = "Windows" ] && command -v powershell &> /dev/null; then
    # Use PowerShell Compress-Archive (creates zip files compatible with Lambda)
    # Note: PowerShell Compress-Archive might create subdirectory, so we zip from parent
    cd "$SCRIPT_DIR/AIWorkoutNow.Api" || exit 1
    powershell -Command "Compress-Archive -Path publish-lambda\* -DestinationPath '$ZIP_PATH' -Force"
elif command -v zip &> /dev/null; then
    # Use zip command - zip files directly, not the directory
    # This ensures files are in ROOT of zip (not in publish-lambda/ subdirectory)
    zip -r "$ZIP_PATH" . > /dev/null 2>&1
elif command -v 7z &> /dev/null; then
    # Fallback to 7zip if available
    7z a -tzip "$ZIP_PATH" * > /dev/null 2>&1
else
    echo "❌ No zip tool found. Please install zip, 7zip, or use PowerShell"
    echo "   On Windows: PowerShell is usually available"
    echo "   On Mac: Install zip via Homebrew: brew install zip"
    echo "   On Linux: Install zip via apt/yum"
    exit 1
fi

cd "$SCRIPT_DIR" || exit 1

# Verify zip was created
if [ ! -f "$ZIP_PATH" ]; then
    echo "❌ Failed to create zip package"
    exit 1
fi

# Show package info (cross-platform)
if [ "$MACHINE" = "Windows" ] && command -v powershell &> /dev/null; then
    PACKAGE_SIZE=$(powershell -Command "(Get-Item '$ZIP_PATH').Length | ForEach-Object {[math]::Round($_/1MB, 2)}")
    PACKAGE_SIZE="${PACKAGE_SIZE} MB"
elif command -v stat &> /dev/null; then
    # macOS and Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        PACKAGE_SIZE=$(stat -f%z "$ZIP_PATH" 2>/dev/null | awk '{printf "%.2f MB", $1/1024/1024}' || echo "N/A")
    else
        PACKAGE_SIZE=$(stat -c%s "$ZIP_PATH" 2>/dev/null | awk '{printf "%.2f MB", $1/1024/1024}' || echo "N/A")
    fi
else
    PACKAGE_SIZE="N/A"
fi

echo "✅ Lambda deployment package created"
echo "   Package: $ZIP_PATH"
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
echo "   aws lambda update-function-configuration \\"
echo "     --function-name aiworkoutnow-api \\"
echo "     --runtime dotnet8 \\"
echo "     --handler \"AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync\" \\"
echo "     --region us-east-1"
echo ""
echo "   Or use: ./deploy-backend.sh"


