using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;
using System.Text.RegularExpressions;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[EnableCors("AllowAll")]
[Route("api/email-verification")]
public class EmailVerificationController : ControllerBase
{
    private readonly IDynamoDBService _dynamoService;
    private readonly IEmailService _emailService;
    private readonly Random _random = new();

    public EmailVerificationController(IDynamoDBService dynamoService, IEmailService emailService)
    {
        _dynamoService = dynamoService;
        _emailService = emailService;
    }

    [HttpPost("send-code")]
    [HttpOptions("send-code")]
    public async Task<IActionResult> SendVerificationCode([FromBody] SendCodeRequest? request = null)
    {
        // Handle OPTIONS preflight
        if (Request.Method == "OPTIONS")
        {
            return Ok();
        }
        
        try
        {
            if (request == null || string.IsNullOrEmpty(request.Email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            // Validate email format
            var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
            if (!emailRegex.IsMatch(request.Email))
            {
                return BadRequest(new { message = "Invalid email format" });
            }

            // Generate 6-digit code
            var code = _random.Next(100000, 999999).ToString();
            
            // Save verification code (expires in 10 minutes)
            var verificationCode = new EmailVerificationCode
            {
                Email = request.Email.ToLowerInvariant(),
                Code = code,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                Attempts = 0
            };

            await _dynamoService.SaveEmailVerificationCodeAsync(verificationCode);

            // Send email
            try
            {
                await _emailService.SendVerificationCodeAsync(request.Email, code);
                Console.WriteLine($"[EmailVerificationController] Verification code sent to {request.Email}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailVerificationController] Error sending email: {ex.Message}");
                // Don't fail the request if email fails - code is still saved
            }

            return Ok(new { message = "Verification code sent to your email" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EmailVerificationController] Error in SendVerificationCode: {ex.Message}");
            return StatusCode(500, new { message = "Failed to send verification code", error = ex.Message });
        }
    }

    [HttpPost("verify-and-restore")]
    [HttpOptions("verify-and-restore")]
    public async Task<IActionResult> VerifyAndRestore([FromBody] VerifyAndRestoreRequest? request = null)
    {
        // Handle OPTIONS preflight
        if (Request.Method == "OPTIONS")
        {
            return Ok();
        }
        
        try
        {
            if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Code) || string.IsNullOrEmpty(request.DeviceId))
            {
                return BadRequest(new { message = "Email, code, and deviceId are required" });
            }

            // Get verification code
            var storedCode = await _dynamoService.GetEmailVerificationCodeAsync(request.Email);
            if (storedCode == null)
            {
                return BadRequest(new { message = "No verification code found. Please request a new code." });
            }

            // Check if code expired
            if (storedCode.ExpiresAt < DateTime.UtcNow)
            {
                await _dynamoService.DeleteEmailVerificationCodeAsync(request.Email);
                return BadRequest(new { message = "Verification code has expired. Please request a new code." });
            }

            // Check attempts (max 5 attempts)
            if (storedCode.Attempts >= 5)
            {
                await _dynamoService.DeleteEmailVerificationCodeAsync(request.Email);
                return BadRequest(new { message = "Too many failed attempts. Please request a new code." });
            }

            // Verify code
            if (storedCode.Code != request.Code)
            {
                // Increment attempts
                storedCode.Attempts++;
                await _dynamoService.SaveEmailVerificationCodeAsync(storedCode);
                return BadRequest(new { message = "Invalid verification code", attemptsRemaining = 5 - storedCode.Attempts });
            }

            // Code is valid - delete it
            await _dynamoService.DeleteEmailVerificationCodeAsync(request.Email);

            // Get or create email-visitor mapping
            var mapping = await _dynamoService.GetEmailVisitorMappingAsync(request.Email);
            if (mapping == null)
            {
                // Create new mapping
                mapping = new EmailVisitorMapping
                {
                    Email = request.Email.ToLowerInvariant(),
                    VisitorIds = new List<string> { request.DeviceId },
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }
            else
            {
                // Add current device ID if not already present
                if (!mapping.VisitorIds.Contains(request.DeviceId))
                {
                    mapping.VisitorIds.Add(request.DeviceId);
                }
                mapping.UpdatedAt = DateTime.UtcNow;
            }

            // Save mapping
            await _dynamoService.SaveEmailVisitorMappingAsync(mapping);

            // Reset free workout count for this device (fresh start after restore)
            Console.WriteLine($"[EmailVerificationController] Resetting free workout count for device {request.DeviceId}");
            await _dynamoService.ResetFreeWorkoutCountAsync(request.DeviceId);

            // Merge credits from all linked visitor IDs
            var allVisitorIds = mapping.VisitorIds.Where(id => id != request.DeviceId).ToList();
            if (allVisitorIds.Any())
            {
                Console.WriteLine($"[EmailVerificationController] Merging credits from {allVisitorIds.Count} devices for {request.Email}");
                await _dynamoService.MergeCreditsFromVisitorIdsAsync(request.DeviceId, allVisitorIds);
            }

            // Get updated token status
            var tokens = await _dynamoService.GetUserTokensAsync(request.DeviceId);
            var tokensRemaining = tokens?.TokensRemaining ?? 0;
            var hasUnlimited = tokensRemaining >= 999999;
            
            // Get updated free workout count (should be 0 after reset, so 3 remaining)
            var freeWorkoutsUsed = await _dynamoService.GetTotalFreeWorkoutsAsync(request.DeviceId);
            var freeWorkoutsRemaining = Math.Max(0, 3 - freeWorkoutsUsed);

            return Ok(new
            {
                message = "Credits restored successfully",
                tokensRemaining = tokensRemaining,
                hasUnlimited = hasUnlimited,
                expiresAt = tokens?.ExpiresAt?.ToString("O"),
                freeWorkoutsRemaining = freeWorkoutsRemaining,
                freeWorkoutsUsed = freeWorkoutsUsed
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EmailVerificationController] Error in VerifyAndRestore: {ex.Message}");
            Console.WriteLine($"[EmailVerificationController] Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Failed to verify and restore credits", error = ex.Message });
        }
    }

    [HttpGet("check-email")]
    public async Task<IActionResult> CheckEmail([FromQuery] string email)
    {
        try
        {
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            var mapping = await _dynamoService.GetEmailVisitorMappingAsync(email);
            var hasLinkedDevices = mapping != null && mapping.VisitorIds.Any();

            return Ok(new
            {
                hasLinkedDevices = hasLinkedDevices,
                linkedDeviceCount = mapping?.VisitorIds.Count ?? 0
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EmailVerificationController] Error in CheckEmail: {ex.Message}");
            return StatusCode(500, new { message = "Failed to check email", error = ex.Message });
        }
    }
}

public class SendCodeRequest
{
    public string Email { get; set; } = string.Empty;
}

public class VerifyAndRestoreRequest
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
}
