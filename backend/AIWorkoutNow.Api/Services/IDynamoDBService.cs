using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public interface IDynamoDBService
{
    Task SaveWorkoutAsync(Workout workout);
    Task<Workout?> GetWorkoutAsync(string workoutId);
    Task<AnonymousUsage?> GetAnonymousUsageAsync(string deviceId, string date);
    Task IncrementAnonymousUsageAsync(string deviceId, string date);
    Task SaveUserTokensAsync(UserTokens tokens);
    Task<UserTokens?> GetUserTokensAsync(string deviceId);
    Task SaveProgressLogAsync(ProgressLog log);
    Task<List<ProgressLog>> GetProgressLogsAsync(string deviceId);
    Task SaveAdminUserAsync(AdminUser admin);
    Task<AdminUser?> GetAdminUserAsync(string email);
    Task SaveContactMessageAsync(ContactMessage message);
    Task<AdminStats> GetAdminStatsAsync();
}

public class AdminStats
{
    public int FreeUsers { get; set; }
    public int PaidUsers { get; set; }
    public int TotalWorkouts { get; set; }
    public int TokenPurchases { get; set; }
}

