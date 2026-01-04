using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[Route("admin")]
public class AdminController : ControllerBase
{
    private readonly IDynamoDBService _dynamoService;
    private readonly IAuthService _authService;
    private readonly IEmailService _emailService;

    public AdminController(
        IDynamoDBService dynamoService,
        IAuthService authService,
        IEmailService emailService)
    {
        _dynamoService = dynamoService;
        _authService = authService;
        _emailService = emailService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
    {
        try
        {
            var admin = await _dynamoService.GetAdminUserAsync(request.Email);
            if (admin == null)
            {
                return Unauthorized(new { message = "Invalid credentials" });
            }

            if (!_authService.VerifyPassword(request.Password, admin.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid credentials" });
            }

            var token = _authService.GenerateJwtToken(admin.AdminId, admin.Email);
            return Ok(new { token });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Login failed", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var stats = await _dynamoService.GetAdminStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get stats", error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("send-email")]
    public async Task<IActionResult> SendEmail([FromBody] Models.SendEmailRequest request)
    {
        try
        {
            await _emailService.SendEmailAsync(request.To, request.Subject, request.Body);
            return Ok(new { message = "Email sent successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to send email", error = ex.Message });
        }
    }
}

