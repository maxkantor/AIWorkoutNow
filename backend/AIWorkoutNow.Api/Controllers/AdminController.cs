using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[Route("")]
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

    [HttpPost("admin/login")]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
    {
        try
        {
            Console.WriteLine($"[AdminController] Login attempt for email: {request?.Email}");
            
            if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                Console.WriteLine("[AdminController] Invalid request - missing email or password");
                return BadRequest(new { message = "Email and password are required" });
            }

            var admin = await _dynamoService.GetAdminUserAsync(request.Email);
            if (admin == null)
            {
                Console.WriteLine($"[AdminController] Admin user not found for email: {request.Email}");
                return Unauthorized(new { message = "Invalid credentials" });
            }

            Console.WriteLine($"[AdminController] Admin user found: {admin.AdminId}");
            
            if (!_authService.VerifyPassword(request.Password, admin.PasswordHash))
            {
                Console.WriteLine("[AdminController] Password verification failed");
                return Unauthorized(new { message = "Invalid credentials" });
            }

            Console.WriteLine("[AdminController] Password verified, generating token");
            var token = _authService.GenerateJwtToken(admin.AdminId, admin.Email);
            Console.WriteLine("[AdminController] Token generated successfully");
            return Ok(new { token });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AdminController] Login error: {ex.Message}");
            Console.WriteLine($"[AdminController] Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Login failed", error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [Authorize]
    [HttpGet("admin/stats")]
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
    [HttpPost("admin/send-email")]
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

    // CRM Endpoints
    [Authorize]
    [HttpGet("admin/customers")]
    public async Task<IActionResult> GetAllCustomers()
    {
        try
        {
            var customers = await _dynamoService.GetAllCustomersAsync();
            return Ok(customers);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get customers", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/customers/{deviceId}")]
    public async Task<IActionResult> GetCustomer(string deviceId)
    {
        try
        {
            var customer = await _dynamoService.GetCustomerSummaryAsync(deviceId);
            if (customer == null)
            {
                return NotFound(new { message = "Customer not found" });
            }
            return Ok(customer);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get customer", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/customers/{deviceId}/activities")]
    public async Task<IActionResult> GetCustomerActivities(string deviceId, [FromQuery] int limit = 50)
    {
        try
        {
            var activities = await _dynamoService.GetCustomerActivitiesAsync(deviceId, limit);
            return Ok(activities);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get activities", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/activities")]
    public async Task<IActionResult> GetAllActivities([FromQuery] int limit = 100)
    {
        try
        {
            var activities = await _dynamoService.GetAllActivitiesAsync(limit);
            return Ok(activities);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get activities", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/contacts")]
    public async Task<IActionResult> GetAllContacts()
    {
        try
        {
            var messages = await _dynamoService.GetAllContactMessagesAsync();
            return Ok(messages);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get contacts", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/contacts/{messageId}")]
    public async Task<IActionResult> GetContact(string messageId)
    {
        try
        {
            var message = await _dynamoService.GetContactMessageAsync(messageId);
            if (message == null)
            {
                return NotFound(new { message = "Contact message not found" });
            }

            var replies = await _dynamoService.GetContactRepliesAsync(messageId);
            return Ok(new { message, replies });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get contact", error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("admin/contacts/{messageId}/reply")]
    public async Task<IActionResult> ReplyToContact(string messageId, [FromBody] ContactReplyRequest request)
    {
        try
        {
            var message = await _dynamoService.GetContactMessageAsync(messageId);
            if (message == null)
            {
                return NotFound(new { message = "Contact message not found" });
            }

            // Get admin ID from JWT token
            var adminId = User.FindFirst("sub")?.Value ?? User.FindFirst("AdminId")?.Value ?? "unknown";
            
            var reply = new ContactReply
            {
                MessageId = messageId,
                AdminId = adminId,
                ReplyText = request.ReplyText,
                Sent = false
            };

            await _dynamoService.SaveContactReplyAsync(reply);

            // Send email reply
            await _emailService.SendEmailAsync(
                message.Email,
                $"Re: Your message to AIWorkoutNow",
                request.ReplyText
            );

            reply.Sent = true;
            await _dynamoService.SaveContactReplyAsync(reply);

            return Ok(new { message = "Reply sent successfully", reply });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to send reply", error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("admin/customers/{deviceId}/reset-tokens")]
    public async Task<IActionResult> ResetTokens(string deviceId, [FromBody] ResetTokensRequest request)
    {
        try
        {
            await _dynamoService.ResetUserTokensAsync(deviceId, request.NewTokenCount);
            
            // Log activity
            await _dynamoService.SaveCustomerActivityAsync(new CustomerActivity
            {
                DeviceId = deviceId,
                ActivityType = "tokens_reset",
                Description = $"Tokens reset to {request.NewTokenCount} by admin",
                Details = new Dictionary<string, object>
                {
                    { "previousCount", request.PreviousTokenCount },
                    { "newCount", request.NewTokenCount },
                    { "reason", request.Reason ?? "Admin reset" }
                }
            });

            return Ok(new { message = "Tokens reset successfully", newTokenCount = request.NewTokenCount });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to reset tokens", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/purchases")]
    public async Task<IActionResult> GetAllPurchases()
    {
        try
        {
            var purchases = await _dynamoService.GetAllUserPurchasesAsync();
            
            // AGGRESSIVE FIX: Enrich purchases with plan details for Admin CRM
            var enrichedPurchases = new List<object>();
            foreach (var purchase in purchases)
            {
                var plan = await _dynamoService.GetPricingPlanAsync(purchase.PlanId);
                
                // CRITICAL FIX: If plan not found, create default plan based on PlanId
                if (plan == null)
                {
                    Console.WriteLine($"[AdminController] Plan {purchase.PlanId} not found, creating default plan");
                    plan = new PricingPlan
                    {
                        PlanId = purchase.PlanId,
                        Name = purchase.PlanId.Contains("unlimited") ? "Unlimited Access" : 
                               purchase.PlanId.Contains("10") ? "10 Workouts" : 
                               purchase.PlanId.Contains("25") ? "25 Workouts" : "Workout Plan",
                        Price = purchase.PlanId.Contains("unlimited") ? 9.99m : 
                                purchase.PlanId.Contains("10") ? 1.99m : 
                                purchase.PlanId.Contains("25") ? 3.99m : 1.99m,
                        Currency = "USD",
                        TokenCount = purchase.PlanId.Contains("unlimited") ? null : 
                                    (purchase.PlanId.Contains("10") ? 10 : 
                                     purchase.PlanId.Contains("25") ? 25 : 10),
                        IsUnlimited = purchase.PlanId.Contains("unlimited"),
                        UnlimitedDays = purchase.PlanId.Contains("unlimited") ? 365 : null,
                        DisplayOrder = 1,
                        IsRecommended = false,
                        IsActive = true,
                        StripePriceId = string.Empty,
                        CreatedAt = DateTime.UtcNow
                    };
                }
                
                enrichedPurchases.Add(new
                {
                    purchaseId = purchase.PurchaseId,
                    deviceId = purchase.DeviceId,
                    planId = purchase.PlanId,
                    planName = plan.Name,
                    packType = plan.Name, // Use plan name as pack type
                    amount = plan.Price,
                    amountTotal = plan.Price, // Frontend expects both
                    currency = plan.Currency ?? "USD",
                    status = purchase.Status,
                    paymentStatus = purchase.Status, // Frontend expects both
                    purchasedAt = purchase.PurchasedAt,
                    createdAt = purchase.PurchasedAt, // Frontend expects both
                    expiresAt = purchase.ExpiresAt,
                    tokensGranted = purchase.TokensGranted,
                    tokensPurchased = purchase.TokensGranted, // Frontend expects both
                    isUnlimited = purchase.IsUnlimited,
                    stripeSessionId = purchase.StripeSessionId,
                    stripePaymentIntentId = purchase.StripePaymentIntentId,
                    customerEmail = purchase.CustomerEmail ?? string.Empty,
                    customerName = purchase.CustomerName ?? string.Empty
                });
            }
            
            return Ok(enrichedPurchases);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get purchases", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/purchases/{deviceId}")]
    public async Task<IActionResult> GetPurchasesByCustomer(string deviceId)
    {
        try
        {
            var purchases = await _dynamoService.GetUserPurchasesByDeviceIdAsync(deviceId);
            
            // AGGRESSIVE FIX: Enrich purchases with plan details
            var enrichedPurchases = new List<object>();
            foreach (var purchase in purchases)
            {
                var plan = await _dynamoService.GetPricingPlanAsync(purchase.PlanId);
                enrichedPurchases.Add(new
                {
                    purchase.PurchaseId,
                    purchase.DeviceId,
                    purchase.PlanId,
                    PlanName = plan?.Name ?? "Unknown Plan",
                    Amount = plan?.Price ?? 0,
                    Currency = plan?.Currency ?? "USD",
                    purchase.Status,
                    purchase.PurchasedAt,
                    purchase.ExpiresAt,
                    purchase.TokensGranted,
                    purchase.IsUnlimited,
                    purchase.StripeSessionId,
                    purchase.StripePaymentIntentId
                });
            }
            
            return Ok(enrichedPurchases);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get purchases", error = ex.Message });
        }
    }

    // Pricing Plan Management
    [Authorize]
    [HttpGet("admin/pricing-plans")]
    public async Task<IActionResult> GetAllPricingPlans()
    {
        try
        {
            var plans = await _dynamoService.GetAllPricingPlansAsync();
            return Ok(plans);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get pricing plans", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/pricing-plans/{planId}")]
    public async Task<IActionResult> GetPricingPlan(string planId)
    {
        try
        {
            var plan = await _dynamoService.GetPricingPlanAsync(planId);
            if (plan == null)
            {
                return NotFound(new { message = "Pricing plan not found" });
            }
            return Ok(plan);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get pricing plan", error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("admin/pricing-plans")]
    public async Task<IActionResult> CreatePricingPlan([FromBody] PricingPlan plan)
    {
        try
        {
            plan.PlanId = Guid.NewGuid().ToString();
            plan.CreatedAt = DateTime.UtcNow;
            await _dynamoService.SavePricingPlanAsync(plan);
            
            // Invalidate cache
            PricingController.InvalidateCache();
            
            return Ok(plan);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create pricing plan", error = ex.Message });
        }
    }

    [Authorize]
    [HttpPut("admin/pricing-plans/{planId}")]
    public async Task<IActionResult> UpdatePricingPlan(string planId, [FromBody] PricingPlan plan)
    {
        try
        {
            var existing = await _dynamoService.GetPricingPlanAsync(planId);
            if (existing == null)
            {
                return NotFound(new { message = "Pricing plan not found" });
            }

            plan.PlanId = planId;
            plan.UpdatedAt = DateTime.UtcNow;
            await _dynamoService.SavePricingPlanAsync(plan);
            
            // Invalidate cache
            PricingController.InvalidateCache();
            
            return Ok(plan);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update pricing plan", error = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("admin/pricing-plans/{planId}")]
    public async Task<IActionResult> DeletePricingPlan(string planId)
    {
        try
        {
            var plan = await _dynamoService.GetPricingPlanAsync(planId);
            if (plan == null)
            {
                return NotFound(new { message = "Pricing plan not found" });
            }

            // Soft delete by setting IsActive to false
            plan.IsActive = false;
            plan.UpdatedAt = DateTime.UtcNow;
            await _dynamoService.SavePricingPlanAsync(plan);
            
            // Invalidate cache
            PricingController.InvalidateCache();
            
            return Ok(new { message = "Pricing plan deleted" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to delete pricing plan", error = ex.Message });
        }
    }
}

