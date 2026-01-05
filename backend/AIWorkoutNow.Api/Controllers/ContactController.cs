using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[Route("contact")]
public class ContactController : ControllerBase
{
    private readonly IDynamoDBService _dynamoService;
    private readonly IEmailService _emailService;

    public ContactController(IDynamoDBService dynamoService, IEmailService emailService)
    {
        _dynamoService = dynamoService;
        _emailService = emailService;
    }

    [HttpPost]
    public async Task<IActionResult> SubmitContact([FromBody] ContactRequest request)
    {
        try
        {
            var message = new ContactMessage
            {
                MessageId = Guid.NewGuid().ToString(),
                Email = request.Email,
                Message = request.Message,
                CreatedAt = DateTime.UtcNow
            };

            await _dynamoService.SaveContactMessageAsync(message);

            // Track activity (use email as deviceId for contact submissions)
            try
            {
                await _dynamoService.SaveCustomerActivityAsync(new CustomerActivity
                {
                    DeviceId = request.Email, // Use email as identifier for contact submissions
                    ActivityType = "contact_submitted",
                    Description = $"Contact form submitted from {request.Email}",
                    ContactMessageId = message.MessageId,
                    Details = new Dictionary<string, object>
                    {
                        { "email", request.Email },
                        { "messageLength", request.Message.Length }
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ContactController] Failed to save activity: {ex.Message}");
                // Don't fail the request if activity tracking fails
            }

            // Send email notification
            await _emailService.SendContactNotificationAsync(message);

            return Ok(new { message = "Contact form submitted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to submit contact form", error = ex.Message });
        }
    }
}

