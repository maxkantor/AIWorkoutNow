# PowerShell script to create email verification DynamoDB tables
$ErrorActionPreference = "Continue"

Write-Host "Creating Email Verification DynamoDB tables..." -ForegroundColor Cyan
Write-Host ""

$REGION = "us-east-1"
$TABLE_PREFIX = "AIWorkoutNow"

# Function to create table if it doesn't exist
function Create-TableIfNotExists {
    param(
        [string]$TableName,
        [string]$PartitionKey,
        [string]$PartitionKeyType = "S"
    )
    
    try {
        $null = aws dynamodb describe-table --table-name $TableName --region $REGION 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Table already exists: $TableName" -ForegroundColor Yellow
            return
        }
    } catch {
        # Table doesn't exist, continue
    }
    
    try {
        $null = aws dynamodb create-table `
            --table-name $TableName `
            --attribute-definitions "AttributeName=$PartitionKey,AttributeType=$PartitionKeyType" `
            --key-schema "AttributeName=$PartitionKey,KeyType=HASH" `
            --billing-mode PAY_PER_REQUEST `
            --region $REGION 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Created: $TableName" -ForegroundColor Green
        } else {
            Write-Host "Failed to create: $TableName" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error creating $TableName : $_" -ForegroundColor Red
    }
}

# Create Email Verification Table
Write-Host "Creating Email Verification table..." -ForegroundColor Cyan
$verificationTable = "$TABLE_PREFIX-EmailVerification"
Create-TableIfNotExists -TableName $verificationTable -PartitionKey "Email"

# Create Email-Visitor Mapping Table
Write-Host "Creating Email-Visitor Mapping table..." -ForegroundColor Cyan
$mappingTable = "$TABLE_PREFIX-EmailVisitorMapping"
Create-TableIfNotExists -TableName $mappingTable -PartitionKey "Email"

Write-Host ""
Write-Host "Waiting for tables to be active..." -ForegroundColor Cyan
$tables = @($verificationTable, $mappingTable)

foreach ($table in $tables) {
    try {
        Write-Host "Waiting for $table..." -ForegroundColor Gray
        $null = aws dynamodb wait table-exists --table-name $table --region $REGION 2>&1
    } catch {
        Write-Host "Could not verify $table status" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Email verification tables setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Created tables:" -ForegroundColor Cyan
Write-Host "  - $verificationTable" -ForegroundColor White
Write-Host "  - $mappingTable" -ForegroundColor White
Write-Host ""
