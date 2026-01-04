#!/bin/bash

# Fast resource creation using AWS CLI (bypasses CDK/CloudFormation)
set -e

echo "🚀 Creating AWS resources directly (fast method)..."
echo ""

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
TABLE_PREFIX="AIWorkoutNow"
ROLE_NAME="${TABLE_PREFIX}-LambdaExecutionRole"

echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Create DynamoDB Tables
echo "📊 Creating DynamoDB tables..."

aws dynamodb create-table \
    --table-name "${TABLE_PREFIX}-Workouts" \
    --attribute-definitions AttributeName=WorkoutId,AttributeType=S \
    --key-schema AttributeName=WorkoutId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION > /dev/null
echo "✅ Created: ${TABLE_PREFIX}-Workouts"

aws dynamodb create-table \
    --table-name "${TABLE_PREFIX}-AnonymousUsage" \
    --attribute-definitions AttributeName=DeviceId,AttributeType=S AttributeName=Date,AttributeType=S \
    --key-schema AttributeName=DeviceId,KeyType=HASH AttributeName=Date,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION > /dev/null
echo "✅ Created: ${TABLE_PREFIX}-AnonymousUsage"

aws dynamodb create-table \
    --table-name "${TABLE_PREFIX}-UserTokens" \
    --attribute-definitions AttributeName=DeviceId,AttributeType=S \
    --key-schema AttributeName=DeviceId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION > /dev/null
echo "✅ Created: ${TABLE_PREFIX}-UserTokens"

aws dynamodb create-table \
    --table-name "${TABLE_PREFIX}-ProgressLogs" \
    --attribute-definitions AttributeName=DeviceId,AttributeType=S AttributeName=Timestamp,AttributeType=S \
    --key-schema AttributeName=DeviceId,KeyType=HASH AttributeName=Timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION > /dev/null
echo "✅ Created: ${TABLE_PREFIX}-ProgressLogs"

aws dynamodb create-table \
    --table-name "${TABLE_PREFIX}-AdminUsers" \
    --attribute-definitions AttributeName=AdminId,AttributeType=S AttributeName=Email,AttributeType=S \
    --key-schema AttributeName=AdminId,KeyType=HASH \
    --global-secondary-indexes \
        "IndexName=EmailIndex,KeySchema=[{AttributeName=Email,KeyType=HASH}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION > /dev/null
echo "✅ Created: ${TABLE_PREFIX}-AdminUsers"

aws dynamodb create-table \
    --table-name "${TABLE_PREFIX}-ContactMessages" \
    --attribute-definitions AttributeName=MessageId,AttributeType=S \
    --key-schema AttributeName=MessageId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION > /dev/null
echo "✅ Created: ${TABLE_PREFIX}-ContactMessages"

echo ""
echo "⏳ Waiting for tables to be active..."
for table in "${TABLE_PREFIX}-Workouts" "${TABLE_PREFIX}-AnonymousUsage" "${TABLE_PREFIX}-UserTokens" "${TABLE_PREFIX}-ProgressLogs" "${TABLE_PREFIX}-AdminUsers" "${TABLE_PREFIX}-ContactMessages"; do
    aws dynamodb wait table-exists --table-name "$table" --region $REGION
done
echo "✅ All tables active"
echo ""

# Step 2: Create IAM Role
echo "🔐 Creating IAM Role..."

# Check if role exists
if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "✅ Role already exists: $ROLE_NAME"
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
else
    # Create trust policy
    cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --region $REGION > /dev/null
    
    # Attach basic execution policy
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region $REGION
    
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
    echo "✅ Created role: $ROLE_NAME"
fi

# Create and attach inline policy for DynamoDB, SSM, SES
cat > /tmp/lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${TABLE_PREFIX}-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/aiworkoutnow/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "${TABLE_PREFIX}-LambdaPolicy" \
    --policy-document file:///tmp/lambda-policy.json \
    --region $REGION > /dev/null
echo "✅ Attached policies to role"
echo ""

# Step 3: Create SSM Parameters
echo "📝 Creating SSM Parameters..."

aws ssm put-parameter \
    --name "/aiworkoutnow/openai-api-key" \
    --value "CHANGE_ME" \
    --type "SecureString" \
    --description "OpenAI API Key" \
    --region $REGION \
    --overwrite 2>/dev/null || \
aws ssm put-parameter \
    --name "/aiworkoutnow/openai-api-key" \
    --value "CHANGE_ME" \
    --type "SecureString" \
    --description "OpenAI API Key" \
    --region $REGION > /dev/null
echo "✅ Created: /aiworkoutnow/openai-api-key"

aws ssm put-parameter \
    --name "/aiworkoutnow/jwt-secret" \
    --value "CHANGE_ME" \
    --type "SecureString" \
    --description "JWT Secret Key" \
    --region $REGION \
    --overwrite 2>/dev/null || \
aws ssm put-parameter \
    --name "/aiworkoutnow/jwt-secret" \
    --value "CHANGE_ME" \
    --type "SecureString" \
    --description "JWT Secret Key" \
    --region $REGION > /dev/null
echo "✅ Created: /aiworkoutnow/jwt-secret"

aws ssm put-parameter \
    --name "/aiworkoutnow/ses-from-email" \
    --value "noreply@aiworkoutnow.com" \
    --type "String" \
    --description "SES From Email Address" \
    --region $REGION \
    --overwrite 2>/dev/null || \
aws ssm put-parameter \
    --name "/aiworkoutnow/ses-from-email" \
    --value "noreply@aiworkoutnow.com" \
    --type "String" \
    --description "SES From Email Address" \
    --region $REGION > /dev/null
echo "✅ Created: /aiworkoutnow/ses-from-email"

aws ssm put-parameter \
    --name "/aiworkoutnow/ses-admin-email" \
    --value "admin@aiworkoutnow.com" \
    --type "String" \
    --description "SES Admin Email Address" \
    --region $REGION \
    --overwrite 2>/dev/null || \
aws ssm put-parameter \
    --name "/aiworkoutnow/ses-admin-email" \
    --value "admin@aiworkoutnow.com" \
    --type "String" \
    --description "SES Admin Email Address" \
    --region $REGION > /dev/null
echo "✅ Created: /aiworkoutnow/ses-admin-email"
echo ""

# Cleanup temp files
rm -f /tmp/trust-policy.json /tmp/lambda-policy.json

echo "✅ All resources created!"
echo ""
echo "📋 Summary:"
echo "   Tables: 6 DynamoDB tables"
echo "   IAM Role: $ROLE_ARN"
echo "   SSM Parameters: 4 parameters"
echo ""
echo "🚀 Next: Deploy Lambda function"
echo "   Run: ./deploy-backend.sh"
echo ""
echo "   Or manually:"
echo "   aws lambda create-function \\"
echo "     --function-name aiworkoutnow-api \\"
echo "     --runtime provided.al2023 \\"
echo "     --role $ROLE_ARN \\"
echo "     --handler bootstrap \\"
echo "     --zip-file fileb://backend/AIWorkoutNow.Api/deployment-package.zip \\"
echo "     --timeout 30 --memory-size 512 \\"
echo "     --environment 'Variables={TABLE_PREFIX=$TABLE_PREFIX}' \\"
echo "     --architectures arm64"

