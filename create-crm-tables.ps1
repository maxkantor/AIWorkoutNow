# PowerShell script to create CRM DynamoDB tables
$ErrorActionPreference = "Stop"

Write-Host "🚀 Creating CRM DynamoDB tables..." -ForegroundColor Cyan
Write-Host ""

$REGION = "us-east-1"
$TABLE_PREFIX = "AIWorkoutNow"

# Function to create table if it doesn't exist
function Create-TableIfNotExists {
    param(
        [string]$TableName,
        [string]$PartitionKey,
        [string]$PartitionKeyType = "S",
        [string]$SortKey = $null,
        [string]$SortKeyType = "S"
    )
    
    try {
        $existing = aws dynamodb describe-table --table-name $TableName --region $REGION 2>$null
        if ($existing) {
            Write-Host "✅ Table already exists: $TableName" -ForegroundColor Yellow
            return
        }
    } catch {
        # Table doesn't exist, create it
    }
    
    $attributeDefs = "AttributeName=$PartitionKey,AttributeType=$PartitionKeyType"
    $keySchema = "AttributeName=$PartitionKey,KeyType=HASH"
    
    if ($SortKey) {
        $attributeDefs += " AttributeName=$SortKey,AttributeType=$SortKeyType"
        $keySchema += " AttributeName=$SortKey,KeyType=RANGE"
    }
    
    $cmd = "aws dynamodb create-table --table-name $TableName --attribute-definitions $attributeDefs --key-schema $keySchema --billing-mode PAY_PER_REQUEST --region $REGION"
    
    Invoke-Expression $cmd | Out-Null
    Write-Host "✅ Created: $TableName" -ForegroundColor Green
}

# Create CRM tables
Write-Host "📊 Creating User Purchases table..." -ForegroundColor Cyan
Create-TableIfNotExists -TableName "$TABLE_PREFIX-UserPurchases" -PartitionKey "PurchaseId"

Write-Host "📊 Creating Stripe Purchases table..." -ForegroundColor Cyan
Create-TableIfNotExists -TableName "$TABLE_PREFIX-StripePurchases" -PartitionKey "PurchaseId"

Write-Host "📊 Creating Customer Activities table..." -ForegroundColor Cyan
Create-TableIfNotExists -TableName "$TABLE_PREFIX-CustomerActivities" -PartitionKey "ActivityId"

Write-Host "📊 Creating Contact Replies table..." -ForegroundColor Cyan
Create-TableIfNotExists -TableName "$TABLE_PREFIX-ContactReplies" -PartitionKey "ReplyId"

Write-Host ""
Write-Host "⏳ Waiting for tables to be active..." -ForegroundColor Cyan
$tables = @(
    "$TABLE_PREFIX-UserPurchases",
    "$TABLE_PREFIX-StripePurchases",
    "$TABLE_PREFIX-CustomerActivities",
    "$TABLE_PREFIX-ContactReplies"
)

foreach ($table in $tables) {
    Write-Host "   Waiting for $table..." -ForegroundColor Gray
    aws dynamodb wait table-exists --table-name $table --region $REGION
}

Write-Host ""
Write-Host "✅ All CRM tables created and active!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Created tables:" -ForegroundColor Cyan
Write-Host "   - $TABLE_PREFIX-UserPurchases" -ForegroundColor White
Write-Host "   - $TABLE_PREFIX-StripePurchases" -ForegroundColor White
Write-Host "   - $TABLE_PREFIX-CustomerActivities" -ForegroundColor White
Write-Host "   - $TABLE_PREFIX-ContactReplies" -ForegroundColor White
Write-Host ""
