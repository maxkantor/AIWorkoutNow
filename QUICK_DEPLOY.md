# Quick Deployment Steps

## Current Status
- ✅ Code is ready
- ⏳ CDK infrastructure deploying...
- ⏳ Lambda function ready to deploy
- ⏳ Frontend ready for Amplify

## Step 1: Complete CDK Deployment

The CDK stack is currently deploying. Wait for it to complete, or run:

```bash
cd infrastructure/cdk
npx cdk deploy --require-approval never
```

This creates:
- DynamoDB tables
- IAM roles
- SSM parameters

## Step 2: Deploy Backend to Lambda

Once CDK is deployed, run:

```bash
./deploy-backend.sh
```

This will:
- Build the .NET Lambda function
- Package and deploy to AWS Lambda
- Create function: `aiworkoutnow-api`

## Step 3: Set Up API Gateway

1. Go to https://console.aws.amazon.com/apigateway
2. Create HTTP API
3. Add Lambda integration: `aiworkoutnow-api`
4. Create routes:
   - `POST /generate-workout`
   - `POST /contact`
   - `GET /token-balance`
   - `POST /admin/login`
   - `GET /admin/stats`
   - `POST /admin/send-email`
5. Enable CORS
6. Deploy API
7. **Copy the API URL** (you'll need this for frontend)

## Step 4: Update SSM Parameters

```bash
# OpenAI API Key
aws ssm put-parameter \
  --name /aiworkoutnow/openai-api-key \
  --value "sk-your-key" \
  --type SecureString \
  --overwrite

# JWT Secret
aws ssm put-parameter \
  --name /aiworkoutnow/jwt-secret \
  --value "your-secret" \
  --type SecureString \
  --overwrite
```

## Step 5: Deploy Frontend to Amplify

### Via Amplify Console:

1. Go to https://console.aws.amazon.com/amplify
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/dist`
5. Environment variable:
   - Key: `VITE_API_URL`
   - Value: `[Your API Gateway URL from Step 3]`
6. Save and deploy

### Or push to GitHub first:

```bash
# If you haven't pushed to GitHub yet
git add .
git commit -m "Ready for deployment"
# Then push to GitHub and connect in Amplify Console
```

## All-in-One Script

For a complete deployment, you can run:

```bash
# 1. Deploy infrastructure
cd infrastructure/cdk && npx cdk deploy && cd ../..

# 2. Deploy backend
./deploy-backend.sh

# 3. Build frontend (ready for Amplify)
cd frontend && npm run build && cd ..
```

Then set up API Gateway and Amplify via the console.

## Check Deployment Status

```bash
# Check CDK stack
aws cloudformation describe-stacks --stack-name AIWorkoutNowStack

# Check Lambda
aws lambda get-function --function-name aiworkoutnow-api

# List DynamoDB tables
aws dynamodb list-tables | grep AIWorkoutNow
```

