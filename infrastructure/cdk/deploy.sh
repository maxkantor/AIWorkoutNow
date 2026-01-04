#!/bin/bash

# CDK Deployment Script for AIWorkoutNow
set -e

echo "🚀 Deploying AIWorkoutNow Infrastructure with AWS CDK..."

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS credentials found"

# Build the CDK project
echo "📦 Building CDK project..."
npm run build

# Bootstrap CDK (if not already bootstrapped)
echo "🔧 Checking CDK bootstrap status..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &>/dev/null; then
    echo "📥 Bootstrapping CDK..."
    npx cdk bootstrap
else
    echo "✅ CDK already bootstrapped"
fi

# Show what will be deployed
echo "📋 Preview of changes:"
npx cdk diff

# Deploy the stack
echo ""
echo "🚀 Deploying stack..."
npx cdk deploy --require-approval never

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update SSM parameters with actual values:"
echo "     aws ssm put-parameter --name /aiworkoutnow/openai-api-key --value 'your-key' --type SecureString --overwrite"
echo "     aws ssm put-parameter --name /aiworkoutnow/jwt-secret --value 'your-secret' --type SecureString --overwrite"
echo "  2. Update email parameters:"
echo "     aws ssm put-parameter --name /aiworkoutnow/ses-from-email --value 'noreply@yourdomain.com' --overwrite"
echo "     aws ssm put-parameter --name /aiworkoutnow/ses-admin-email --value 'admin@yourdomain.com' --overwrite"

