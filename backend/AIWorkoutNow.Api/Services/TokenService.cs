using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public class TokenService : ITokenService
{
    private readonly IDynamoDBService _dynamoService;

    public TokenService(IDynamoDBService dynamoService)
    {
        _dynamoService = dynamoService;
    }

    public async Task<UserTokens?> GetTokenBalanceAsync(string deviceId)
    {
        var tokens = await _dynamoService.GetUserTokensAsync(deviceId);
        
        // Check if tokens expired
        if (tokens != null && tokens.ExpiresAt.HasValue && tokens.ExpiresAt.Value < DateTime.UtcNow)
        {
            return null;
        }

        return tokens;
    }

    public async Task DeductTokenAsync(string deviceId)
    {
        var tokens = await GetTokenBalanceAsync(deviceId);
        if (tokens == null || tokens.TokensRemaining <= 0)
        {
            throw new Exception("Insufficient tokens");
        }

        tokens.TokensRemaining--;
        await _dynamoService.SaveUserTokensAsync(tokens);
    }

    public async Task AddTokensAsync(string deviceId, int tokensToAdd, DateTime? expiresAt = null)
    {
        var existing = await GetTokenBalanceAsync(deviceId);
        
        if (existing != null)
        {
            existing.TokensRemaining += tokensToAdd;
            if (expiresAt.HasValue)
            {
                existing.ExpiresAt = expiresAt;
            }
            await _dynamoService.SaveUserTokensAsync(existing);
        }
        else
        {
            var newTokens = new UserTokens
            {
                DeviceId = deviceId,
                TokensRemaining = tokensToAdd,
                ExpiresAt = expiresAt
            };
            await _dynamoService.SaveUserTokensAsync(newTokens);
        }
    }
}


