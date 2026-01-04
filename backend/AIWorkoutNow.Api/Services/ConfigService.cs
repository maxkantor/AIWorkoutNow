namespace AIWorkoutNow.Api.Services;

public class ConfigService : IConfigService
{
    // These can be loaded from SSM Parameter Store or environment variables
    public int GetDailyFreeWorkoutLimit() => int.Parse(Environment.GetEnvironmentVariable("DAILY_FREE_WORKOUT_LIMIT") ?? "1");
    public int GetFreeTrialDurationDays() => int.Parse(Environment.GetEnvironmentVariable("FREE_TRIAL_DURATION_DAYS") ?? "7");
    
    public decimal GetWeeklyPackPrice() => decimal.Parse(Environment.GetEnvironmentVariable("WEEKLY_PACK_PRICE") ?? "1.99");
    public decimal GetMonthlyPackPrice() => decimal.Parse(Environment.GetEnvironmentVariable("MONTHLY_PACK_PRICE") ?? "3.99");
    public decimal GetChallengePackPrice() => decimal.Parse(Environment.GetEnvironmentVariable("CHALLENGE_PACK_PRICE") ?? "1.49");
    public decimal GetAnnualPackPrice() => decimal.Parse(Environment.GetEnvironmentVariable("ANNUAL_PACK_PRICE") ?? "19.99");
    
    public int GetTokensPerWeekPack() => int.Parse(Environment.GetEnvironmentVariable("TOKENS_PER_WEEK_PACK") ?? "7");
    public int GetTokensPerMonthPack() => int.Parse(Environment.GetEnvironmentVariable("TOKENS_PER_MONTH_PACK") ?? "30");
    public int GetTokensPerChallengePack() => int.Parse(Environment.GetEnvironmentVariable("TOKENS_PER_CHALLENGE_PACK") ?? "7");
    public int GetTokensPerAnnualPack() => int.Parse(Environment.GetEnvironmentVariable("TOKENS_PER_ANNUAL_PACK") ?? "365");
}

