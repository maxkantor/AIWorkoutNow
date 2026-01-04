# Deployment Guide - Frontend to Amplify & Backend to Lambda

## Quick Deploy Commands

### Backend to Lambda
```bash
./deploy-backend.sh
```

This script will:
1. Deploy CDK infrastructure (if not already deployed)
2. Build .NET Lambda function
3. Package and deploy to AWS Lambda
4. Configure environment variables

### Frontend to Amplify
```bash
./deploy-frontend.sh
```

This builds the frontend. Then deploy via Amplify Console (see below).

## Detailed Steps

### 1. Deploy Backend to Lambda

```bash
# Run the deployment script
./deploy-backend.sh
```

**What it does:**
- Deploys CDK stack (DynamoDB tables, IAM roles, SSM parameters)
- Builds .NET 8 Lambda function
- Creates/updates Lambda function: `aiworkoutnow-api`
- Sets environment variables

**After deployment:**
- Lambda function ARN will be displayed
- Note this ARN for API Gateway setup

### 2. Set Up API Gateway

1. Go to [API Gateway Console](https://console.aws.amazon.com/apigateway)
2. Click "Create API" → "HTTP API"
3. Click "Add integration"
4. Select "Lambda" and choose `aiworkoutnow-api`
5. Create routes:
   - `POST /generate-workout`
   - `POST /contact`
   - `GET /token-balance`
   - `POST /admin/login`
   - `GET /admin/stats` (with JWT authorizer)
   - `POST /admin/send-email` (with JWT authorizer)
6. Enable CORS for all routes
7. Deploy API (create new stage, e.g., "prod")
8. Copy the API endpoint URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com`)

### 3. Update SSM Parameters

Before the Lambda can work, update SSM parameters:

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
  --value "your-secret-key" \
  --type SecureString \
  --overwrite

# Email addresses
aws ssm put-parameter \
  --name /aiworkoutnow/ses-from-email \
  --value "noreply@yourdomain.com" \
  --overwrite

aws ssm put-parameter \
  --name /aiworkoutnow/ses-admin-email \
  --value "admin@yourdomain.com" \
  --overwrite
```

### 4. Deploy Frontend to Amplify

#### Option A: Amplify Console (Recommended)

1. Go to [Amplify Console](https://console.aws.amazon.com/amplify)
2. Click "New app" → "Host web app"
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Configure build settings:
   ```
   Build command: cd frontend && npm install && npm run build
   Output directory: frontend/dist
   ```
6. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `[Your API Gateway URL from step 2]`
7. Click "Save and deploy"
8. Wait for deployment to complete
9. Your app will be available at: `https://[branch].amplifyapp.com`

#### Option B: Amplify CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
cd frontend
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

#### Option C: Manual S3 + CloudFront

```bash
# Build frontend
cd frontend
npm run build

# Create S3 bucket
aws s3 mb s3://aiworkoutnow-frontend

# Upload files
aws s3 sync dist/ s3://aiworkoutnow-frontend --delete

# Enable static website hosting
aws s3 website s3://aiworkoutnow-frontend \
  --index-document index.html \
  --error-document index.html

# Create CloudFront distribution (via console or CLI)
```

### 5. Create Admin User

After tables are created, create an admin user:

```bash
# Hash a password (use bcrypt)
# Then insert into DynamoDB:
aws dynamodb put-item \
  --table-name AIWorkoutNow-AdminUsers \
  --item '{
    "AdminId": {"S": "admin-1"},
    "Email": {"S": "admin@yourdomain.com"},
    "PasswordHash": {"S": "bcrypt-hashed-password"},
    "Role": {"S": "admin"},
    "CreatedAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }'
```

## Verification

### Test Lambda Function
```bash
aws lambda invoke \
  --function-name aiworkoutnow-api \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json
cat response.json
```

### Test API Gateway
```bash
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/generate-workout \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","isFreeUser":true,"fitnessLevel":"beginner","workoutType":"full-body","duration":30,"equipment":"minimal"}'
```

### Test Frontend
- Visit your Amplify URL
- Try generating a workout
- Check browser console for errors

## Troubleshooting

**Lambda errors:**
- Check CloudWatch logs: `aws logs tail /aws/lambda/aiworkoutnow-api --follow`
- Verify SSM parameters are set correctly
- Check IAM role permissions

**API Gateway errors:**
- Verify Lambda integration is correct
- Check CORS configuration
- Test with Postman or curl

**Frontend errors:**
- Verify `VITE_API_URL` is set correctly
- Check browser console for CORS errors
- Ensure API Gateway is deployed

## Next Steps After Deployment

1. ✅ Set up custom domain (Route 53 + Amplify)
2. ✅ Configure SES email verification
3. ✅ Set up Stripe webhook for payments
4. ✅ Add monitoring (CloudWatch alarms)
5. ✅ Set up CI/CD pipeline

