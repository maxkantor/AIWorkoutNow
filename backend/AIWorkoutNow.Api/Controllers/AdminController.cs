using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[EnableCors("AllowAll")]
[Route("")]
public class AdminController : ControllerBase
{
    private readonly IDynamoDBService _dynamoService;
    private readonly IAuthService _authService;
    private readonly IEmailService _emailService;
    private readonly IConfigService _configService;

    private async Task<AdminUser?> EnsureDefaultAdminAsync()
    {
        // Seed a default admin if the AdminUsers table is empty or the default email is missing.
        var defaultEmail = Environment.GetEnvironmentVariable("DEFAULT_ADMIN_EMAIL") ?? "admin@aiworkoutnow.com";
        var defaultPassword = Environment.GetEnvironmentVariable("DEFAULT_ADMIN_PASSWORD") ?? "Maxang11@@";

        if (string.IsNullOrWhiteSpace(defaultEmail) || string.IsNullOrWhiteSpace(defaultPassword))
        {
            return null;
        }

        var existing = await _dynamoService.GetAdminUserAsync(defaultEmail);
        if (existing != null)
        {
            return existing;
        }

        var seeded = new AdminUser
        {
            AdminId = Guid.NewGuid().ToString(),
            Email = defaultEmail,
            PasswordHash = _authService.HashPassword(defaultPassword),
            Role = "owner",
            CreatedAt = DateTime.UtcNow
        };

        await _dynamoService.SaveAdminUserAsync(seeded);
        Console.WriteLine($"[AdminController] Seeded default admin user: {defaultEmail}");
        return seeded;
    }

    public AdminController(
        IDynamoDBService dynamoService,
        IAuthService authService,
        IEmailService emailService,
        IConfigService configService)
    {
        _dynamoService = dynamoService;
        _authService = authService;
        _emailService = emailService;
        _configService = configService;
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
                var seeded = await EnsureDefaultAdminAsync();
                if (seeded == null || !string.Equals(seeded.Email, request.Email, StringComparison.OrdinalIgnoreCase))
                {
                    return Unauthorized(new { message = "Invalid credentials" });
                }

                admin = seeded;
            }

            Console.WriteLine($"[AdminController] Admin user found: {admin.AdminId}");
            
            if (!_authService.VerifyPassword(request.Password, admin.PasswordHash))
            {
                // If the stored PasswordHash was created using a different scheme (or accidentally stored as plaintext),
                // allow a one-time "self-heal" ONLY for the default admin account and migrate to BCrypt.
                var defaultEmail = Environment.GetEnvironmentVariable("DEFAULT_ADMIN_EMAIL") ?? "admin@aiworkoutnow.com";
                var defaultPassword = Environment.GetEnvironmentVariable("DEFAULT_ADMIN_PASSWORD") ?? "Maxang11@@";

                var isDefaultAccount = string.Equals(request.Email, defaultEmail, StringComparison.OrdinalIgnoreCase);
                var passwordMatchesDefault = string.Equals(request.Password, defaultPassword, StringComparison.Ordinal);
                var storedLooksPlaintext = !string.IsNullOrWhiteSpace(admin.PasswordHash) && !admin.PasswordHash.StartsWith("$2", StringComparison.Ordinal);
                var storedEqualsPassword = string.Equals(admin.PasswordHash, request.Password, StringComparison.Ordinal);

                if (isDefaultAccount && (passwordMatchesDefault || (storedLooksPlaintext && storedEqualsPassword)))
                {
                    Console.WriteLine("[AdminController] Default admin password accepted; migrating stored hash to BCrypt");
                    admin.PasswordHash = _authService.HashPassword(request.Password);
                    await _dynamoService.SaveAdminUserAsync(admin);
                }
                else
                {
                    Console.WriteLine("[AdminController] Password verification failed");
                    return Unauthorized(new { message = "Invalid credentials" });
                }
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
    [HttpGet("admin/analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] string period = "day")
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            
            // Validate period
            if (!new[] { "hour", "day", "week", "month" }.Contains(period))
            {
                period = "day";
            }

            var analytics = await _dynamoService.GetAnalyticsDataAsync(start, end, period);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get analytics", error = ex.Message });
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
            // Best-effort enrich purchases with Stripe customer info before returning
            try
            {
                var secret = await _configService.GetStripeSecretKeyAsync();
                if (!string.IsNullOrEmpty(secret))
                {
                    await _dynamoService.EnrichPurchasesFromStripeAsync(deviceId, secret);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminController] Enrich purchases failed: {ex.Message}");
            }

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

            try
            {
                // Send email reply (Reply-To set to admin email from SSM)
                await _emailService.SendContactReplyToCustomerAsync(message, request.ReplyText);

                reply.Sent = true;
                await _dynamoService.SaveContactReplyAsync(reply);
                return Ok(new { message = "Reply sent successfully", reply });
            }
            catch (Exception emailEx)
            {
                Console.WriteLine($"[AdminController] Email send failed: {emailEx.Message}");
                return Ok(new { message = "Reply saved but email failed to send", reply, error = emailEx.Message });
            }
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
        // CRITICAL: Ensure CORS headers are set on response
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
        Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
        
        try
        {
            Console.WriteLine($"[AdminController] ResetTokens called for device: {deviceId}");
            Console.WriteLine($"[AdminController] Request: NewTokenCount={request.NewTokenCount}, PreviousTokenCount={request.PreviousTokenCount}, Reason={request.Reason}");
            
            // GLOBAL PER EMAIL: if this device is linked to an email, reset all devices under that email.
            try
            {
                var mapping = await _dynamoService.GetEmailByVisitorIdAsync(deviceId);
                if (mapping != null && !string.IsNullOrWhiteSpace(mapping.Email) && mapping.VisitorIds.Any())
                {
                    Console.WriteLine($"[AdminController] ResetTokens: device {deviceId} is linked to {mapping.Email}; resetting {mapping.VisitorIds.Count} device(s) globally");
                    BalanceDto? primary = null;
                    foreach (var vid in mapping.VisitorIds.Distinct(StringComparer.OrdinalIgnoreCase))
                    {
                        var b = await _dynamoService.ResetBalanceAsync(vid, request.NewTokenCount, request.Reason ?? $"Admin reset (email: {mapping.Email})");
                        if (string.Equals(vid, deviceId, StringComparison.OrdinalIgnoreCase)) primary = b;
                    }
                    return Ok(primary ?? await _dynamoService.GetBalanceAsync(deviceId));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminController] ResetTokens: global-by-email lookup failed (non-critical): {ex.Message}");
            }

            // Get previous token count if not provided
            int previousCount = request.PreviousTokenCount;
            if (previousCount == 0)
            {
                var tokens = await _dynamoService.GetUserTokensAsync(deviceId);
                previousCount = tokens?.TokensRemaining ?? 0;
                Console.WriteLine($"[AdminController] Retrieved previous count from DB: {previousCount}");
            }
            
            Console.WriteLine($"[AdminController] Resetting tokens from {previousCount} to {request.NewTokenCount}");
            // Reset balance to exact count and return updated balance DTO
            var balance = await _dynamoService.ResetBalanceAsync(deviceId, request.NewTokenCount, request.Reason);
            
            Console.WriteLine($"[AdminController] Reset successful for device: {deviceId}");
            return Ok(balance);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AdminController] ResetTokens error: {ex.Message}");
            Console.WriteLine($"[AdminController] Stack trace: {ex.StackTrace}");
            // CRITICAL: Set CORS headers even on error
            Response.Headers["Access-Control-Allow-Origin"] = "*";
            Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
            Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
            return StatusCode(500, new { message = "Failed to reset tokens", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/customers/by-email/{email}")]
    public async Task<IActionResult> GetCustomersByEmail(string email)
    {
        try
        {
            // CRITICAL: Ensure CORS headers are set on response
            Response.Headers["Access-Control-Allow-Origin"] = "*";
            Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
            Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
            
            // URL decode email in case it's encoded
            email = Uri.UnescapeDataString(email);
            
            var visitorIds = await _dynamoService.GetVisitorIdsByEmailAsync(email);
            if (!visitorIds.Any())
            {
                return Ok(new { email, deviceIds = new List<string>(), message = "No devices found for this email" });
            }

            var customers = new List<AdminCustomerSummary>();
            foreach (var deviceId in visitorIds)
            {
                var summary = await _dynamoService.GetCustomerSummaryAsync(deviceId);
                if (summary != null)
                {
                    customers.Add(new AdminCustomerSummary
                    {
                        DeviceId = summary.DeviceId,
                        Email = summary.Email,
                        Name = summary.Name,
                        IsDeactivated = summary.IsDeactivated,
                        StatusLabel = summary.StatusLabel,
                        RemainingTokens = summary.RemainingTokens,
                        GeneratedWorkouts = summary.GeneratedWorkouts,
                        RemainingWorkouts = summary.RemainingWorkouts,
                        TotalWorkouts = summary.TotalWorkouts,
                        PurchasesCount = summary.PurchasesCount,
                        TotalSpentCents = summary.TotalSpentCents,
                        TotalSpentFormatted = summary.TotalSpentFormatted,
                        LastActivityIso = summary.LastActivityIso
                    });
                }
            }

            return Ok(new { email, deviceIds = visitorIds, customers });
        }
        catch (Exception ex)
        {
            // CRITICAL: Set CORS headers even on error
            Response.Headers["Access-Control-Allow-Origin"] = "*";
            Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
            Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
            return StatusCode(500, new { message = "Failed to get customers by email", error = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("admin/customers/{deviceId}")]
    public async Task<IActionResult> DeleteCustomer(string deviceId)
    {
        try
        {
            Console.WriteLine($"[AdminController] DeleteCustomer (deactivate) called for device: {deviceId}");
            
            // Mark customer as inactive instead of deleting
            await _dynamoService.DeactivateCustomerAsync(deviceId);
            
            Console.WriteLine($"[AdminController] Customer deactivated successfully: {deviceId}");
            return Ok(new { message = "Customer deactivated successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AdminController] DeleteCustomer error: {ex.Message}");
            return StatusCode(500, new { message = "Failed to deactivate customer", error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("admin/customers/by-email/{email}/reset-tokens")]
    public async Task<IActionResult> ResetTokensByEmail(string email, [FromBody] ResetTokensRequest request)
    {
        // CRITICAL: Ensure CORS headers are set on response
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
        Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
        
        // URL decode email in case it's encoded
        email = Uri.UnescapeDataString(email);
        
        try
        {
            var visitorIds = await _dynamoService.GetVisitorIdsByEmailAsync(email);
            if (!visitorIds.Any())
            {
                return NotFound(new { message = "No devices found for this email" });
            }

            var results = new List<object>();
            foreach (var deviceId in visitorIds)
            {
                try
                {
                    var tokens = await _dynamoService.GetUserTokensAsync(deviceId);
                    var previousCount = tokens?.TokensRemaining ?? 0;
                    // Use ResetBalanceAsync so LastResetAt is set and restore logic respects this reset.
                    await _dynamoService.ResetBalanceAsync(deviceId, request.NewTokenCount, request.Reason ?? $"Admin reset by email: {email}");
                    
                    // Log activity
                    await _dynamoService.SaveCustomerActivityAsync(new CustomerActivity
                    {
                        DeviceId = deviceId,
                        ActivityType = "tokens_reset",
                        Description = $"Tokens reset to {request.NewTokenCount} by admin (via email: {email})",
                        Details = new Dictionary<string, object>
                        {
                            { "previousCount", previousCount },
                            { "newCount", request.NewTokenCount },
                            { "reason", request.Reason ?? "Admin reset by email" },
                            { "email", email }
                        }
                    });

                    results.Add(new { deviceId, success = true, previousCount, newCount = request.NewTokenCount });
                }
                catch (Exception ex)
                {
                    results.Add(new { deviceId, success = false, error = ex.Message });
                }
            }

            var successCount = results.Count(r => ((dynamic)r).success == true);
            return Ok(new 
            { 
                message = $"Reset tokens on {successCount} of {visitorIds.Count} device(s)",
                email,
                results 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to reset tokens by email", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("admin/purchases")]
    public async Task<IActionResult> GetAllPurchases()
    {
        try
        {
            var stripeSecretKey = await _configService.GetStripeSecretKeyAsync();

            // Fetch raw UserPurchases (includes pending/failed/etc). We then optionally reconcile/enrich only
            // the devices that appear in this purchases list to keep this endpoint fast and reliable.
            var userPurchases = await _dynamoService.GetAllUserPurchasesAsync();

            if (!string.IsNullOrEmpty(stripeSecretKey) && userPurchases.Count > 0)
            {
                var deviceIds = userPurchases
                    .Select(p => p.DeviceId)
                    .Where(d => !string.IsNullOrWhiteSpace(d))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(200)
                    .ToList();

                foreach (var deviceId in deviceIds)
                {
                    await _dynamoService.ApplyPendingPurchasesAsync(deviceId, stripeSecretKey);
                    await _dynamoService.EnrichPurchasesFromStripeAsync(deviceId, stripeSecretKey);
                }

                // Re-read after enrichment
                userPurchases = await _dynamoService.GetAllUserPurchasesAsync();
            }

            // Map UserPurchase -> StripePurchase DTO expected by frontend
            decimal InferPriceFromTokens(int tokens) => tokens switch
            {
                10 => 1.99m,
                30 => 3.99m,
                100 => 7.99m,
                _ => 0m
            };

            (string packName, int tokens, decimal price) InferPackFromPlanId(string? planId)
            {
                var id = (planId ?? "").ToLowerInvariant();
                // IMPORTANT: order matters (100 before 10, 30 before 10)
                if (id.Contains("100")) return ("100 Workouts", 100, 7.99m);
                if (id.Contains("30")) return ("30 Workouts", 30, 3.99m);
                if (id.Contains("10")) return ("10 Workouts", 10, 1.99m);
                return ("Unknown Pack", 0, 0m);
            }

            var planCache = new Dictionary<string, PricingPlan?>(StringComparer.OrdinalIgnoreCase);
            async Task<PricingPlan?> GetPlanCached(string planId)
            {
                if (string.IsNullOrWhiteSpace(planId)) return null;
                if (planCache.TryGetValue(planId, out var existing)) return existing;
                var plan = await _dynamoService.GetPricingPlanAsync(planId);
                planCache[planId] = plan;
                return plan;
            }

            var purchases = new List<StripePurchase>();
            foreach (var up in userPurchases)
            {
                var plan = await GetPlanCached(up.PlanId);
                var inferred = InferPackFromPlanId(up.PlanId);
                var tokensPurchased = up.TokensGranted
                                     ?? plan?.TokenCount
                                     ?? (inferred.tokens > 0 ? inferred.tokens : (up.IsUnlimited ? 999999 : 0));

                var amount = plan?.Price
                            ?? (inferred.price > 0 ? inferred.price : InferPriceFromTokens(tokensPurchased));

                var currency = plan?.Currency ?? "USD";
                var packType = plan?.Name ?? (inferred.tokens > 0 ? inferred.packName : up.PlanId);

                purchases.Add(new StripePurchase
                {
                    PurchaseId = up.PurchaseId,
                    DeviceId = up.DeviceId,
                    StripeCustomerId = "",
                    StripePaymentIntentId = up.StripePaymentIntentId,
                    StripeSessionId = up.StripeSessionId,
                    PackType = packType,
                    Amount = amount,
                    Currency = currency,
                    TokensPurchased = tokensPurchased,
                    Status = up.Status,
                    CreatedAt = up.PurchasedAt,
                    CompletedAt = string.Equals(up.Status, "completed", StringComparison.OrdinalIgnoreCase) ? up.PurchasedAt : null,
                    CustomerEmail = up.CustomerEmail,
                    CustomerName = up.CustomerName
                });
            }

            // Remove pending rows from grid (they are noisy and users can abandon checkout frequently)
            purchases = purchases
                .Where(p => !string.Equals(p.Status, "pending", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var completed = purchases.Where(p => string.Equals(p.Status, "completed", StringComparison.OrdinalIgnoreCase)).ToList();
            var totalRevenue = completed.Sum(p => p.Amount);

            return Ok(new
            {
                totalRevenue,
                totalPurchases = purchases.Count,
                completedCount = completed.Count,
                purchases = purchases.OrderByDescending(p => p.CreatedAt)
            });
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

    /// <summary>One-time or occasional maintenance: set TTL (expiresAt) for given device IDs so DynamoDB can auto-expire BOT/UNKNOWN data. Admin-only. Never touches HUMAN records.</summary>
    [Authorize]
    [HttpPost("admin/maintenance/set-ttl-for-devices")]
    public async Task<IActionResult> SetTtlForDevices([FromBody] SetTtlForDevicesRequest? request)
    {
        if (request?.DeviceIds == null || request.DeviceIds.Count == 0)
        {
            return BadRequest(new { message = "deviceIds array is required and must not be empty" });
        }
        var expireDays = request.ExpireDays is > 0 and <= 365 ? request.ExpireDays.Value : 7;
        try
        {
            var updated = await _dynamoService.SetExpiresAtForDevicesAsync(request.DeviceIds, expireDays);
            return Ok(new { message = "TTL set", updatedCount = updated, deviceCount = request.DeviceIds.Count, expireDays });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to set TTL", error = ex.Message });
        }
    }
}

public class SetTtlForDevicesRequest
{
    public List<string> DeviceIds { get; set; } = new();
    public int? ExpireDays { get; set; } = 7;
}

