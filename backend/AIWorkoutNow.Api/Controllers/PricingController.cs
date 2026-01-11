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
    private static List<PricingPlan>? _cachedPlans;
    private static DateTime _cacheExpiry = DateTime.MinValue;
    private static readonly object _cacheLock = new object();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1); // Cache for 1 hour (aggressive caching)
    
    // Note: Static constructor removed - we'll populate cache on first request
    // This avoids dependency injection issues in static constructor

    public PricingController(IDynamoDBService dynamoService, IConfigService configService)
    {
        _dynamoService = dynamoService;
        _configService = configService;
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
                        PlanId = "default-25-workouts",
                        Name = "25 Workouts",
                        Price = 3.99m,
                        Currency = "USD",
                        TokenCount = 25,
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
                        PlanId = "default-unlimited-access",
                        Name = "Unlimited Access",
                        Price = 9.99m,
                        Currency = "USD",
                        IsUnlimited = true,
                        UnlimitedDays = 365,
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
                            var activePlans = realPlans.Where(p => p.IsActive).ToList();
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
                        PlanId = "default-25-workouts",
                        Name = "25 Workouts",
                        Price = 3.99m,
                        Currency = "USD",
                        TokenCount = 25,
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
                        PlanId = "default-unlimited-access",
                        Name = "Unlimited Access",
                        Price = 9.99m,
                        Currency = "USD",
                        IsUnlimited = true,
                        UnlimitedDays = 365,
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
                    PlanId = "default-25-workouts",
                    Name = "25 Workouts",
                    Price = 3.99m,
                    Currency = "USD",
                    TokenCount = 25,
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
                    PlanId = "default-unlimited-access",
                    Name = "Unlimited Access",
                    Price = 9.99m,
                    Currency = "USD",
                    IsUnlimited = true,
                    UnlimitedDays = 365,
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
            // Check free workouts
            var totalWorkouts = await _dynamoService.GetTotalFreeWorkoutsAsync(deviceId);
            var freeWorkoutsRemaining = Math.Max(0, 3 - totalWorkouts);
            var hasFreeAccess = freeWorkoutsRemaining > 0;

            // Check token balance first (to detect unlimited via 999999 tokens)
            var tokens = await _dynamoService.GetUserTokensAsync(deviceId);
            var tokensRemaining = tokens?.TokensRemaining ?? 0;
            
            // Aggressive reconciliation: if purchases exist and tokensRemaining is lower than purchased tokens, bump tokensRemaining
            try
            {
                var purchases = await _dynamoService.GetUserPurchasesAsync(deviceId);
                var completed = purchases.Where(p => p.Status == "completed").ToList();
                var reconUnlimited = completed.FirstOrDefault(p => p.IsUnlimited);

                if (reconUnlimited != null)
                {
                    // Set unlimited marker
                    tokensRemaining = 999999;
                    var expiresAt = reconUnlimited.ExpiresAt ?? reconUnlimited.PurchasedAt.AddDays(365);
                    if (tokens == null)
                    {
                        tokens = new UserTokens
                        {
                            DeviceId = deviceId,
                            TokensRemaining = tokensRemaining,
                            ExpiresAt = expiresAt
                        };
                    }
                    else
                    {
                        tokens.TokensRemaining = tokensRemaining;
                        tokens.ExpiresAt = expiresAt;
                    }
                    await _dynamoService.SaveUserTokensAsync(tokens);
                }
                else
                {
                    var purchasedTokens = 0;
                    foreach (var p in completed)
                    {
                        if (p.TokensGranted.HasValue)
                        {
                            purchasedTokens += p.TokensGranted.Value;
                            continue;
                        }

                        // Backfill tokensGranted from plan if missing
                        try
                        {
                            var plan = await _dynamoService.GetPricingPlanAsync(p.PlanId);
                            if (plan?.IsUnlimited == true)
                            {
                                // Unlimited purchases should be handled in the unlimited branch; skip counting here
                                Console.WriteLine($"[PricingController] Skip token backfill for unlimited plan {p.PlanId}");
                                continue;
                            }

                            if (plan?.TokenCount != null && plan.TokenCount.Value > 0)
                            {
                                purchasedTokens += plan.TokenCount.Value;
                                Console.WriteLine($"[PricingController] Backfilled TokensGranted from plan {p.PlanId} => {plan.TokenCount}");
                            }
                            else
                            {
                                // Fallback to 10 only for non-unlimited plans when token count is missing
                                purchasedTokens += 10;
                                Console.WriteLine($"[PricingController] Plan {p.PlanId} missing TokenCount, defaulting TokensGranted to 10 (non-unlimited fallback)");
                            }
                        }
                        catch (Exception exPlan)
                        {
                            // Fallback to 10 only for non-unlimited plans when lookup fails
                            purchasedTokens += 10;
                            Console.WriteLine($"[PricingController] Plan lookup failed for {p.PlanId}: {exPlan.Message}. Defaulting TokensGranted to 10 (non-unlimited fallback)");
                        }
                    }

                    if (purchasedTokens > tokensRemaining)
                    {
                        if (tokens == null)
                        {
                            tokens = new UserTokens
                            {
                                DeviceId = deviceId,
                                TokensRemaining = purchasedTokens,
                                ExpiresAt = null
                            };
                        }
                        else
                        {
                            tokens.TokensRemaining = purchasedTokens;
                            tokens.ExpiresAt = null;
                        }
                        tokensRemaining = purchasedTokens;
                        await _dynamoService.SaveUserTokensAsync(tokens);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PricingController] Reconciliation error: {ex.Message}");
            }
            
            Console.WriteLine($"[PricingController] GetUserAccessStatus - DeviceId: {deviceId}, TokensRemaining: {tokensRemaining}, HasTokens: {tokens != null}");
            if (tokens != null)
            {
                Console.WriteLine($"[PricingController] Token details - DeviceId: {tokens.DeviceId}, TokensRemaining: {tokens.TokensRemaining}, ExpiresAt: {tokens.ExpiresAt}");
            }
            else
            {
                Console.WriteLine($"[PricingController] WARNING: No token record found for device {deviceId} - this might be why tokens are 0");
            }
            if (tokens != null && tokens.ExpiresAt.HasValue)
            {
                Console.WriteLine($"[PricingController] Token expires at: {tokens.ExpiresAt}");
            }
            
            // REMOVE early return for admin resets: always allow merge/purchase checks even if tokens > 0
            
            // Only check Stripe if tokens are exactly 0
            bool shouldCheckStripe = tokensRemaining == 0;
            
            if (shouldCheckStripe)
            {
                Console.WriteLine($"[PricingController] Tokens are low ({tokensRemaining}), checking Stripe for completed unlimited purchases...");
                try
                {
                    var stripeSecretKey = await _configService.GetStripeSecretKeyAsync();
                    
                    if (!string.IsNullOrEmpty(stripeSecretKey))
                    {
                        // Check recent Stripe sessions for this device
                        using var httpClient = new HttpClient();
                        httpClient.DefaultRequestHeaders.Authorization = 
                            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", stripeSecretKey);
                        
                        // List recent checkout sessions (last 10)
                        var sessionsUrl = "https://api.stripe.com/v1/checkout/sessions?limit=10";
                        var sessionsResponse = await httpClient.GetAsync(sessionsUrl);
                        
                        if (sessionsResponse.IsSuccessStatusCode)
                        {
                            var sessionsContent = await sessionsResponse.Content.ReadAsStringAsync();
                            var sessionsData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(sessionsContent);
                            
                            if (sessionsData != null && sessionsData.ContainsKey("data"))
                            {
                                // Fix JSON parsing - data is a JsonElement, not an array
                                var dataElement = (System.Text.Json.JsonElement)sessionsData["data"];
                                if (dataElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                                {
                                    foreach (var session in dataElement.EnumerateArray())
                                    {
                                        try
                                        {
                                            // Check if metadata exists
                                            if (!session.TryGetProperty("metadata", out var metadataElement))
                                                continue;
                                            
                                            if (!metadataElement.TryGetProperty("deviceId", out var deviceIdElement) ||
                                                !metadataElement.TryGetProperty("planId", out var planIdElement))
                                                continue;
                                            
                                            var deviceIdFromSession = deviceIdElement.GetString();
                                            var planId = planIdElement.GetString();
                                            
                                            if (!session.TryGetProperty("payment_status", out var paymentStatusElement))
                                                continue;
                                            
                                            var paymentStatus = paymentStatusElement.GetString();
                                            var sessionId = session.TryGetProperty("id", out var idElement) ? idElement.GetString() : "";
                                            
                                            if (deviceIdFromSession == deviceId && paymentStatus == "paid")
                                            {
                                                Console.WriteLine($"[PricingController] Found paid session {sessionId} for device {deviceId}, plan: {planId}");
                                                
                                                // Check if this is an unlimited plan
                                                var plan = await _dynamoService.GetPricingPlanAsync(planId ?? "");
                                                Console.WriteLine($"[PricingController] Plan lookup result - PlanId: {planId}, Plan found: {plan != null}, IsUnlimited: {plan?.IsUnlimited ?? false}");
                                                
                                                // CRITICAL FIX: Also check if planId contains "unlimited" as fallback
                                                var isUnlimitedPlan = (plan != null && plan.IsUnlimited) || (planId?.Contains("unlimited", StringComparison.OrdinalIgnoreCase) == true);
                                                
                                                if (isUnlimitedPlan)
                                                {
                                                    Console.WriteLine($"[PricingController] AGGRESSIVE FIX: Granting unlimited access from Stripe check!");
                                                    
                                                    // CRITICAL FIX: Get the actual purchase date, not use DateTime.UtcNow
                                                    DateTime purchaseDate = DateTime.UtcNow; // Default fallback
                                                    
                                                    // First, try to get purchase date from UserPurchases table
                                                    var existingPurchase = await _dynamoService.GetUserPurchasesAsync(deviceId);
                                                    var matchingPurchase = existingPurchase
                                                        .FirstOrDefault(p => p.PlanId == planId && p.Status == "completed" && p.IsUnlimited);
                                                    
                                                    if (matchingPurchase != null && matchingPurchase.PurchasedAt != default)
                                                    {
                                                        purchaseDate = matchingPurchase.PurchasedAt;
                                                        Console.WriteLine($"[PricingController] Using purchase date from database: {purchaseDate}");
                                                    }
                                                    else
                                                    {
                                                        // Try to get created timestamp from Stripe session
                                                        if (session.TryGetProperty("created", out var createdElement))
                                                        {
                                                            var createdUnix = createdElement.GetInt64();
                                                            purchaseDate = DateTimeOffset.FromUnixTimeSeconds(createdUnix).UtcDateTime;
                                                            Console.WriteLine($"[PricingController] Using purchase date from Stripe session: {purchaseDate}");
                                                        }
                                                        else
                                                        {
                                                            Console.WriteLine($"[PricingController] WARNING: Could not find purchase date, using current time as fallback");
                                                        }
                                                    }
                                                    
                                                    // Calculate expiration as 1 year from purchase date (not from now!)
                                                    var expirationDate = purchaseDate.AddDays(365);
                                                    
                                                    // Grant unlimited access immediately
                                                    if (tokens == null)
                                                    {
                                                        tokens = new UserTokens
                                                        {
                                                            DeviceId = deviceId,
                                                            TokensRemaining = 999999,
                                                            ExpiresAt = expirationDate
                                                        };
                                                    }
                                                    else
                                                    {
                                                        tokens.TokensRemaining = 999999;
                                                        tokens.ExpiresAt = expirationDate;
                                                    }
                                                    
                                                    await _dynamoService.SaveUserTokensAsync(tokens);
                                                    tokensRemaining = 999999;
                                                    
                                                    // CRITICAL FIX: Also create/save purchase record so it shows up in purchases
                                                    try
                                                    {
                                                        var purchase = new UserPurchase
                                                        {
                                                            PurchaseId = Guid.NewGuid().ToString(),
                                                            DeviceId = deviceId,
                                                            PlanId = planId ?? "",
                                                            StripeSessionId = sessionId ?? "",
                                                            StripePaymentIntentId = "",
                                                            Status = "completed",
                                                            PurchasedAt = purchaseDate,
                                                            ExpiresAt = expirationDate,
                                                            IsUnlimited = true,
                                                            TokensGranted = null
                                                        };
                                                        await _dynamoService.SaveUserPurchaseAsync(purchase);
                                                        Console.WriteLine($"[PricingController] Created purchase record: {purchase.PurchaseId}");
                                                    }
                                                    catch (Exception purchaseEx)
                                                    {
                                                        Console.WriteLine($"[PricingController] Error creating purchase record (non-critical): {purchaseEx.Message}");
                                                    }
                                                    
                                                    Console.WriteLine($"[PricingController] Successfully granted unlimited access via aggressive fix - Expires: {expirationDate} (1 year from purchase date: {purchaseDate})");
                                                    
                                                    // Break after first match
                                                    break;
                                                }
                                            }
                                        }
                                        catch (Exception ex)
                                        {
                                            Console.WriteLine($"[PricingController] Error processing Stripe session: {ex.Message}");
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[PricingController] Error checking Stripe (non-critical): {ex.Message}");
                }
            }
            
            // Check if tokens indicate unlimited access (999999 is our marker for unlimited)
            var hasUnlimitedFromTokens = tokensRemaining >= 999999;
            
            // Allow purchase reconciliation even if tokens were admin-reset
            bool hasUnlimitedFromPurchase = false;
            var unlimitedPurchase = (UserPurchase?)null;
            
            if (hasUnlimitedFromTokens)
            {
                unlimitedPurchase = await _dynamoService.GetActiveUnlimitedPurchaseAsync(deviceId);
                hasUnlimitedFromPurchase = unlimitedPurchase != null;
            }
            
            Console.WriteLine($"[PricingController] Unlimited check - FromTokens: {hasUnlimitedFromTokens}, FromPurchase: {hasUnlimitedFromPurchase}");
            if (unlimitedPurchase != null)
            {
                Console.WriteLine($"[PricingController] Unlimited purchase found - PlanId: {unlimitedPurchase.PlanId}, ExpiresAt: {unlimitedPurchase.ExpiresAt}");
                
                // AGGRESSIVE FIX: If expiration is missing or less than 1 year from purchase, update it
                if (unlimitedPurchase.PurchasedAt != default)
                {
                    var expectedExpiration = unlimitedPurchase.PurchasedAt.AddDays(365);
                    
                    // If ExpiresAt is null or less than 1 year from purchase, fix it
                    if (!unlimitedPurchase.ExpiresAt.HasValue || unlimitedPurchase.ExpiresAt.Value < expectedExpiration)
                    {
                        Console.WriteLine($"[PricingController] FIXING: Expiration {(unlimitedPurchase.ExpiresAt.HasValue ? unlimitedPurchase.ExpiresAt.Value.ToString() : "NULL")} is not 1 year from purchase, updating to {expectedExpiration}");
                        unlimitedPurchase.ExpiresAt = expectedExpiration;
                        await _dynamoService.SaveUserPurchaseAsync(unlimitedPurchase);
                        
                        // Also update tokens expiration
                        if (tokens != null)
                        {
                            tokens.ExpiresAt = expectedExpiration;
                            await _dynamoService.SaveUserTokensAsync(tokens);
                        }
                    }
                }
            }
            
            // ULTRA AGGRESSIVE FIX: If tokens have unlimited access, ALWAYS ensure expiration is correct
            // BUT: Skip this entirely if tokens are < 999999 (admin reset) - don't re-grant unlimited
            if (tokens != null && hasUnlimitedFromTokens)
            {
                Console.WriteLine($"[PricingController] ULTRA AGGRESSIVE FIX: Checking unlimited token expiration...");
                var purchases = await _dynamoService.GetUserPurchasesAsync(deviceId);
                Console.WriteLine($"[PricingController] Found {purchases.Count} purchases for device");
                
                var latestUnlimitedPurchase = purchases
                    .Where(p => p.IsUnlimited && p.Status == "completed")
                    .OrderByDescending(p => p.PurchasedAt)
                    .FirstOrDefault();
                
                DateTime? expectedExpiration = null;
                
                if (latestUnlimitedPurchase != null && latestUnlimitedPurchase.PurchasedAt != default)
                {
                    expectedExpiration = latestUnlimitedPurchase.PurchasedAt.AddDays(365);
                    Console.WriteLine($"[PricingController] Found unlimited purchase from {latestUnlimitedPurchase.PurchasedAt}, expected expiration: {expectedExpiration}");
                }
                else
                {
                    // CRITICAL FIX: If no purchase found, try to get purchase date from existing expiration
                    // If expiration exists, work backwards to find purchase date, then recalculate
                    if (tokens.ExpiresAt.HasValue)
                    {
                        // Try to infer purchase date from expiration (expiration - 365 days)
                        var inferredPurchaseDate = tokens.ExpiresAt.Value.AddDays(-365);
                        // Only use this if it's reasonable (not in the future, not too old)
                        if (inferredPurchaseDate <= DateTime.UtcNow && inferredPurchaseDate > DateTime.UtcNow.AddYears(-2))
                        {
                            expectedExpiration = inferredPurchaseDate.AddDays(365);
                            Console.WriteLine($"[PricingController] No purchase found, but inferred purchase date from expiration: {inferredPurchaseDate}, recalculating expiration to {expectedExpiration}");
                        }
                        else
                        {
                            // Expiration seems wrong, but we can't fix it without purchase date
                            Console.WriteLine($"[PricingController] WARNING: No purchase found and expiration {tokens.ExpiresAt} seems incorrect (inferred purchase: {inferredPurchaseDate}), but cannot fix without purchase date");
                        }
                    }
                    else
                    {
                        // No expiration and no purchase - this shouldn't happen for unlimited, but log it
                        Console.WriteLine($"[PricingController] WARNING: No purchase found and no expiration set for unlimited tokens - cannot determine correct expiration");
                    }
                }
                
                // ALWAYS fix if expiration is wrong
                if (expectedExpiration.HasValue)
                {
                    if (!tokens.ExpiresAt.HasValue || tokens.ExpiresAt.Value != expectedExpiration.Value)
                    {
                        Console.WriteLine($"[PricingController] ULTRA AGGRESSIVE FIX: Token expiration {(tokens.ExpiresAt.HasValue ? tokens.ExpiresAt.Value.ToString() : "NULL")} is wrong, FORCING update to {expectedExpiration.Value}");
                        tokens.ExpiresAt = expectedExpiration.Value;
                        await _dynamoService.SaveUserTokensAsync(tokens);
                        Console.WriteLine($"[PricingController] Successfully updated token expiration to {tokens.ExpiresAt}");
                    }
                    else
                    {
                        Console.WriteLine($"[PricingController] Token expiration is already correct: {tokens.ExpiresAt}");
                    }
                }
                // REMOVED: Last resort fix that used UtcNow - this was causing expiration to be set from current date
                // Instead, we rely on the purchase-based calculation above
            }
            // Determine unlimited access
            var hasUnlimitedAccess = false;
            DateTime? unlimitedExpiresAt = null;
            
            if (hasUnlimitedFromTokens)
            {
                // Only grant unlimited if tokens are actually 999999+
                hasUnlimitedAccess = true;
                unlimitedExpiresAt = unlimitedPurchase?.ExpiresAt ?? tokens?.ExpiresAt;
            }
            // If tokens are < 999999, hasUnlimitedAccess stays false
            
            var hasTokenAccess = tokens != null && tokensRemaining > 0 && tokensRemaining < 999999;

            Console.WriteLine($"[PricingController] Final status - HasUnlimited: {hasUnlimitedAccess}, TokensRemaining: {tokensRemaining}, HasTokenAccess: {hasTokenAccess}");

            return Ok(new
            {
                hasFreeAccess,
                freeWorkoutsRemaining,
                hasUnlimitedAccess,
                unlimitedExpiresAt = unlimitedExpiresAt?.ToString("O"),
                hasTokenAccess,
                tokensRemaining = tokensRemaining, // Always return actual token count, not 999999 override
                canGenerateWorkout = hasFreeAccess || hasUnlimitedAccess || hasTokenAccess
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
