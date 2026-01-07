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

    public async Task<string> GetStripeSecretKeyAsync()
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var parameterName = $"/{tablePrefix}/stripe-secret-key";
        var ssm = new Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementClient();
        try
        {
            Console.WriteLine($"[ConfigService] Attempting to retrieve Stripe secret key from SSM: {parameterName}");
            var response = await ssm.GetParameterAsync(new Amazon.SimpleSystemsManagement.Model.GetParameterRequest
            {
                Name = parameterName,
                WithDecryption = true
            });
            
            if (response?.Parameter?.Value != null)
            {
                Console.WriteLine($"[ConfigService] Successfully retrieved Stripe secret key from SSM (length: {response.Parameter.Value.Length})");
                return response.Parameter.Value;
            }
            
            Console.WriteLine("[ConfigService] SSM parameter returned null value");
        }
        catch (Amazon.SimpleSystemsManagement.Model.ParameterNotFoundException ex)
        {
            Console.WriteLine($"[ConfigService] SSM parameter not found: {parameterName}. Error: {ex.Message}");
        }
        catch (Amazon.SimpleSystemsManagement.Model.InvalidKeyIdException ex)
        {
            Console.WriteLine($"[ConfigService] Invalid SSM parameter key: {parameterName}. Error: {ex.Message}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConfigService] Error retrieving Stripe secret key from SSM: {ex.GetType().Name} - {ex.Message}");
            Console.WriteLine($"[ConfigService] Stack trace: {ex.StackTrace}");
        }
        
        // Fall back to environment variable
        var envValue = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (!string.IsNullOrEmpty(envValue))
        {
            Console.WriteLine("[ConfigService] Using Stripe secret key from environment variable");
            return envValue;
        }
        
        Console.WriteLine("[ConfigService] Stripe secret key not found in SSM or environment variable");
        return "";
    }

    public async Task<string> GetStripeWebhookSecretAsync()
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var ssm = new Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementClient();
        try
        {
            var response = await ssm.GetParameterAsync(new Amazon.SimpleSystemsManagement.Model.GetParameterRequest
            {
                Name = $"/{tablePrefix}/stripe-webhook-secret",
                WithDecryption = true
            });
            return response.Parameter.Value;
        }
        catch
        {
            return Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? "";
        }
    }

    public async Task<string> GetStripePublishableKeyAsync()
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var ssm = new Amazon.SimpleSystemsManagement.AmazonSimpleSystemsManagementClient();
        try
        {
            var response = await ssm.GetParameterAsync(new Amazon.SimpleSystemsManagement.Model.GetParameterRequest
            {
                Name = $"/{tablePrefix}/stripe-publishable-key",
                WithDecryption = false // Publishable key doesn't need encryption
            });
            return response.Parameter.Value;
        }
        catch
        {
            return Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY") ?? "";
        }
    }

    public string GetApiBaseUrl()
    {
        return Environment.GetEnvironmentVariable("API_BASE_URL") ?? "https://api.aiworkoutnow.com";
    }

    public string GetFrontendBaseUrl()
    {
        // Default to Amplify URL for now, can be changed via environment variable
        return Environment.GetEnvironmentVariable("FRONTEND_BASE_URL") ?? "https://main.dpwd01x1yg45j.amplifyapp.com";
    }
}

