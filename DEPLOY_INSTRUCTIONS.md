# Deployment Instructions

## Step-by-Step Deployment

### Step 1: Deploy CDK Infrastructure

**From the project root:**
```bash
cd infrastructure/cdk
npx cdk deploy --require-approval never
```

**Or from the cdk directory:**
```bash
cd /Users/maxkantor/Desktop/AIWorkoutNow/infrastructure/cdk
npx cdk deploy --require-approval never
```

This will:
- Create 6 DynamoDB tables
- Create IAM roles
- Create SSM parameters
- Take 5-10 minutes

**Wait for it to complete** - you'll see "✅ AIWorkoutNowStack" when done.

### Step 2: Auto-Deploy Lambda

**Once CDK completes, from the project root:**
```bash
cd /Users/maxkantor/Desktop/AIWorkoutNow
./auto-deploy-lambda.sh
```

This script will:
- Monitor for CDK completion
- Automatically deploy Lambda function
- Configure environment variables

**Or if CDK is already done, you can run:**
```bash
./deploy-backend.sh
```

### Step 3: Set Up API Gateway

See `setup-api-gateway.sh` for instructions, or:
1. Go to AWS Console → API Gateway
2. Create HTTP API
3. Add Lambda integration: `aiworkoutnow-api`
4. Create routes and enable CORS

### Step 4: Deploy Frontend to Amplify

1. Go to AWS Amplify Console
2. Connect Git repository
3. Build settings: `cd frontend && npm install && npm run build`
4. Output: `frontend/dist`
5. Set `VITE_API_URL` environment variable

## Quick Reference

**All scripts are in the project root:**
- `./auto-deploy-lambda.sh` - Auto-deploys Lambda when CDK is ready
- `./deploy-backend.sh` - Manual Lambda deployment
- `./deploy-frontend.sh` - Frontend build
- `./deploy-all.sh` - Complete deployment (if CDK is ready)

**CDK commands (from infrastructure/cdk directory):**
- `npx cdk deploy` - Deploy stack
- `npx cdk synth` - Generate CloudFormation template
- `npx cdk diff` - See what will change
- `npx cdk list` - List stacks

## Troubleshooting

**If CDK deploy fails:**
```bash
aws cloudformation describe-stack-events --stack-name AIWorkoutNowStack --max-items 10
```

**If Lambda deploy fails:**
- Check that CDK stack is complete
- Verify role ARN exists: `aws cloudformation describe-stacks --stack-name AIWorkoutNowStack --query 'Stacks[0].Outputs'`

**Check current status:**
```bash
# CDK stack
aws cloudformation describe-stacks --stack-name AIWorkoutNowStack

# Lambda
aws lambda get-function --function-name aiworkoutnow-api

# Tables
aws dynamodb list-tables | grep AIWorkoutNow
```

