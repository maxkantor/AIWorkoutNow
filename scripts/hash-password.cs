// Quick script to hash a password using bcrypt
// Run with: dotnet script hash-password.cs <password>

using BCrypt.Net;

if (args.Length == 0)
{
    Console.WriteLine("Usage: dotnet script hash-password.cs <password>");
    Environment.Exit(1);
}

var password = args[0];
var hash = BCrypt.Net.BCrypt.HashPassword(password);
Console.WriteLine($"Hashed password: {hash}");


