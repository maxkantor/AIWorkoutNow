# Simple script to create admin user
$Email = "admin@aiworkoutnow.com"
$Password = "Maxang11@@"
$AdminId = "admin-$(Get-Date -Format 'yyyyMMddHHmmss')"
$TableName = "AIWorkoutNow-AdminUsers"
$Region = "us-east-1"
$CreatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Hash password using the temp-hash project we created
Write-Host "Hashing password..." -ForegroundColor Yellow
$hash = cd temp-hash; dotnet run -- "$Password" 2>&1 | Select-Object -Last 1
cd ..

if (-not $hash -or $hash -notmatch '^\$2a\$') {
    Write-Host "Failed to hash password. Using known hash..." -ForegroundColor Yellow
    $hash = '$2a$11$Lwdj9rUPp3pAdcCKVGXItOewTYpceEBWpn5eI/moUp6g5qLHqvdZO'
}

Write-Host "Creating admin user..." -ForegroundColor Yellow

# Create JSON file
$jsonContent = @"
{
  "AdminId": {
    "S": "$AdminId"
  },
  "Email": {
    "S": "$Email"
  },
  "PasswordHash": {
    "S": "$hash"
  },
  "Role": {
    "S": "admin"
  },
  "CreatedAt": {
    "S": "$CreatedAt"
  }
}
"@

$jsonContent | Out-File -FilePath "admin-user.json" -Encoding UTF8 -NoNewline

# Put item in DynamoDB
aws dynamodb put-item --table-name $TableName --item file://admin-user.json --region $Region

Write-Host "✅ Admin user created!" -ForegroundColor Green
Write-Host "Email: $Email" -ForegroundColor Cyan
Write-Host "Password: $Password" -ForegroundColor Cyan

Remove-Item admin-user.json -ErrorAction SilentlyContinue
