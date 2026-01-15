using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
    Task SendContactNotificationAsync(ContactMessage message);
    Task SendVerificationCodeAsync(string email, string code);
    Task SendPurchaseNotificationAsync(UserPurchase purchase, PricingPlan? plan = null);
    Task SendContactReplyToCustomerAsync(ContactMessage originalMessage, string replyText);
}


