using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public class SESEmailService : IEmailService
{
    private readonly IAmazonSimpleEmailService _sesClient;
    private readonly string _fromEmail;

    public SESEmailService()
    {
        _sesClient = new AmazonSimpleEmailServiceClient();
        _fromEmail = GetSSMParameter("/aiworkoutnow/ses-from-email", "SES_FROM_EMAIL", "noreply@aiworkoutnow.com").Result;
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
        var request = new Amazon.SimpleEmail.Model.SendEmailRequest
        {
            Source = _fromEmail,
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

        await _sesClient.SendEmailAsync(request);
    }

    public async Task SendContactNotificationAsync(ContactMessage message)
    {
        var adminEmail = await GetSSMParameter("/aiworkoutnow/ses-admin-email", "SES_ADMIN_EMAIL", "admin@aiworkoutnow.com");
        var subject = $"New Contact Form Submission from {message.Email}";
        var body = $@"New contact form submission:

From: {message.Email}
Date: {message.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC

Message:
{message.Message}";

        await SendEmailAsync(adminEmail, subject, body);
    }
}

