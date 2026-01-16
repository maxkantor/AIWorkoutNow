using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;

namespace AIWorkoutNow.Api.Services;

public class AuthService : IAuthService
{
    private readonly string _jwtSecret;
    private readonly string _jwtIssuer;

    public AuthService()
    {
        _jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "your-secret-key-change-in-production";
        _jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "AIWorkoutNow";
    }

    public string GenerateJwtToken(string adminId, string email)
    {
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        // Make admin sessions "sticky" without ever storing the password client-side.
        // Default: 30 days, configurable via env var ADMIN_JWT_DAYS.
        var days = 30;
        var rawDays = Environment.GetEnvironmentVariable("ADMIN_JWT_DAYS");
        if (!string.IsNullOrWhiteSpace(rawDays) && int.TryParse(rawDays, out var parsed) && parsed >= 1 && parsed <= 365)
        {
            days = parsed;
        }
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, adminId),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, "admin")
            }),
            Expires = DateTime.UtcNow.AddDays(days),
            Issuer = _jwtIssuer,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt());
    }

    public bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }
}


