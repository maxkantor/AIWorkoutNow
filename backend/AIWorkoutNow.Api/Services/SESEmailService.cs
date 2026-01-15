using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public class SESEmailService : IEmailService
{
    private readonly IAmazonSimpleEmailService _sesClient;

    public SESEmailService()
    {
        _sesClient = new AmazonSimpleEmailServiceClient();
    }
    
    private static string GetTablePrefix()
        => Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";

    private async Task<string> GetFromEmailAsync()
    {
        var prefix = GetTablePrefix();
        return await GetSSMParameter($"/{prefix}/ses-from-email", "SES_FROM_EMAIL", "noreply@aiworkoutnow.com");
    }

    private async Task<string> GetAdminEmailAsync()
    {
        var prefix = GetTablePrefix();
        return await GetSSMParameter($"/{prefix}/ses-admin-email", "SES_ADMIN_EMAIL", "admin@aiworkoutnow.com");
    }

    private async Task<string> GetSSMParameter(string parameterName, string fallbackEnvVar, string defaultValue)
    {
        try
        {
            using var ssmClient = new AmazonSimpleSystemsManagementClient();
            var request = new GetParameterRequest
            {
                Name = parameterName,
                WithDecryption = true
            };
            var response = await ssmClient.GetParameterAsync(request);
            return response.Parameter.Value;
        }
        catch
        {
            return Environment.GetEnvironmentVariable(fallbackEnvVar) ?? defaultValue;
        }
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        await SendEmailInternalAsync(to, subject, body, replyTo: null);
    }

    private async Task SendEmailInternalAsync(string to, string subject, string body, string? replyTo)
    {
        var fromEmail = await GetFromEmailAsync();
        var request = new Amazon.SimpleEmail.Model.SendEmailRequest
        {
            Source = fromEmail,
            Destination = new Amazon.SimpleEmail.Model.Destination
            {
                ToAddresses = new List<string> { to }
            },
            Message = new Amazon.SimpleEmail.Model.Message
            {
                Subject = new Amazon.SimpleEmail.Model.Content(subject),
                Body = new Amazon.SimpleEmail.Model.Body
                {
                    Text = new Amazon.SimpleEmail.Model.Content(body),
                    Html = new Amazon.SimpleEmail.Model.Content($"<html><body>{body.Replace("\n", "<br>")}</body></html>")
                }
            }
        };

        if (!string.IsNullOrWhiteSpace(replyTo))
        {
            request.ReplyToAddresses = new List<string> { replyTo };
        }

        await _sesClient.SendEmailAsync(request);
    }

    public async Task SendContactNotificationAsync(ContactMessage message)
    {
        var adminEmail = await GetAdminEmailAsync();
        var subject = $"New Contact Form Submission: {message.Subject}";
        var body = $@"New contact form submission:

From: {message.Email}
Name: {message.Name}
Subject: {message.Subject}
Date: {message.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC

Message:
{message.Message}";

        await SendEmailAsync(adminEmail, subject, body);
    }

    public async Task SendVerificationCodeAsync(string email, string code)
    {
        var subject = "Your AIWorkoutNow Verification Code";
        var body = $@"Hello,

Your verification code for AIWorkoutNow is: {code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
AIWorkoutNow Team";

        await SendEmailAsync(email, subject, body);
    }

    public async Task SendPurchaseNotificationAsync(UserPurchase purchase, PricingPlan? plan = null)
    {
        var adminEmail = await GetAdminEmailAsync();

        var planName = plan?.Name ?? purchase.PlanId;
        var tokens = purchase.TokensGranted ?? plan?.TokenCount;
        var amount = plan?.Price;
        var currency = plan?.Currency ?? "USD";

        var subject = $"New Purchase: {planName}";
        var body = $@"New purchase completed:

Plan: {planName} ({purchase.PlanId})
Amount: {(amount.HasValue ? $"{amount.Value:F2} {currency}" : $"(unknown) {currency}")}
Tokens Granted: {(tokens.HasValue ? tokens.Value.ToString() : "unknown")}

Customer:
Email: {purchase.CustomerEmail ?? "(unknown)"}
Name: {purchase.CustomerName ?? "(unknown)"}
Phone: {purchase.CustomerPhone ?? "(unknown)"}
Address: {purchase.CustomerAddressLine1 ?? ""} {purchase.CustomerCity ?? ""} {purchase.CustomerState ?? ""} {purchase.CustomerPostalCode ?? ""} {purchase.CustomerCountry ?? ""}

DeviceId: {purchase.DeviceId}
Stripe Session: {purchase.StripeSessionId}
Payment Intent: {purchase.StripePaymentIntentId}
Purchased At (UTC): {purchase.PurchasedAt:yyyy-MM-dd HH:mm:ss}";

        await SendEmailAsync(adminEmail, subject, body);
    }

    public async Task SendContactReplyToCustomerAsync(ContactMessage originalMessage, string replyText)
    {
        var adminEmail = await GetAdminEmailAsync();
        var subject = $"Re: {originalMessage.Subject}";

        var body = $@"{replyText}

---
Original message:
From: {originalMessage.Name} <{originalMessage.Email}>
Subject: {originalMessage.Subject}
Date: {originalMessage.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC

{originalMessage.Message}";

        // Use Reply-To admin email so the customer can respond back to you.
        await SendEmailInternalAsync(originalMessage.Email, subject, body, replyTo: adminEmail);
    }
}

