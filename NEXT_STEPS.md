# Next Steps - Deployment Guide

## Current Status ✅
- ✅ Frontend dependencies installed
- ✅ Backend dependencies installed and builds successfully
- ✅ CDK infrastructure code ready
- ✅ Git repository initialized

## Step-by-Step Deployment

### 1. Deploy AWS Infrastructure (CDK)

```bash
cd infrastructure/cdk
./deploy.sh
```

Or manually:
```bash
cd infrastructure/cdk
npm run build
npx cdk deploy
```

This creates:
- 6 DynamoDB tables
- IAM role for Lambda
- SSM parameters (placeholders)

### 2. Update SSM Parameters with Real Values

```bash
# OpenAI API Key (get from https://platform.openai.com/api-keys)
aws ssm put-parameter \
  --name /aiworkoutnow/openai-api-key \
  --value "sk-your-openai-key" \
  --type SecureString \
  --overwrite

# JWT Secret (generate a strong random string)
aws ssm put-parameter \
  --name /aiworkoutnow/jwt-secret \
  --value "your-strong-random-secret-key-min-32-chars" \
  --type SecureString \
  --overwrite

# SES Email Addresses (must be verified in SES console first)
aws ssm put-parameter \
  --name /aiworkoutnow/ses-from-email \
  --value "noreply@yourdomain.com" \
  --overwrite

aws ssm put-parameter \
  --name /aiworkoutnow/ses-admin-email \
  --value "admin@yourdomain.com" \
  --overwrite
```

### 3. Create Admin User in DynamoDB

First, hash a password using bcrypt, then insert:

```bash
# Get the table name from CDK outputs
TABLE_NAME=$(aws cloudformation describe-stacks \
  --stack-name AIWorkoutNowStack \
  --query 'Stacks[0].Outputs[?OutputKey==`TablePrefix`].OutputValue' \
  --output text)-AdminUsers

# Insert admin user (replace with your hashed password)
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --item '{
    "AdminId": {"S": "admin-1"},
    "Email": {"S": "admin@yourdomain.com"},
    "PasswordHash": {"S": "bcrypt-hashed-password-here"},
    "Role": {"S": "admin"},
    "CreatedAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }'
```

### 4. Deploy Lambda Function

```bash
cd backend
# Edit deploy-lambda.sh to set your AWS account ID and role ARN
# Get role ARN from CDK outputs:
# aws cloudformation describe-stacks --stack-name AIWorkoutNowStack --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' --output text

./deploy-lambda.sh
```

### 5. Set Up API Gateway

1. Go to AWS Console → API Gateway
2. Create HTTP API
3. Create routes:
   - `POST /generate-workout` → Lambda function
   - `POST /contact` → Lambda function
   - `GET /token-balance` → Lambda function
   - `POST /admin/login` → Lambda function
   - `GET /admin/stats` → Lambda function (with JWT auth)
   - `POST /admin/send-email` → Lambda function (with JWT auth)
4. Enable CORS for all routes
5. Deploy API
6. Copy the API Gateway URL

### 6. Configure Frontend

```bash
cd frontend
# Create .env file
echo "VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com" > .env

# Test locally
npm run dev
```

### 7. Deploy Frontend to AWS Amplify

1. Go to AWS Amplify Console
2. Connect your GitHub repository
3. Build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/dist`
4. Environment variable: `VITE_API_URL` = your API Gateway URL
5. Deploy

## Quick Test Commands

### Test API locally (requires AWS credentials):
```bash
cd backend/AIWorkoutNow.Api
dotnet run
```

### Test frontend locally:
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

### Check CDK stack status:
```bash
cd infrastructure/cdk
npx cdk diff
npx cdk synth
```

## Troubleshooting

- **CDK deploy fails**: Check AWS credentials with `aws sts get-caller-identity`
- **Lambda deploy fails**: Ensure role ARN is correct in deploy script
- **Table not found**: Check table names match in DynamoDBService.cs
- **SSM parameter access denied**: Check Lambda role has SSM permissions

## Recommended Order

1. ✅ Deploy CDK infrastructure
2. ✅ Update SSM parameters
3. ✅ Create admin user
4. ✅ Deploy Lambda
5. ✅ Set up API Gateway
6. ✅ Test API endpoints
7. ✅ Deploy frontend
8. ✅ Configure domain (optional)

