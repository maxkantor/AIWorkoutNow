namespace AIWorkoutNow.Api.Services;

public interface IConfigService
{
    int GetDailyFreeWorkoutLimit();
    int GetFreeTrialDurationDays();
    decimal GetWeeklyPackPrice();
    decimal GetMonthlyPackPrice();
    decimal GetChallengePackPrice();
    decimal GetAnnualPackPrice();
    int GetTokensPerWeekPack();
    int GetTokensPerMonthPack();
    int GetTokensPerChallengePack();
    int GetTokensPerAnnualPack();
}

