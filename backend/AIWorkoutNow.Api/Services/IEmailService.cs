using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
    Task SendContactNotificationAsync(ContactMessage message);
}

