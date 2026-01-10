# Backend - Lambda Deployment

## Lambda Deployment Package

The Lambda deployment package is located at:
- **`lambda-deployment.zip`** - Ready-to-deploy Lambda package

## Building the Package

To rebuild the Lambda deployment package:

```bash
cd backend
./build-lambda-package.sh
```

This will:
1. Clean previous builds
2. Publish .NET application for Lambda
3. Create `lambda-deployment.zip` in the backend folder

## Deploying to Lambda

### Option 1: Using the deployment script
```bash
./deploy-backend.sh
```

### Option 2: Manual deployment
```bash
aws lambda update-function-code \
  --function-name aiworkoutnow-api \
  --zip-file fileb://backend/lambda-deployment.zip \
  --region us-east-1
```

### Option 3: Create new Lambda function
```bash
aws lambda create-function \
  --function-name aiworkoutnow-api \
  --runtime dotnet8 \
  --handler "AIWorkoutNow.Api" \
  --role arn:aws:iam::YOUR_ACCOUNT:role/AIWorkoutNow-LambdaExecutionRole \
  --zip-file fileb://backend/lambda-deployment.zip \
  --timeout 30 \
  --memory-size 512 \
  --region us-east-1 \
  --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" \
  --architectures arm64
```

## Package Contents

The `lambda-deployment.zip` contains:
- `AIWorkoutNow.Api.dll` - Main application assembly
- All required .NET dependencies
- AWS SDK libraries
- Lambda runtime support libraries

## Lambda Configuration

- **Runtime**: `dotnet8`
- **Handler**: `AIWorkoutNow.Api`
- **Architecture**: `arm64` (or `x86_64`)
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Environment Variables**: `TABLE_PREFIX=AIWorkoutNow`

## Updating Lambda

1. Make code changes
2. Rebuild package: `./build-lambda-package.sh`
3. Deploy: `./deploy-backend.sh` or use AWS CLI

## Troubleshooting

**Package too large:**
- Check for unnecessary files in publish folder
- Use `--self-contained false` (already set)
- Consider using Lambda layers for large dependencies

**Handler errors:**
- Verify handler format: `AIWorkoutNow.Api`
- Check that `LambdaEntryPoint.cs` exists
- Ensure `Amazon.Lambda.AspNetCoreServer.Hosting` package is included

**Runtime errors:**
- Verify runtime is `dotnet8`
- Check Lambda logs: `aws logs tail /aws/lambda/aiworkoutnow-api --follow`


