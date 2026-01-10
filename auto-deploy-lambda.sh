#!/bin/bash

# Auto-deploy Lambda once CDK stack is ready
set -e

echo "🔍 Monitoring CDK stack and auto-deploying Lambda..."
echo ""

MAX_WAIT=600  # 10 minutes
ELAPSED=0
CHECK_INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(aws cloudformation describe-stacks --stack-name AIWorkoutNowStack --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$STATUS" = "CREATE_COMPLETE" ] || [ "$STATUS" = "UPDATE_COMPLETE" ]; then
        echo "✅ CDK Stack is ready! Status: $STATUS"
        echo ""
        
        # Get role ARN
        ROLE_ARN=$(aws cloudformation describe-stacks \
            --stack-name AIWorkoutNowStack \
            --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
            --output text)
        
        if [ -z "$ROLE_ARN" ] || [ "$ROLE_ARN" = "None" ]; then
            echo "❌ Could not get Lambda role ARN from stack outputs"
            exit 1
        fi
        
        echo "✅ Found Lambda Role: $ROLE_ARN"
        echo ""
        echo "🚀 Deploying Lambda function..."
        
        cd backend/AIWorkoutNow.Api
        
        # Check if Lambda exists
        if aws lambda get-function --function-name aiworkoutnow-api --region us-east-1 &>/dev/null; then
            echo "Updating existing Lambda function..."
            aws lambda update-function-code \
                --function-name aiworkoutnow-api \
                --zip-file fileb://deployment-package.zip \
                --region us-east-1 > /dev/null
            
            aws lambda update-function-configuration \
                --function-name aiworkoutnow-api \
                --region us-east-1 \
                --runtime dotnet8 \
                --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" \
                --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" \
                --timeout 30 \
                --memory-size 512 > /dev/null
            
            echo "✅ Lambda function updated!"
        else
            echo "Creating new Lambda function..."
            aws lambda create-function \
                --function-name aiworkoutnow-api \
                --runtime dotnet8 \
                --role "$ROLE_ARN" \
                --handler "AIWorkoutNow.Api::AIWorkoutNow.Api.LambdaEntryPoint::FunctionHandlerAsync" \
                --zip-file fileb://deployment-package.zip \
                --timeout 30 \
                --memory-size 512 \
                --region us-east-1 \
                --environment "Variables={TABLE_PREFIX=AIWorkoutNow}" \
                --architectures arm64 > /dev/null
            
            echo "✅ Lambda function created!"
        fi
        
        FUNCTION_ARN=$(aws lambda get-function --function-name aiworkoutnow-api --region us-east-1 --query 'Configuration.FunctionArn' --output text)
        FUNCTION_URL=$(aws lambda get-function-url-config --function-name aiworkoutnow-api --region us-east-1 --query 'FunctionUrl' --output text 2>/dev/null || echo "Not configured")
        
        echo ""
        echo "✅ Lambda deployment complete!"
        echo "   Function Name: aiworkoutnow-api"
        echo "   Function ARN: $FUNCTION_ARN"
        echo "   Region: us-east-1"
        echo ""
        echo "📋 Next Steps:"
        echo "   1. Set up API Gateway (see setup-api-gateway.sh)"
        echo "   2. Update SSM parameters with real values"
        echo "   3. Deploy frontend to Amplify"
        
        exit 0
        
    elif [ "$STATUS" = "CREATE_IN_PROGRESS" ] || [ "$STATUS" = "UPDATE_IN_PROGRESS" ]; then
        echo "⏳ CDK Stack deploying... Status: $STATUS (${ELAPSED}s elapsed)"
        sleep $CHECK_INTERVAL
        ELAPSED=$((ELAPSED + CHECK_INTERVAL))
        
    elif [ "$STATUS" = "CREATE_FAILED" ] || [ "$STATUS" = "UPDATE_FAILED" ] || [ "$STATUS" = "ROLLBACK_COMPLETE" ]; then
        echo "❌ CDK Stack deployment failed! Status: $STATUS"
        echo ""
        echo "Check CloudFormation events for details:"
        echo "  aws cloudformation describe-stack-events --stack-name AIWorkoutNowStack --max-items 10"
        exit 1
        
    else
        echo "⏳ Waiting for CDK stack... (${ELAPSED}s elapsed)"
        sleep $CHECK_INTERVAL
        ELAPSED=$((ELAPSED + CHECK_INTERVAL))
    fi
done

echo "⏰ Timeout waiting for CDK stack. Please check manually:"
echo "  aws cloudformation describe-stacks --stack-name AIWorkoutNowStack"
exit 1


