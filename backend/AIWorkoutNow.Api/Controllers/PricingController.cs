using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[EnableCors("AllowAll")]
[Route("")]
public class PricingController : ControllerBase
{
    private readonly IDynamoDBService _dynamoService;
    private readonly IConfigService _configService;
    private readonly IEmailService _emailService;
    private static List<PricingPlan>? _cachedPlans;
    private static DateTime _cacheExpiry = DateTime.MinValue;
    private static readonly object _cacheLock = new object();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1); // Cache for 1 hour (aggressive caching)
    
    // Note: Static constructor removed - we'll populate cache on first request
    // This avoids dependency injection issues in static constructor

    public PricingController(IDynamoDBService dynamoService, IConfigService configService, IEmailService emailService)
    {
        _dynamoService = dynamoService;
        _configService = configService;
        _emailService = emailService;
    }

    private async Task NotifyAdminForUnnotifiedCompletedPurchasesAsync(string deviceId)
    {
        try
        {
            var purchases = await _dynamoService.GetUserPurchasesByDeviceIdAsync(deviceId);
            var unnotified = purchases
                .Where(p => string.Equals(p.Status, "completed", StringComparison.OrdinalIgnoreCase) && !p.AdminNotifiedAt.HasValue)
                .OrderByDescending(p => p.PurchasedAt)
                .ToList();

            if (unnotified.Count == 0) return;

            // If there is backlog (older purchases created before this feature), avoid spamming:
            // - Email only the newest purchase if it is recent.
            // - Mark older backlog as notified without sending.
            var now = DateTime.UtcNow;
            var newest = unnotified.First();
            var recentWindow = TimeSpan.FromMinutes(30);

            if (now - newest.PurchasedAt > recentWindow)
            {
                // Backlog only: mark as notified so we stop sending on every poll.
                foreach (var p in unnotified)
                {
                    p.AdminNotifiedAt = now;
                    await _dynamoService.SaveUserPurchaseAsync(p);
                }
                Console.WriteLine($"[PricingController] Marked {unnotified.Count} old purchases as admin-notified (device {deviceId})");
                return;
            }

            // Email newest recent purchase once
            try
            {
                var plan = await _dynamoService.GetPricingPlanAsync(newest.PlanId);
                await _emailService.SendPurchaseNotificationAsync(newest, plan);
                newest.AdminNotifiedAt = now;
                await _dynamoService.SaveUserPurchaseAsync(newest);
                Console.WriteLine($"[PricingController] Admin purchase email sent for purchase {newest.PurchaseId} (device {deviceId})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PricingController] Admin purchase email failed (non-critical) for device {deviceId}: {ex.Message}");
            }

            // Mark any older purchases outside the window as notified (no email)
            var olderBacklog = unnotified.Skip(1).Where(p => now - p.PurchasedAt > recentWindow).ToList();
            if (olderBacklog.Count > 0)
            {
                foreach (var p in olderBacklog)
                {
                    p.AdminNotifiedAt = now;
                    await _dynamoService.SaveUserPurchaseAsync(p);
                }
                Console.WriteLine($"[PricingController] Marked {olderBacklog.Count} older purchases as admin-notified (device {deviceId})");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PricingController] NotifyAdminForUnnotifiedCompletedPurchasesAsync failed (non-critical): {ex.Message}");
        }
    }

    public static void InvalidateCache()
    {
        lock (_cacheLock)
        {
            _cachedPlans = null;
            _cacheExpiry = DateTime.MinValue;
            Console.WriteLine("[PricingController] Cache invalidated");
        }
    }

    [HttpGet("pricing-plans")]
    [HttpOptions("pricing-plans")]
    public async Task<IActionResult> GetPricingPlans()
    {
        // Handle OPTIONS preflight
        if (Request.Method == "OPTIONS")
        {
            Response.Headers["Access-Control-Allow-Origin"] = "*";
            Response.Headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
            Response.Headers["Access-Control-Allow-Headers"] = "Content-Type";
            return Ok();
        }
        
        var startTime = DateTime.UtcNow;
        try
        {
            List<PricingPlan> plans;
            
            // Check cache
            lock (_cacheLock)
            {
                if (_cachedPlans != null && DateTime.UtcNow < _cacheExpiry)
                {
                    var cacheTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
                    Console.WriteLine($"[PricingController] Returning cached pricing plans ({cacheTime:F2}ms)");
                    plans = _cachedPlans;
                }
                else
                {
                    plans = null!; // Will fetch from DB
                }
            }
            
            // Fetch from service if cache expired or empty
            // ULTRA FAST: Return default plans immediately if cache is empty, then populate in background
            if (plans == null)
            {
                Console.WriteLine("[PricingController] Cache miss, returning defaults immediately and fetching from service in background");
                
                // Return default plans immediately (no DB call)
                var defaultPlans = new List<PricingPlan>
                {
                    new PricingPlan
                    {
                        PlanId = "default-10-workouts",
                        Name = "10 Workouts",
                        Price = 1.99m,
                        Currency = "USD",
                        TokenCount = 10,
                        IsUnlimited = false,
                        DisplayOrder = 1,
                        IsRecommended = false,
                        IsActive = true,
                        StripePriceId = "",
                        CreatedAt = DateTime.UtcNow
                    },
                    new PricingPlan
                    {
                        PlanId = "default-30-workouts",
                        Name = "30 Workouts",
                        Price = 3.99m,
                        Currency = "USD",
                        TokenCount = 30,
                        IsUnlimited = false,
                        DisplayOrder = 2,
                        IsRecommended = true,
                        BadgeText = "⭐ Most Popular",
                        IsActive = true,
                        StripePriceId = "",
                        CreatedAt = DateTime.UtcNow
                    },
                    new PricingPlan
                    {
                        PlanId = "default-100-workouts",
                        Name = "100 Workouts",
                        Price = 7.99m,
                        Currency = "USD",
                        TokenCount = 100,
                        IsUnlimited = false,
                        DisplayOrder = 3,
                        IsRecommended = false,
                        IsActive = true,
                        StripePriceId = "",
                        CreatedAt = DateTime.UtcNow
                    }
                };
                
                // Cache defaults immediately
                lock (_cacheLock)
                {
                    _cachedPlans = defaultPlans;
                    _cacheExpiry = DateTime.UtcNow.Add(CacheDuration);
                }
                
                // Fetch real plans in background (fire and forget)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var fetchStart = DateTime.UtcNow;
                        var realPlans = await _dynamoService.GetAllPricingPlansAsync();
                        var fetchTime = (DateTime.UtcNow - fetchStart).TotalMilliseconds;
                        Console.WriteLine($"[PricingController] Background fetch: {realPlans.Count} plans in {fetchTime:F2}ms");
                        
                        if (realPlans != null && realPlans.Count > 0)
                        {
                            // CRITICAL FIX: Only update cache with ACTIVE plans
                            var activePlans = realPlans
                                .Where(p => p.IsActive && !p.IsUnlimited)
                                .ToList();
                            if (activePlans.Count > 0)
                            {
                                lock (_cacheLock)
                                {
                                    _cachedPlans = activePlans;
                                    _cacheExpiry = DateTime.UtcNow.Add(CacheDuration);
                                    Console.WriteLine($"[PricingController] Background cache updated with {activePlans.Count} active plans (filtered from {realPlans.Count} total)");
                                }
                            }
                            else
                            {
                                Console.WriteLine($"[PricingController] WARNING: All {realPlans.Count} fetched plans are inactive, keeping default plans in cache");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[PricingController] Background fetch error (non-critical): {ex.Message}");
                    }
                });
                
                plans = defaultPlans;
                var immediateTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
                Console.WriteLine($"[PricingController] Returning default plans immediately ({immediateTime:F2}ms)");
            }

            // AGGRESSIVE FIX: Double-check we never return empty
            if (plans == null || plans.Count == 0)
            {
                Console.WriteLine("[PricingController] CRITICAL: Plans are still empty after all checks, returning hardcoded defaults");
                plans = new List<PricingPlan>
                {
                    new PricingPlan
                    {
                        PlanId = "default-10-workouts",
                        Name = "10 Workouts",
                        Price = 1.99m,
                        Currency = "USD",
                        TokenCount = 10,
                        IsUnlimited = false,
                        DisplayOrder = 1,
                        IsRecommended = false,
                        IsActive = true,
                        StripePriceId = "",
                        CreatedAt = DateTime.UtcNow
                    },
                    new PricingPlan
                    {
                        PlanId = "default-30-workouts",
                        Name = "30 Workouts",
                        Price = 3.99m,
                        Currency = "USD",
                        TokenCount = 30,
                        IsUnlimited = false,
                        DisplayOrder = 2,
                        IsRecommended = true,
                        BadgeText = "⭐ Most Popular",
                        IsActive = true,
                        StripePriceId = "",
                        CreatedAt = DateTime.UtcNow
                    },
                    new PricingPlan
                    {
                        PlanId = "default-100-workouts",
                        Name = "100 Workouts",
                        Price = 7.99m,
                        Currency = "USD",
                        TokenCount = 100,
                        IsUnlimited = false,
                        DisplayOrder = 3,
                        IsRecommended = false,
                        IsActive = true,
                        StripePriceId = "",
                        CreatedAt = DateTime.UtcNow
                    }
                };
            }

            // Set cache headers for browser caching
            Response.Headers["Cache-Control"] = "public, max-age=300"; // 5 minutes
            Response.Headers["ETag"] = $"\"{plans.GetHashCode()}\"";
            
            var totalTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
            Console.WriteLine($"[PricingController] Total response time: {totalTime:F2}ms, returning {plans.Count} plans");
            
            return Ok(plans);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PricingController] Error in GetPricingPlans: {ex.Message}");
            Console.WriteLine($"[PricingController] Stack trace: {ex.StackTrace}");
            // AGGRESSIVE FIX: On error, return default plans instead of 500
            Console.WriteLine("[PricingController] Returning default plans due to error");
            var defaultPlans = new List<PricingPlan>
            {
                new PricingPlan
                {
                    PlanId = "default-10-workouts",
                    Name = "10 Workouts",
                    Price = 1.99m,
                    Currency = "USD",
                    TokenCount = 10,
                    IsUnlimited = false,
                    DisplayOrder = 1,
                    IsRecommended = false,
                    IsActive = true,
                    StripePriceId = "",
                    CreatedAt = DateTime.UtcNow
                },
                new PricingPlan
                {
                        PlanId = "default-30-workouts",
                        Name = "30 Workouts",
                    Price = 3.99m,
                    Currency = "USD",
                        TokenCount = 30,
                    IsUnlimited = false,
                    DisplayOrder = 2,
                    IsRecommended = true,
                    BadgeText = "⭐ Most Popular",
                    IsActive = true,
                    StripePriceId = "",
                    CreatedAt = DateTime.UtcNow
                },
                new PricingPlan
                {
                        PlanId = "default-100-workouts",
                        Name = "100 Workouts",
                        Price = 7.99m,
                        Currency = "USD",
                        TokenCount = 100,
                        IsUnlimited = false,
                        DisplayOrder = 3,
                        IsRecommended = false,
                        IsActive = true,
                        StripePriceId = "",
                        CreatedAt = DateTime.UtcNow
                }
            };
            return Ok(defaultPlans);
        }
    }

    [HttpGet("amazon-associate-tag")]
    [HttpOptions("amazon-associate-tag")]
    public async Task<IActionResult> GetAmazonAssociateTag()
    {
        var tag = await _configService.GetAmazonAssociateIdAsync();
        return Ok(new { tag });
    }

    [HttpGet("free-workouts-remaining")]
    public async Task<IActionResult> GetFreeWorkoutsRemaining([FromQuery] string deviceId)
    {
        try
        {
            // Count total workouts generated by this device
            // For free tier, we track total workouts (not daily)
            var totalWorkouts = await _dynamoService.GetTotalFreeWorkoutsAsync(deviceId);
            var remaining = Math.Max(0, 3 - totalWorkouts);
            
            return Ok(new { remaining = remaining, totalUsed = totalWorkouts });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get free workouts", error = ex.Message });
        }
    }

    [HttpGet("user-access-status")]
    public async Task<IActionResult> GetUserAccessStatus([FromQuery] string deviceId)
    {
        try
        {
            // Attempt to verify and apply any paid pending purchases (handles back button / delayed webhooks)
            try
            {
                var stripeSecret = await _configService.GetStripeSecretKeyAsync();
                if (!string.IsNullOrEmpty(stripeSecret))
                {
                    await _dynamoService.ApplyPendingPurchasesAsync(deviceId, stripeSecret);
                    // Ensure purchases have customer_details before emailing admin.
                    await _dynamoService.EnrichPurchasesFromStripeAsync(deviceId, stripeSecret);
                    // Purchases may be completed via this path (without webhook). Send admin email once.
                    await NotifyAdminForUnnotifiedCompletedPurchasesAsync(deviceId);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PricingController] Error applying pending purchases: {ex.Message}");
            }

            var balance = await _dynamoService.GetBalanceAsync(deviceId);
            return Ok(new
            {
                hasFreeAccess = balance.FreeWorkoutsRemaining > 0,
                freeWorkoutsRemaining = balance.FreeWorkoutsRemaining,
                hasUnlimitedAccess = balance.HasUnlimitedAccess,
                unlimitedExpiresAt = balance.UnlimitedExpiresAt?.ToString("O"),
                hasTokenAccess = balance.PaidWorkoutsRemaining > 0 && balance.PaidWorkoutsRemaining < 999999,
                tokensRemaining = balance.PaidWorkoutsRemaining,
                remainingWorkouts = balance.RemainingWorkouts,
                totalWorkouts = balance.TotalWorkouts,
                canGenerateWorkout = balance.HasUnlimitedAccess || balance.PaidWorkoutsRemaining > 0 || balance.FreeWorkoutsRemaining > 0
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PricingController] Error in GetUserAccessStatus: {ex.Message}");
            Console.WriteLine($"[PricingController] Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Failed to get access status", error = ex.Message });
        }
    }
}
