// Simple console app to create admin user
// Run: dotnet run --project ../backend/AIWorkoutNow.Api -- CreateAdmin <email> <password>

using BCrypt.Net;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon;

if (args.Length < 3 || args[0] != "CreateAdmin")
{
    Console.WriteLine("Usage: dotnet run -- CreateAdmin <email> <password>");
    Environment.Exit(1);
}

var email = args[1];
var password = args[2];
var adminId = $"admin-{DateTime.UtcNow:yyyyMMddHHmmss}";
var tableName = "AIWorkoutNow-AdminUsers";
var region = "us-east-1";

Console.WriteLine($"Creating admin user: {email}");

// Hash password
var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
Console.WriteLine("Password hashed successfully");

// Create DynamoDB client
var client = new AmazonDynamoDBClient(RegionEndpoint.GetBySystemName(region));

// Create admin user
var item = new Dictionary<string, AttributeValue>
{
    { "AdminId", new AttributeValue { S = adminId } },
    { "Email", new AttributeValue { S = email } },
    { "PasswordHash", new AttributeValue { S = passwordHash } },
    { "Role", new AttributeValue { S = "admin" } },
    { "CreatedAt", new AttributeValue { S = DateTime.UtcNow.ToString("O") } }
};

await client.PutItemAsync(new PutItemRequest
{
    TableName = tableName,
    Item = item
});

Console.WriteLine($"✅ Admin user created successfully!");
Console.WriteLine($"Email: {email}");
Console.WriteLine($"Password: {password}");
Console.WriteLine($"Admin ID: {adminId}");
