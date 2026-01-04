using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public interface ITokenService
{
    Task<UserTokens?> GetTokenBalanceAsync(string deviceId);
    Task DeductTokenAsync(string deviceId);
    Task AddTokensAsync(string deviceId, int tokens, DateTime? expiresAt = null);
}

