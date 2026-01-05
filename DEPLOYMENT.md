# Cross-Platform Deployment Guide

This project supports deployment from **Windows**, **macOS**, and **Linux**. All deployment scripts are designed to work regardless of your operating system.

## Prerequisites

- **.NET 8 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
- **AWS CLI** - [Download](https://aws.amazon.com/cli/)
- **AWS Credentials** configured (via `aws configure` or environment variables)

### Windows-Specific
- **PowerShell 5.1+** (included with Windows 10/11)
- **Git Bash** or **WSL** (optional, for bash scripts)

### macOS/Linux
- **Bash** (usually pre-installed)
- **zip** command (usually pre-installed)

## Quick Start

### Windows (PowerShell)
```powershell
# Build and deploy
.\deploy-backend.ps1
```

### macOS/Linux (Bash)
```bash
# Build and deploy
./deploy-backend.sh
```

### Windows (Git Bash/WSL)
```bash
# Build and deploy
./deploy-backend.sh
```

## Manual Deployment Steps

### 1. Build Lambda Package

**Windows (PowerShell):**
```powershell
cd backend
.\build-lambda-package.ps1
```

**macOS/Linux (Bash):**
```bash
cd backend
./build-lambda-package.sh
```

**Windows (Git Bash):**
```bash
cd backend
bash build-lambda-package.sh
```

This creates `backend/lambda-deployment.zip` ready for deployment.

### 2. Deploy to Lambda

**Windows (PowerShell):**
```powershell
.\deploy-backend.ps1
```

**macOS/Linux (Bash):**
```bash
./deploy-backend.sh
```

The script will:
- Check/create CDK infrastructure
- Build the Lambda package (if needed)
- Create or update the Lambda function
- Configure the correct handler, runtime, and architecture

## Fixing Lambda Handler Issues

If you encounter assembly loading errors, use the fix script:

**Windows (PowerShell):**
```powershell
# Fix handler configuration
aws lambda update-function-configuration `
    --function-name aiworkoutnow-api `
    --region us-east-1 `
    --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" `
    --runtime "dotnet8" `
    --architectures "x86_64"
```

**macOS/Linux (Bash):**
```bash
./fix-lambda-handler.sh
```

## Architecture Notes

- **Build Target**: `linux-x64` (works on all platforms)
- **Lambda Architecture**: `x86_64` (compatible with all Lambda runtimes)
- **Runtime**: `dotnet8` (managed .NET 8 runtime)

## Troubleshooting

### "zip command not found" (Windows)
- Use PowerShell script: `.\build-lambda-package.ps1`
- Or install Git Bash which includes zip
- Or use WSL (Windows Subsystem for Linux)

### "PowerShell script won't run" (Windows)
```powershell
# Set execution policy (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "AWS CLI not found"
- Install AWS CLI: https://aws.amazon.com/cli/
- Verify: `aws --version`
- Configure: `aws configure`

### "Handler format error"
The correct handler format for .NET 8 with ASP.NET Core Lambda is:
```
AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync
```

## File Structure

```
.
├── deploy-backend.sh          # Bash deployment (macOS/Linux/Git Bash)
├── deploy-backend.ps1         # PowerShell deployment (Windows)
├── fix-lambda-handler.sh      # Fix handler script (Bash)
├── backend/
│   ├── build-lambda-package.sh    # Bash build script
│   ├── build-lambda-package.ps1   # PowerShell build script
│   └── lambda-deployment.zip      # Generated deployment package
└── ...
```

## Cross-Platform Compatibility

All scripts automatically detect the operating system and use appropriate commands:
- **Zip creation**: Uses PowerShell `Compress-Archive` on Windows, `zip` command on Unix
- **File paths**: Handles Windows (`\`) and Unix (`/`) path separators
- **File size display**: Uses appropriate commands for each OS

## Next Steps

After deploying the Lambda function:
1. Set up API Gateway: `./setup-api-gateway.sh`
2. Update frontend API URL in `.env` file
3. Deploy frontend: `./deploy-frontend.sh`
