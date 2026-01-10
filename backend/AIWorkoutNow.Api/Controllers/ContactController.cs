using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[EnableCors("AllowAll")]
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
            // Validation - All fields are required
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Name is required" });
            }

            if (request.Name.Length > 100)
            {
                return BadRequest(new { message = "Name must be 100 characters or less" });
            }

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            if (!System.Text.RegularExpressions.Regex.IsMatch(request.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            {
                return BadRequest(new { message = "Invalid email format" });
            }

            if (string.IsNullOrWhiteSpace(request.Subject))
            {
                return BadRequest(new { message = "Subject is required" });
            }

            if (request.Subject.Length > 200)
            {
                return BadRequest(new { message = "Subject must be 200 characters or less" });
            }

            if (string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { message = "Message is required" });
            }

            if (request.Message.Length > 5000)
            {
                return BadRequest(new { message = "Message must be 5000 characters or less" });
            }

            var message = new ContactMessage
            {
                MessageId = Guid.NewGuid().ToString(),
                Name = request.Name.Trim(),
                Email = request.Email.Trim(),
                Subject = request.Subject.Trim(),
                Message = request.Message.Trim(),
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

            // Send email notification (non-blocking - don't fail request if email fails)
            try
            {
                await _emailService.SendContactNotificationAsync(message);
                Console.WriteLine($"[ContactController] Email notification sent successfully for message {message.MessageId}");
            }
            catch (Exception emailEx)
            {
                Console.WriteLine($"[ContactController] Failed to send email notification: {emailEx.Message}");
                Console.WriteLine($"[ContactController] Stack trace: {emailEx.StackTrace}");
                // Don't fail the request if email fails - message is already saved
            }

            return Ok(new { message = "Contact form submitted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to submit contact form", error = ex.Message });
        }
    }
}


