# Script to check which DynamoDB tables are missing
$ErrorActionPreference = "Continue"

Write-Host "🔍 Checking for missing DynamoDB tables..." -ForegroundColor Cyan
Write-Host ""

$REGION = "us-east-1"
$TABLE_PREFIX = "AIWorkoutNow"

# All tables that the code expects
$expectedTables = @(
    "$TABLE_PREFIX-Workouts",
    "$TABLE_PREFIX-AnonymousUsage",
    "$TABLE_PREFIX-UserTokens",
    "$TABLE_PREFIX-ProgressLogs",
    "$TABLE_PREFIX-AdminUsers",
    "$TABLE_PREFIX-ContactMessages",
    "$TABLE_PREFIX-UserPurchases",
    "$TABLE_PREFIX-StripePurchases",
    "$TABLE_PREFIX-CustomerActivities",
    "$TABLE_PREFIX-ContactReplies",
    "$TABLE_PREFIX-PricingPlans"
)

$missingTables = @()
$existingTables = @()

foreach ($table in $expectedTables) {
    try {
        $result = aws dynamodb describe-table --table-name $table --region $REGION 2>&1
        if ($LASTEXITCODE -eq 0) {
            $status = ($result | ConvertFrom-Json).Table.TableStatus
            Write-Host "✅ $table - Status: $status" -ForegroundColor Green
            $existingTables += $table
        } else {
            Write-Host "❌ $table - MISSING" -ForegroundColor Red
            $missingTables += $table
        }
    } catch {
        Write-Host "❌ $table - MISSING" -ForegroundColor Red
        $missingTables += $table
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Existing: $($existingTables.Count) tables" -ForegroundColor Green
Write-Host "   Missing: $($missingTables.Count) tables" -ForegroundColor $(if ($missingTables.Count -gt 0) { "Red" } else { "Green" })

if ($missingTables.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing tables:" -ForegroundColor Yellow
    foreach ($table in $missingTables) {
        Write-Host "   - $table" -ForegroundColor Red
    }
}
