#!/bin/bash

# Deployment script for AIWorkoutNow infrastructure

set -e

STACK_NAME="aiworkoutnow-infrastructure"
REGION="us-east-1"
TEMPLATE_FILE="cloudformation.yaml"

echo "Deploying AIWorkoutNow infrastructure..."

# Check if stack exists
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &>/dev/null; then
    echo "Stack exists, updating..."
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
else
    echo "Stack does not exist, creating..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
fi

echo "Waiting for stack operation to complete..."
aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION || \
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION

echo "Stack deployment complete!"

# Set SSM parameters (you'll need to provide actual values)
echo ""
echo "IMPORTANT: Update SSM parameters with actual values:"
echo "  - /aiworkoutnow/openai-api-key"
echo "  - /aiworkoutnow/jwt-secret"
echo "  - /aiworkoutnow/ses-from-email"
echo "  - /aiworkoutnow/ses-admin-email"
echo ""
echo "Example:"
echo "  aws ssm put-parameter --name /aiworkoutnow/openai-api-key --value 'your-key' --type SecureString --overwrite"

