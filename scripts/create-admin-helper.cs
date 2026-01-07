// Helper to create admin user - run with: dotnet run --project ../backend/AIWorkoutNow.Api
using BCrypt.Net;

if (args.Length < 2)
{
    Console.WriteLine("Usage: dotnet run -- <email> <password>");
    Environment.Exit(1);
}

var email = args[0];
var password = args[1];
var hash = BCrypt.Net.BCrypt.HashPassword(password);
Console.WriteLine($"Email: {email}");
Console.WriteLine($"Password Hash: {hash}");
Console.WriteLine("");
Console.WriteLine("Run this AWS CLI command:");
Console.WriteLine($"aws dynamodb put-item --table-name AIWorkoutNow-AdminUsers --item '{{\"AdminId\":{{\"S\":\"admin-{DateTime.UtcNow:yyyyMMddHHmmss}\"}},\"Email\":{{\"S\":\"{email}\"}},\"PasswordHash\":{{\"S\":\"{hash}\"}},\"Role\":{{\"S\":\"admin\"}},\"CreatedAt\":{{\"S\":\"{DateTime.UtcNow:O}\"}}}}' --region us-east-1");
