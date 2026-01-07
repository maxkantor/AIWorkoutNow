# PowerShell script to create admin user in DynamoDB
# Usage: .\create-admin-user.ps1 <email> <password>

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$true)]
    [string]$Password
)

$ErrorActionPreference = "Stop"

$AdminId = "admin-$(Get-Date -Format 'yyyyMMddHHmmss')"
$TableName = "AIWorkoutNow-AdminUsers"
$Region = "us-east-1"

Write-Host "🔐 Creating admin user..." -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor White
Write-Host "Admin ID: $AdminId" -ForegroundColor White
Write-Host ""

# Hash password using .NET
Write-Host "Hashing password..." -ForegroundColor Yellow
try {
    # Create a temporary C# file to hash the password
    $hashScript = @"
using System;
using BCrypt.Net;

class Program {
    static void Main(string[] args) {
        if (args.Length < 1) {
            Console.Error.WriteLine("Usage: hash-password <password>");
            Environment.Exit(1);
        }
        string password = args[0];
        string hash = BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt());
        Console.WriteLine(hash);
    }
}
"@
    
    $tempFile = [System.IO.Path]::GetTempFileName() + ".cs"
    $hashScript | Out-File -FilePath $tempFile -Encoding UTF8
    
    # Try to compile and run (requires .NET SDK)
    $hashedPassword = $null
    try {
        $exePath = $tempFile -replace '\.cs$', '.exe'
        dotnet new console -n TempHash -o (Split-Path $tempFile) -f 2>$null
        Copy-Item $tempFile "$(Split-Path $tempFile)\TempHash\Program.cs" -Force
        Push-Location (Split-Path $tempFile)
        dotnet add TempHash package BCrypt.Net-Next --version 4.0.3 2>$null
        dotnet build TempHash -c Release -o . 2>$null
        if (Test-Path "TempHash.exe") {
            $hashedPassword = & ".\TempHash.exe" $Password
        }
        Pop-Location
    } catch {
        # Fallback: Use inline C# code execution if available
    }
    
    # If that didn't work, use a simpler approach with inline code
    if (-not $hashedPassword) {
        Write-Host "Using inline password hashing..." -ForegroundColor Yellow
        $hashCode = @"
using System;
using BCrypt.Net;
var hash = BCrypt.Net.BCrypt.HashPassword("$Password", BCrypt.Net.BCrypt.GenerateSalt());
Console.WriteLine(hash);
"@
        
        # Try using dotnet-script or create a simple console app
        $hashedPassword = dotnet script --eval "using BCrypt.Net; BCrypt.Net.BCrypt.HashPassword(`"$Password`", BCrypt.Net.BCrypt.GenerateSalt())" 2>$null
    }
    
    if (-not $hashedPassword) {
        throw "Could not hash password. Please install .NET SDK or use Python bcrypt."
    }
    
    Write-Host "✅ Password hashed" -ForegroundColor Green
    Write-Host ""
    
    # Create admin user in DynamoDB
    $createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    Write-Host "📝 Creating admin user in DynamoDB..." -ForegroundColor Yellow
    
    $item = @{
        "AdminId" = @{ S = $AdminId }
        "Email" = @{ S = $Email }
        "PasswordHash" = @{ S = $hashedPassword.Trim() }
        "Role" = @{ S = "admin" }
        "CreatedAt" = @{ S = $createdAt }
    } | ConvertTo-Json -Depth 10
    
    aws dynamodb put-item `
        --table-name $TableName `
        --item $item `
        --region $Region | Out-Null
    
    Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Login Credentials:" -ForegroundColor Cyan
    Write-Host "   Email: $Email" -ForegroundColor White
    Write-Host "   Password: $Password" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Access admin dashboard at: /admin/login" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Use this C# code to hash the password:" -ForegroundColor Yellow
    Write-Host "  var hash = BCrypt.Net.BCrypt.HashPassword(`"$Password`");" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this AWS CLI command:" -ForegroundColor Yellow
    $createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Write-Host "aws dynamodb put-item --table-name $TableName --item '{`"AdminId`":{`"S`":`"$AdminId`"},`"Email`":{`"S`":`"$Email`"},`"PasswordHash`":{`"S`":`"<hashed-password>`"},`"Role`":{`"S`":`"admin`"},`"CreatedAt`":{`"S`":`"$createdAt`"}}' --region $Region" -ForegroundColor White
    exit 1
}
