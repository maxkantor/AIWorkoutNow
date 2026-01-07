using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[Route("")]
public class StripeController : ControllerBase
{
    private readonly IDynamoDBService _dynamoService;
    private readonly IConfigService _configService;

    public StripeController(IDynamoDBService dynamoService, IConfigService configService)
    {
        _dynamoService = dynamoService;
        _configService = configService;
    }

    [HttpPost("create-checkout-session")]
    public async Task<IActionResult> CreateCheckoutSession([FromBody] CreateCheckoutRequest request)
    {
        try
        {
            Console.WriteLine($"[StripeController] CreateCheckoutSession called - DeviceId: {request?.DeviceId}, PlanId: {request?.PlanId}");
            
            if (request == null || string.IsNullOrEmpty(request.DeviceId) || string.IsNullOrEmpty(request.PlanId))
            {
                Console.WriteLine("[StripeController] Invalid request - missing DeviceId or PlanId");
                return BadRequest(new { message = "DeviceId and PlanId are required" });
            }

            Console.WriteLine($"[StripeController] Looking up pricing plan: {request.PlanId}");
            PricingPlan? plan = null;
            try
            {
                plan = await _dynamoService.GetPricingPlanAsync(request.PlanId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StripeController] Error getting pricing plan: {ex.Message}");
                Console.WriteLine($"[StripeController] Stack trace: {ex.StackTrace}");
            }
            
            if (plan == null)
            {
                Console.WriteLine($"[StripeController] Pricing plan not found: {request.PlanId}");
                // Try to get default plans and find the plan
                var allPlans = await _dynamoService.GetAllPricingPlansAsync();
                plan = allPlans.FirstOrDefault(p => p.PlanId == request.PlanId);
                
                if (plan == null)
                {
                    Console.WriteLine($"[StripeController] Plan {request.PlanId} not found in all plans. Available plans: {string.Join(", ", allPlans.Select(p => p.PlanId))}");
                    return BadRequest(new { message = $"Pricing plan '{request.PlanId}' not found" });
                }
            }
            
            if (!plan.IsActive)
            {
                Console.WriteLine($"[StripeController] Pricing plan is not active: {request.PlanId}");
                return BadRequest(new { message = "Pricing plan is not active" });
            }

            Console.WriteLine($"[StripeController] Plan found: {plan.Name}, Price: {plan.Price}, Currency: {plan.Currency}");

            // Get Stripe secret key from SSM
            Console.WriteLine("[StripeController] Retrieving Stripe secret key from SSM...");
            string? stripeSecretKey = null;
            try
            {
                stripeSecretKey = await _configService.GetStripeSecretKeyAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StripeController] Error retrieving Stripe secret key: {ex.Message}");
                Console.WriteLine($"[StripeController] Stack trace: {ex.StackTrace}");
            }
            
            if (string.IsNullOrEmpty(stripeSecretKey))
            {
                Console.WriteLine("[StripeController] Stripe secret key is null or empty");
                var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
                var parameterName = $"/{tablePrefix}/stripe-secret-key";
                return StatusCode(500, new { 
                    message = $"Stripe secret key not configured. Please check SSM parameter {parameterName} and ensure Lambda execution role has ssm:GetParameter permission.",
                    parameterName = parameterName,
                    hint = "The Lambda execution role needs permission to read from SSM Parameter Store"
                });
            }
            
            Console.WriteLine($"[StripeController] Stripe secret key retrieved (length: {stripeSecretKey.Length})");

            // Create Stripe checkout session
            // Note: This is a simplified version. In production, use Stripe.NET SDK
            var stripeApiUrl = "https://api.stripe.com/v1/checkout/sessions";
            
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", stripeSecretKey);

            var frontendBaseUrl = _configService.GetFrontendBaseUrl();
            var successUrl = $"{frontendBaseUrl}/payment-success?session_id={{CHECKOUT_SESSION_ID}}";
            var cancelUrl = $"{frontendBaseUrl}/payment-cancel";

            // Create checkout session with amount directly (no need for pre-created products/prices)
            var amountInCents = (int)(plan.Price * 100); // Convert to cents
            
            var formData = new List<KeyValuePair<string, string>>
            {
                new("mode", "payment"),
                new("success_url", successUrl),
                new("cancel_url", cancelUrl),
                new("payment_method_types[]", "card"),
                new("line_items[0][price_data][currency]", plan.Currency.ToLower()),
                new("line_items[0][price_data][unit_amount]", amountInCents.ToString()),
                new("line_items[0][price_data][product_data][name]", plan.Name),
                new("line_items[0][quantity]", "1"),
                new("metadata[deviceId]", request.DeviceId),
                new("metadata[planId]", plan.PlanId),
                new("allow_promotion_codes", "true")
            };
            
            // Add description if available
            if (!string.IsNullOrEmpty(plan.MicroCopy))
            {
                formData.Add(new("line_items[0][price_data][product_data][description]", plan.MicroCopy));
            }

            var content = new FormUrlEncodedContent(formData);
            Console.WriteLine($"[StripeController] Calling Stripe API: {stripeApiUrl}");
            var response = await httpClient.PostAsync(stripeApiUrl, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            Console.WriteLine($"[StripeController] Stripe API response status: {response.StatusCode}");
            
            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"[StripeController] Stripe API error: {responseContent}");
                return StatusCode(500, new { message = "Failed to create checkout session", error = responseContent });
            }
            
            Console.WriteLine("[StripeController] Stripe checkout session created successfully");

            // Parse response to get session URL
            var sessionData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
            var sessionId = sessionData?["id"]?.ToString();
            var sessionUrl = sessionData?["url"]?.ToString();

            // Save purchase record
            var purchase = new UserPurchase
            {
                DeviceId = request.DeviceId,
                PlanId = plan.PlanId,
                StripeSessionId = sessionId ?? "",
                Status = "pending",
                IsUnlimited = plan.IsUnlimited,
                TokensGranted = plan.TokenCount
            };

            if (plan.IsUnlimited && plan.UnlimitedDays.HasValue)
            {
                purchase.ExpiresAt = DateTime.UtcNow.AddDays(plan.UnlimitedDays.Value);
            }

            await _dynamoService.SaveUserPurchaseAsync(purchase);

            return Ok(new { sessionId, url = sessionUrl });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[StripeController] Exception in CreateCheckoutSession: {ex.Message}");
            Console.WriteLine($"[StripeController] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[StripeController] Inner exception: {ex.InnerException.Message}");
            }
            return StatusCode(500, new { message = "Failed to create checkout session", error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpPost("stripe-webhook")]
    public async Task<IActionResult> StripeWebhook()
    {
        try
        {
            var json = await new StreamReader(Request.Body).ReadToEndAsync();
            var stripeSecret = await _configService.GetStripeWebhookSecretAsync();
            
            // Verify webhook signature (simplified - use Stripe.NET in production)
            // For now, we'll process the event

            var eventData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            var eventType = eventData?["type"]?.ToString();
            var eventObject = eventData?["data"] as Dictionary<string, object>;
            var sessionObject = eventObject?["object"] as Dictionary<string, object>;

            if (eventType == "checkout.session.completed")
            {
                Console.WriteLine("[StripeController] Processing checkout.session.completed event");
                var sessionId = sessionObject?["id"]?.ToString();
                var metadata = sessionObject?["metadata"] as Dictionary<string, object>;
                var deviceId = metadata?["deviceId"]?.ToString();
                var planId = metadata?["planId"]?.ToString();
                var paymentIntentId = sessionObject?["payment_intent"]?.ToString() ?? "";

                Console.WriteLine($"[StripeController] Session ID: {sessionId}, DeviceId: {deviceId}, PlanId: {planId}");

                if (!string.IsNullOrEmpty(deviceId) && !string.IsNullOrEmpty(planId))
                {
                    // Find purchase by session ID
                    var purchases = await _dynamoService.GetUserPurchasesAsync(deviceId);
                    var purchase = purchases.FirstOrDefault(p => p.StripeSessionId == sessionId);

                    // If purchase not found (e.g., table doesn't exist), create it from session data
                    if (purchase == null)
                    {
                        Console.WriteLine($"[StripeController] Purchase not found for session {sessionId}, creating from session data");
                        
                        // Get plan details
                        var plan = await _dynamoService.GetPricingPlanAsync(planId);
                        if (plan == null)
                        {
                            Console.WriteLine($"[StripeController] Plan {planId} not found, cannot process payment");
                            return Ok(); // Return OK to prevent webhook retries
                        }

                        purchase = new UserPurchase
                        {
                            PurchaseId = Guid.NewGuid().ToString(),
                            DeviceId = deviceId,
                            PlanId = planId,
                            StripeSessionId = sessionId ?? "",
                            StripePaymentIntentId = paymentIntentId,
                            Status = "completed",
                            PurchasedAt = DateTime.UtcNow,
                            IsUnlimited = plan.IsUnlimited,
                            TokensGranted = plan.TokenCount
                        };

                        if (plan.IsUnlimited && plan.UnlimitedDays.HasValue)
                        {
                            purchase.ExpiresAt = DateTime.UtcNow.AddDays(plan.UnlimitedDays.Value);
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[StripeController] Found existing purchase: {purchase.PurchaseId}");
                        purchase.Status = "completed";
                        purchase.StripePaymentIntentId = paymentIntentId;
                    }

                    // Grant tokens or unlimited access
                    Console.WriteLine($"[StripeController] Granting access - IsUnlimited: {purchase.IsUnlimited}, TokensGranted: {purchase.TokensGranted}");
                    
                    if (purchase.IsUnlimited)
                    {
                        // For unlimited, we need to track expiration in UserTokens
                        var tokens = await _dynamoService.GetUserTokensAsync(deviceId);
                        if (tokens == null)
                        {
                            tokens = new UserTokens
                            {
                                DeviceId = deviceId,
                                TokensRemaining = 999999, // Large number for unlimited
                                ExpiresAt = purchase.ExpiresAt
                            };
                        }
                        else
                        {
                            tokens.TokensRemaining = 999999;
                            if (purchase.ExpiresAt.HasValue)
                            {
                                tokens.ExpiresAt = purchase.ExpiresAt;
                            }
                        }
                        await _dynamoService.SaveUserTokensAsync(tokens);
                        Console.WriteLine($"[StripeController] Granted unlimited access until {purchase.ExpiresAt}");
                    }
                    else if (purchase.TokensGranted.HasValue)
                    {
                        var tokens = await _dynamoService.GetUserTokensAsync(deviceId);
                        if (tokens == null)
                        {
                            tokens = new UserTokens
                            {
                                DeviceId = deviceId,
                                TokensRemaining = purchase.TokensGranted.Value
                            };
                        }
                        else
                        {
                            tokens.TokensRemaining += purchase.TokensGranted.Value;
                        }
                        await _dynamoService.SaveUserTokensAsync(tokens);
                        Console.WriteLine($"[StripeController] Granted {purchase.TokensGranted.Value} tokens. Total: {tokens.TokensRemaining}");
                    }

                    // Save purchase record (may fail if table doesn't exist, but that's OK)
                    await _dynamoService.SaveUserPurchaseAsync(purchase);

                    // Track activity
                    try
                    {
                        await _dynamoService.SaveCustomerActivityAsync(new CustomerActivity
                        {
                            DeviceId = deviceId,
                            ActivityType = "token_purchased",
                            Description = $"Purchased plan: {planId}",
                            PurchaseId = purchase.PurchaseId
                        });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[StripeController] Failed to save activity (non-critical): {ex.Message}");
                    }

                    Console.WriteLine($"[StripeController] Successfully processed payment for device {deviceId}");
                }
                else
                {
                    Console.WriteLine($"[StripeController] Missing deviceId or planId in metadata");
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[StripeController] Stripe webhook error: {ex.Message}");
            Console.WriteLine($"[StripeController] Stack trace: {ex.StackTrace}");
            return StatusCode(500);
        }
    }

    [HttpPost("verify-payment")]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest request)
    {
        try
        {
            Console.WriteLine($"[StripeController] VerifyPayment called - SessionId: {request?.SessionId}, DeviceId: {request?.DeviceId}");
            
            if (string.IsNullOrEmpty(request?.SessionId) || string.IsNullOrEmpty(request?.DeviceId))
            {
                return BadRequest(new { message = "SessionId and DeviceId are required" });
            }

            // Get Stripe secret key
            var stripeSecretKey = await _configService.GetStripeSecretKeyAsync();
            if (string.IsNullOrEmpty(stripeSecretKey))
            {
                return StatusCode(500, new { message = "Stripe secret key not configured" });
            }

            // Retrieve checkout session from Stripe
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", stripeSecretKey);

            var sessionUrl = $"https://api.stripe.com/v1/checkout/sessions/{request.SessionId}";
            var response = await httpClient.GetAsync(sessionUrl);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"[StripeController] Failed to retrieve session from Stripe: {responseContent}");
                return StatusCode(500, new { message = "Failed to verify payment with Stripe" });
            }

            var sessionData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
            var paymentStatus = sessionData?["payment_status"]?.ToString();
            var metadata = sessionData?["metadata"] as Dictionary<string, object>;
            var deviceIdFromSession = metadata?["deviceId"]?.ToString();
            var planId = metadata?["planId"]?.ToString();

            // Verify device ID matches
            if (deviceIdFromSession != request.DeviceId)
            {
                Console.WriteLine($"[StripeController] Device ID mismatch: {deviceIdFromSession} != {request.DeviceId}");
                return BadRequest(new { message = "Device ID mismatch" });
            }

            // Check if payment is completed
            if (paymentStatus != "paid")
            {
                Console.WriteLine($"[StripeController] Payment not completed. Status: {paymentStatus}");
                return Ok(new { verified = false, message = "Payment not completed" });
            }

            // Check if purchase already processed
            var purchases = await _dynamoService.GetUserPurchasesAsync(request.DeviceId);
            var existingPurchase = purchases.FirstOrDefault(p => p.StripeSessionId == request.SessionId && p.Status == "completed");

            if (existingPurchase != null)
            {
                Console.WriteLine($"[StripeController] Payment already processed");
                return Ok(new { verified = true, alreadyProcessed = true });
            }

            // Process payment (same logic as webhook)
            if (!string.IsNullOrEmpty(planId))
            {
                var plan = await _dynamoService.GetPricingPlanAsync(planId);
                if (plan == null)
                {
                    return StatusCode(500, new { message = "Pricing plan not found" });
                }

                var purchase = new UserPurchase
                {
                    PurchaseId = Guid.NewGuid().ToString(),
                    DeviceId = request.DeviceId,
                    PlanId = planId,
                    StripeSessionId = request.SessionId,
                    StripePaymentIntentId = sessionData?["payment_intent"]?.ToString() ?? "",
                    Status = "completed",
                    PurchasedAt = DateTime.UtcNow,
                    IsUnlimited = plan.IsUnlimited,
                    TokensGranted = plan.TokenCount
                };

                if (plan.IsUnlimited && plan.UnlimitedDays.HasValue)
                {
                    purchase.ExpiresAt = DateTime.UtcNow.AddDays(plan.UnlimitedDays.Value);
                }

                // Grant tokens
                if (purchase.IsUnlimited)
                {
                    var tokens = await _dynamoService.GetUserTokensAsync(request.DeviceId);
                    if (tokens == null)
                    {
                        tokens = new UserTokens
                        {
                            DeviceId = request.DeviceId,
                            TokensRemaining = 999999,
                            ExpiresAt = purchase.ExpiresAt
                        };
                    }
                    else
                    {
                        tokens.TokensRemaining = 999999;
                        if (purchase.ExpiresAt.HasValue)
                        {
                            tokens.ExpiresAt = purchase.ExpiresAt;
                        }
                    }
                    await _dynamoService.SaveUserTokensAsync(tokens);
                }
                else if (purchase.TokensGranted.HasValue)
                {
                    var tokens = await _dynamoService.GetUserTokensAsync(request.DeviceId);
                    if (tokens == null)
                    {
                        tokens = new UserTokens
                        {
                            DeviceId = request.DeviceId,
                            TokensRemaining = purchase.TokensGranted.Value
                        };
                    }
                    else
                    {
                        tokens.TokensRemaining += purchase.TokensGranted.Value;
                    }
                    await _dynamoService.SaveUserTokensAsync(tokens);
                }

                await _dynamoService.SaveUserPurchaseAsync(purchase);

                Console.WriteLine($"[StripeController] Payment verified and tokens granted");
                return Ok(new { verified = true, tokensGranted = purchase.TokensGranted });
            }

            return Ok(new { verified = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[StripeController] VerifyPayment error: {ex.Message}");
            Console.WriteLine($"[StripeController] Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Failed to verify payment", error = ex.Message });
        }
    }
}

public class CreateCheckoutRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
}

public class VerifyPaymentRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
}
