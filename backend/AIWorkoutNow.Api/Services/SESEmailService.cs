using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public class SESEmailService : IEmailService
{
    private readonly IAmazonSimpleEmailService _sesClient;
    private const string BrandName = "AIWorkoutNow";
    private static bool _loggedAdminEmailResolution = false;
    private static bool _loggedFromEmailResolution = false;

    public SESEmailService()
    {
        _sesClient = new AmazonSimpleEmailServiceClient();
    }
    
    private static string GetTablePrefix()
        => Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";

    private async Task<string> GetFromEmailAsync()
    {
        var prefix = GetTablePrefix();
        // Prefer TABLE_PREFIX path, but support legacy /aiworkoutnow path (older stacks)
        var from = await GetSSMParameter($"/{prefix}/ses-from-email", "SES_FROM_EMAIL", "");
        if (!string.IsNullOrWhiteSpace(from)) return from;
        from = await GetSSMParameter("/aiworkoutnow/ses-from-email", "SES_FROM_EMAIL", "");
        if (!string.IsNullOrWhiteSpace(from)) return from;
        if (!_loggedFromEmailResolution)
        {
            _loggedFromEmailResolution = true;
            Console.WriteLine("[SESEmailService] From email not found in SSM/env; using default noreply@aiworkoutnow.com");
        }
        return "noreply@aiworkoutnow.com";
    }

    private async Task<string> GetAdminEmailAsync()
    {
        var prefix = GetTablePrefix();
        // Prefer TABLE_PREFIX path, but support legacy /aiworkoutnow path (older stacks)
        // Support both naming conventions:
        // - /{prefix}/ses-admin-email (current)
        // - /{prefix}/admin-email (older stacks / scripts)
        var admin = await GetSSMParameter($"/{prefix}/ses-admin-email", "SES_ADMIN_EMAIL", "");
        if (!string.IsNullOrWhiteSpace(admin)) return admin;
        admin = await GetSSMParameter($"/{prefix}/admin-email", "SES_ADMIN_EMAIL", "");
        if (!string.IsNullOrWhiteSpace(admin)) return admin;
        admin = await GetSSMParameter("/aiworkoutnow/ses-admin-email", "SES_ADMIN_EMAIL", "");
        if (!string.IsNullOrWhiteSpace(admin)) return admin;
        admin = await GetSSMParameter("/aiworkoutnow/admin-email", "SES_ADMIN_EMAIL", "");
        if (!string.IsNullOrWhiteSpace(admin)) return admin;
        if (!_loggedAdminEmailResolution)
        {
            _loggedAdminEmailResolution = true;
            Console.WriteLine("[SESEmailService] Admin email not found in SSM/env; using default admin@aiworkoutnow.com");
        }
        return "admin@aiworkoutnow.com";
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
        // Use a friendly display name; improves trust and reduces spoofing heuristics in some inboxes.
        var source = $"{BrandName} <{fromEmail}>";
        Console.WriteLine($"[SESEmailService] Sending email. To={to}, From={fromEmail}, Subject={subject}");
        var request = new Amazon.SimpleEmail.Model.SendEmailRequest
        {
            Source = source,
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
            },
            // Improve deliverability: Add headers to prevent spam filtering
            ConfigurationSetName = null, // Can be configured later if using SES Configuration Sets
            Tags = new List<MessageTag>
            {
                new MessageTag { Name = "email-type", Value = "transactional" }
            }
        };

        if (!string.IsNullOrWhiteSpace(replyTo))
        {
            request.ReplyToAddresses = new List<string> { replyTo };
        }

        try
        {
            var resp = await _sesClient.SendEmailAsync(request);
            Console.WriteLine($"[SESEmailService] Email sent. MessageId={resp?.MessageId ?? "(null)"}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SESEmailService] Failed to send email. To={to}, From={fromEmail}, Subject={subject}, Error={ex.GetType().Name}: {ex.Message}");
            throw;
        }
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
        // Deliverability: short, specific subject; code early; avoid overly "marketing" phrasing.
        var subject = $"AIWorkoutNow code: {code}";
        var body = $@"Your AIWorkoutNow verification code is: {code}

This code expires in 10 minutes.

If you didn't request this, you can ignore this email.

— AIWorkoutNow";

        await SendEmailAsync(email, subject, body);
    }

    public async Task SendPurchaseNotificationAsync(UserPurchase purchase, PricingPlan? plan = null)
    {
        var adminEmail = await GetAdminEmailAsync();

        var planName = plan?.Name ?? purchase.PlanId;
        var tokens = purchase.TokensGranted ?? plan?.TokenCount;
        var amount = plan?.Price;
        var currency = plan?.Currency ?? "USD";

        // Use less "spammy" subject line - avoid "Purchase" keyword that triggers filters
        var subject = $"[AIWorkoutNow] New Order: {planName}";
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

