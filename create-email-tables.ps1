# Create DynamoDB tables for email verification and cross-device access

$region = "us-east-1"
$tablePrefix = "AIWorkoutNow"

# Email Verification Table
Write-Host "Creating EmailVerification table..."
aws dynamodb create-table `
    --table-name "$tablePrefix-EmailVerification" `
    --attribute-definitions AttributeName=Email,AttributeType=S `
    --key-schema AttributeName=Email,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $region `
    --error-action SilentlyContinue

# Email-Visitor Mapping Table
Write-Host "Creating EmailVisitorMapping table..."
aws dynamodb create-table `
    --table-name "$tablePrefix-EmailVisitorMapping" `
    --attribute-definitions AttributeName=Email,AttributeType=S `
    --key-schema AttributeName=Email,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $region `
    --error-action SilentlyContinue

Write-Host "Tables created successfully!"
