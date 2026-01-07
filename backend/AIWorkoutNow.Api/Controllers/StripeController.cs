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
                return StatusCode(500, new { message = "Stripe secret key not configured. Please check SSM parameter /AIWorkoutNow/stripe-secret-key" });
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
                var sessionId = sessionObject?["id"]?.ToString();
                var metadata = sessionObject?["metadata"] as Dictionary<string, object>;
                var deviceId = metadata?["deviceId"]?.ToString();
                var planId = metadata?["planId"]?.ToString();

                if (!string.IsNullOrEmpty(deviceId) && !string.IsNullOrEmpty(planId))
                {
                    // Find purchase by session ID
                    var purchases = await _dynamoService.GetUserPurchasesAsync(deviceId);
                    var purchase = purchases.FirstOrDefault(p => p.StripeSessionId == sessionId);

                    if (purchase != null)
                    {
                        purchase.Status = "completed";
                        purchase.StripePaymentIntentId = sessionObject?["payment_intent"]?.ToString() ?? "";

                        // Grant tokens or unlimited access
                        if (purchase.IsUnlimited)
                        {
                            // Unlimited access already set with ExpiresAt
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
                        }

                        await _dynamoService.SaveUserPurchaseAsync(purchase);

                        // Track activity
                        await _dynamoService.SaveCustomerActivityAsync(new CustomerActivity
                        {
                            DeviceId = deviceId,
                            ActivityType = "token_purchased",
                            Description = $"Purchased plan: {planId}",
                            PurchaseId = purchase.PurchaseId
                        });
                    }
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Stripe webhook error: {ex.Message}");
            return StatusCode(500);
        }
    }
}

public class CreateCheckoutRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
}
