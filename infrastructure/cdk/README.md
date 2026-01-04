# AIWorkoutNow CDK Infrastructure

This directory contains the AWS CDK code for deploying the AIWorkoutNow infrastructure.

## What Gets Deployed

- **6 DynamoDB Tables**:
  - `AIWorkoutNow-Workouts` - Stores generated workouts
  - `AIWorkoutNow-AnonymousUsage` - Tracks free user daily limits
  - `AIWorkoutNow-UserTokens` - Token balances for paid users
  - `AIWorkoutNow-ProgressLogs` - User workout progress
  - `AIWorkoutNow-AdminUsers` - Admin authentication
  - `AIWorkoutNow-ContactMessages` - Contact form submissions

- **IAM Role**: `AIWorkoutNow-LambdaExecutionRole` with permissions for:
  - DynamoDB access
  - SSM Parameter Store access
  - SES email sending

- **SSM Parameters** (placeholders - update with real values):
  - `/aiworkoutnow/openai-api-key` - OpenAI API key
  - `/aiworkoutnow/jwt-secret` - JWT signing secret
  - `/aiworkoutnow/ses-from-email` - SES sender email
  - `/aiworkoutnow/ses-admin-email` - Admin notification email

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Deployment

### Quick Deploy

```bash
./deploy.sh
```

### Manual Deploy

```bash
# Install dependencies
npm install

# Build
npm run build

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Preview changes
npx cdk diff

# Deploy
npx cdk deploy
```

## Updating SSM Parameters

After deployment, update the SSM parameters with actual values:

```bash
# OpenAI API Key (SecureString)
aws ssm put-parameter \
  --name /aiworkoutnow/openai-api-key \
  --value "sk-your-openai-key" \
  --type SecureString \
  --overwrite

# JWT Secret (SecureString)
aws ssm put-parameter \
  --name /aiworkoutnow/jwt-secret \
  --value "your-strong-random-secret-key" \
  --type SecureString \
  --overwrite

# SES Email Addresses
aws ssm put-parameter \
  --name /aiworkoutnow/ses-from-email \
  --value "noreply@yourdomain.com" \
  --overwrite

aws ssm put-parameter \
  --name /aiworkoutnow/ses-admin-email \
  --value "admin@yourdomain.com" \
  --overwrite
```

## Useful Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npx cdk synth` - Emit the synthesized CloudFormation template
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk deploy` - Deploy this stack to your default AWS account/region
- `npx cdk destroy` - Destroy the stack

## Stack Outputs

After deployment, the stack outputs:
- `LambdaExecutionRoleArn` - ARN of the Lambda execution role
- `WorkoutsTableName` - Name of the Workouts table

## Cost

All resources use **PAY_PER_REQUEST** billing mode, which means:
- No upfront costs
- Pay only for what you use
- Free tier includes 25GB storage and 25 read/write units per month

Estimated monthly cost for small scale: **$0-10** (mostly within free tier)
