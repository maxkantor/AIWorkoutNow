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
    Task<UserTokens> ReconcileTokensAsync(string deviceId);
    Task SaveProgressLogAsync(ProgressLog log);
    Task<List<ProgressLog>> GetProgressLogsAsync(string deviceId);
    Task SaveAdminUserAsync(AdminUser admin);
    Task<AdminUser?> GetAdminUserAsync(string email);
    Task SaveContactMessageAsync(ContactMessage message);
    Task<List<ContactMessage>> GetAllContactMessagesAsync();
    Task<ContactMessage?> GetContactMessageAsync(string messageId);
    Task SaveContactReplyAsync(ContactReply reply);
    Task<List<ContactReply>> GetContactRepliesAsync(string messageId);
    Task<AdminStats> GetAdminStatsAsync();
    
    // CRM Methods
    Task SaveStripePurchaseAsync(StripePurchase purchase);
    Task<List<StripePurchase>> GetAllStripePurchasesAsync(); // Legacy - use GetAllUserPurchasesAsync
    Task<List<StripePurchase>> GetPurchasesByDeviceIdAsync(string deviceId); // Legacy - use GetUserPurchasesByDeviceIdAsync
    Task<List<UserPurchase>> GetAllUserPurchasesAsync();
    Task<List<UserPurchase>> GetUserPurchasesByDeviceIdAsync(string deviceId);
    Task SaveCustomerActivityAsync(CustomerActivity activity);
    Task<List<CustomerActivity>> GetCustomerActivitiesAsync(string deviceId, int limit = 50);
    Task<List<CustomerActivity>> GetAllActivitiesAsync(int limit = 100);
    Task<List<AdminCustomerSummary>> GetAllCustomersAsync();
    Task<AnalyticsData> GetAnalyticsDataAsync(DateTime startDate, DateTime endDate, string period);
    Task<AdminCustomerDetails?> GetCustomerSummaryAsync(string deviceId);
    Task ResetUserTokensAsync(string deviceId, int newTokenCount);
    
    // Pricing Plan Methods
    Task SavePricingPlanAsync(PricingPlan plan);
    Task<List<PricingPlan>> GetAllPricingPlansAsync();
    Task<PricingPlan?> GetPricingPlanAsync(string planId);
    Task DeletePricingPlanAsync(string planId);
    Task SaveUserPurchaseAsync(UserPurchase purchase);
    Task<UserPurchase?> GetUserPurchaseAsync(string purchaseId);
    Task<List<UserPurchase>> GetUserPurchasesAsync(string deviceId);
    Task<UserPurchase?> GetActiveUnlimitedPurchaseAsync(string deviceId);
    Task<int> GetTotalFreeWorkoutsAsync(string deviceId);
    Task ApplyPendingPurchasesAsync(string deviceId);
    
    // Email Verification & Cross-Device Methods
    Task SaveEmailVerificationCodeAsync(EmailVerificationCode code);
    Task<EmailVerificationCode?> GetEmailVerificationCodeAsync(string email);
    Task DeleteEmailVerificationCodeAsync(string email);
    Task SaveEmailVisitorMappingAsync(EmailVisitorMapping mapping);
    Task<EmailVisitorMapping?> GetEmailVisitorMappingAsync(string email);
    Task<List<string>> GetVisitorIdsByEmailAsync(string email);
    Task<EmailVisitorMapping?> GetEmailByVisitorIdAsync(string visitorId);
    Task MergeCreditsFromVisitorIdsAsync(string targetDeviceId, List<string> sourceVisitorIds);
    Task<int> IncrementUserTokensAsync(string deviceId, int tokensToAdd);
    Task ResetFreeWorkoutCountAsync(string deviceId);
    Task<List<UserPurchase>> GetPurchasesByEmailAsync(string email);
    Task DeleteCustomerAsync(string deviceId);
    Task DeactivateCustomerAsync(string deviceId);
}

public class AdminStats
{
    public int FreeUsers { get; set; }
    public int PaidUsers { get; set; }
    public int TotalWorkouts { get; set; }
    public int TokenPurchases { get; set; }
}


