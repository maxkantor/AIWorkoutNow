# AIWorkoutNow - AI-Powered Workout Generator SaaS

A production-ready, serverless SaaS application that generates personalized AI workouts. Built with React, .NET 8 Lambda, DynamoDB, and AWS services.

## 🏗️ Architecture

- **Frontend**: React SPA with Vite, TypeScript, React Router
- **Backend**: .NET 8 Lambda functions with API Gateway HTTP API
- **Database**: Amazon DynamoDB (6 tables)
- **Authentication**: JWT with bcrypt password hashing
- **AI**: OpenAI GPT-4 for workout generation
- **Email**: Amazon SES for notifications
- **Secrets**: AWS SSM Parameter Store
- **Hosting**: AWS Amplify (frontend) + Lambda (backend)

## 📁 Project Structure

```
AIWorkoutNow/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Route pages
│   │   ├── services/        # API client
│   │   └── utils/           # Utilities (storage, etc.)
│   └── package.json
├── backend/                  # .NET 8 Lambda API
│   └── AIWorkoutNow.Api/
│       ├── Controllers/     # API endpoints
│       ├── Models/          # Data models
│       ├── Services/        # Business logic
│       └── Program.cs
└── infrastructure/          # CloudFormation templates
    └── cloudformation.yaml
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- .NET 8 SDK
- AWS CLI configured
- AWS Account with appropriate permissions
- OpenAI API key
- Domain name (optional, for production)

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev  # Development server on http://localhost:3000
npm run build  # Production build
```

### 2. Backend Setup

```bash
cd backend/AIWorkoutNow.Api
dotnet restore
dotnet build
dotnet run  # Local development (requires AWS credentials)
```

### 3. Infrastructure Deployment

#### Step 1: Deploy DynamoDB Tables and IAM Roles

```bash
cd infrastructure
chmod +x deploy.sh
./deploy.sh
```

This creates:
- 6 DynamoDB tables
- IAM role for Lambda
- SSM parameters (placeholders)

#### Step 2: Set SSM Parameters

```bash
# OpenAI API Key
aws ssm put-parameter \
  --name /aiworkoutnow/openai-api-key \
  --value "sk-your-openai-key" \
  --type SecureString \
  --overwrite

# JWT Secret (generate a strong random string)
aws ssm put-parameter \
  --name /aiworkoutnow/jwt-secret \
  --value "your-strong-random-secret-key" \
  --type SecureString \
  --overwrite

# SES Email Addresses
aws ssm put-parameter \
  --name /aiworkoutnow/ses-from-email \
  --value "noreply@yourdomain.com" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /aiworkoutnow/ses-admin-email \
  --value "admin@yourdomain.com" \
  --type String \
  --overwrite

# Amazon Associates ID (for affiliate links)
aws ssm put-parameter \
  --name /aiworkoutnow/amazon-associate-id \
  --value "your-associate-id-20" \
  --type SecureString \
  --overwrite
```

**Important**: Verify your SES email addresses in the AWS SES console before sending emails.

#### Step 3: Deploy Lambda Function

```bash
cd backend
chmod +x deploy-lambda.sh
# Edit deploy-lambda.sh to set your AWS account ID and role ARN
./deploy-lambda.sh
```

#### Step 4: Set Up API Gateway

1. Create an HTTP API in API Gateway
2. Create routes:
   - `POST /generate-workout` → Lambda function
   - `POST /contact` → Lambda function
   - `GET /token-balance` → Lambda function
   - `GET /amazon-associate-tag` → Lambda function (reads affiliate ID from SSM)
   - `POST /admin/login` → Lambda function
   - `GET /admin/stats` → Lambda function (with JWT auth)
   - `POST /admin/send-email` → Lambda function (with JWT auth)
3. Enable CORS for all routes
4. Deploy the API

#### Step 5: Create Admin User

You'll need to create an admin user in DynamoDB. Use this script or AWS CLI:

```bash
# Hash a password (use bcrypt, or use the .NET code)
# Then insert into AdminUsers table:

aws dynamodb put-item \
  --table-name AIWorkoutNow-AdminUsers \
  --item '{
    "AdminId": {"S": "admin-1"},
    "Email": {"S": "admin@yourdomain.com"},
    "PasswordHash": {"S": "bcrypt-hashed-password"},
    "Role": {"S": "admin"},
    "CreatedAt": {"S": "2024-01-01T00:00:00Z"}
  }'
```

Or use the .NET code to hash the password:

```csharp
var hashed = BCrypt.Net.BCrypt.HashPassword("your-password");
```

#### Step 6: Deploy Frontend to Amplify

1. Connect your GitHub repository to AWS Amplify
2. Set build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/dist`
3. Set environment variable: `VITE_API_URL` = your API Gateway URL
4. Deploy

#### Step 7: Configure Domain (Optional)

1. In Route 53, create an A record pointing to your Amplify app
2. Update Amplify custom domain settings
3. Update frontend environment variables with production domain

## 🔧 Configuration

### Environment Variables

**Backend (Lambda):**
- `JWT_SECRET` - JWT signing secret (from SSM)
- `OPENAI_API_KEY` - OpenAI API key (from SSM)
- `DAILY_FREE_WORKOUT_LIMIT` - Default: 1
- `FREE_TRIAL_DURATION_DAYS` - Default: 7
- `WEEKLY_PACK_PRICE` - Default: 1.99
- `MONTHLY_PACK_PRICE` - Default: 3.99
- `CHALLENGE_PACK_PRICE` - Default: 1.49
- `ANNUAL_PACK_PRICE` - Default: 19.99

**Frontend:**
- `VITE_API_URL` - API Gateway endpoint URL

### Token Pack Configuration

Token packs are configured via environment variables or can be hardcoded in `ConfigService.cs`. Default values:

| Pack | Price | Tokens |
|------|-------|--------|
| Weekly | $1.99 | 7 |
| Monthly | $3.99 | 30 |
| Challenge | $1.49 | 7 |
| Annual | $19.99 | 365 |

## 📊 DynamoDB Tables

1. **AIWorkoutNow-Workouts** - Stores generated workouts
   - PK: `WorkoutId`
   
2. **AIWorkoutNow-AnonymousUsage** - Tracks free user daily limits
   - PK: `DeviceId`, SK: `Date`
   
3. **AIWorkoutNow-UserTokens** - Token balances for paid users
   - PK: `DeviceId`
   
4. **AIWorkoutNow-ProgressLogs** - User workout progress
   - PK: `DeviceId`, SK: `Timestamp`
   
5. **AIWorkoutNow-AdminUsers** - Admin authentication
   - PK: `AdminId`, GSI: `Email`
   
6. **AIWorkoutNow-ContactMessages** - Contact form submissions
   - PK: `MessageId`

## 🔐 Security

- Passwords hashed with bcrypt
- JWT tokens for admin authentication
- Secrets stored in SSM Parameter Store (SecureString)
- CORS configured for API Gateway
- Input validation on all endpoints

## 💳 Stripe Integration (TODO)

The frontend includes token pack purchase UI, but Stripe webhook integration needs to be implemented:

1. Create Stripe products for each token pack
2. Implement webhook handler in Lambda to:
   - Verify webhook signature
   - Process payment success events
   - Add tokens to user account via `TokenService.AddTokensAsync()`
3. Update frontend to redirect to Stripe Checkout

Example webhook endpoint:

```csharp
[HttpPost("stripe-webhook")]
public async Task<IActionResult> StripeWebhook([FromBody] dynamic payload)
{
    // Verify webhook signature
    // Process payment_intent.succeeded event
    // Add tokens to user
    return Ok();
}
```

## 🧪 Testing

### Local Development

1. **Frontend**: `npm run dev` - runs on http://localhost:3000
2. **Backend**: `dotnet run` - requires AWS credentials configured
3. Use AWS SAM or local Lambda runtime for full testing

### API Testing

Use Postman or curl:

```bash
# Generate workout
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/generate-workout \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device",
    "isFreeUser": true,
    "fitnessLevel": "beginner",
    "workoutType": "full-body",
    "duration": 30,
    "equipment": "minimal"
  }'

# Admin login
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "your-password"
  }'
```

## 📈 Monitoring & Logs

- **CloudWatch Logs**: Lambda function logs automatically
- **CloudWatch Metrics**: API Gateway metrics
- **DynamoDB Metrics**: Table read/write capacity

Set up CloudWatch alarms for:
- Lambda errors
- API Gateway 5xx errors
- DynamoDB throttling

## 🚨 Troubleshooting

### Lambda Timeout
- Increase timeout in Lambda configuration (max 15 minutes for API Gateway)
- Optimize OpenAI API calls

### CORS Errors
- Ensure API Gateway CORS is configured
- Check frontend `VITE_API_URL` is correct

### SSM Parameter Access
- Verify Lambda execution role has `ssm:GetParameter` permission
- Check parameter names match exactly

### DynamoDB Errors
- Verify table names match exactly
- Check IAM permissions for DynamoDB operations

## 📝 License

This project is provided as-is for educational and commercial use.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues or questions, use the contact form on the website or open a GitHub issue.

---

**Built with ❤️ for fitness enthusiasts**

