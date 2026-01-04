namespace AIWorkoutNow.Api.Services;

public interface IAuthService
{
    string GenerateJwtToken(string adminId, string email);
    bool VerifyPassword(string password, string hash);
    string HashPassword(string password);
}

