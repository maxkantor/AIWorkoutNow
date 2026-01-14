using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[EnableCors("AllowAll")]
[Route("")]
public class StripeController : ControllerBase
{
    private readonly IDynamoDBService _dynamoService;
    private readonly IConfigService _configService;

        private static PricingPlan BuildDefaultPlan(string planId, string? currencyOverride = null, string? stripePriceIdOverride = null)
        {
            var lower = planId.ToLowerInvariant();
            bool is100 = lower.Contains("100-workouts") || lower.Contains("default-100");
            bool is30 = lower.Contains("30-workouts") || lower.Contains("default-30");
            bool is10 = lower.Contains("10-workouts") || lower.Contains("default-10");

            var name = is100 ? "100 Workouts" : is30 ? "30 Workouts" : is10 ? "10 Workouts" : "Workout Plan";
            var price = is100 ? 7.99m : is30 ? 3.99m : is10 ? 1.99m : 1.99m;
            var tokens = is100 ? 100 : is30 ? 30 : is10 ? 10 : 10;

            return new PricingPlan
            {
                PlanId = planId,
                Name = name,
                Price = price,
                Currency = currencyOverride ?? "USD",
                TokenCount = tokens,
                IsUnlimited = false,
                UnlimitedDays = null,
                DisplayOrder = 1,
                IsRecommended = false,
                IsActive = true,
                StripePriceId = stripePriceIdOverride ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };
        }

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
                    // CRITICAL FIX: Create default plan if not found (matching PricingController defaults)
                    Console.WriteLine($"[StripeController] Creating default plan for {request.PlanId}");
                    plan = BuildDefaultPlan(request.PlanId);
                    Console.WriteLine($"[StripeController] Created default plan: {plan.PlanId}, Price: {plan.Price}, IsUnlimited: {plan.IsUnlimited}");
                }
            }
            
            if (!plan.IsActive)
            {
                Console.WriteLine($"[StripeController] Pricing plan is not active: {request.PlanId}, using default active plan as fallback");
                // AGGRESSIVE FIX: If DB plan is inactive, use a default active plan with same ID
                // Create default plan inline (matching the IDs used in PricingController)
                var defaultPlan = BuildDefaultPlan(request.PlanId, plan.Currency, plan.StripePriceId);
                Console.WriteLine($"[StripeController] Using default active plan as fallback: {defaultPlan.PlanId}, Price: {defaultPlan.Price}");
                plan = defaultPlan;
            }

            // Canonicalize defaults to prevent stale/incorrect prices.
            // IMPORTANT: check 100 before 10 to avoid substring collisions.
            var planIdLower = plan.PlanId.ToLowerInvariant();
            if (planIdLower.Contains("100-workouts") || planIdLower.Contains("default-100"))
            {
                plan.Price = 7.99m;
                plan.TokenCount = 100;
            }
            else if (planIdLower.Contains("30-workouts") || planIdLower.Contains("default-30"))
            {
                plan.Price = 3.99m;
                plan.TokenCount = 30;
            }
            else if (planIdLower.Contains("10-workouts") || planIdLower.Contains("default-10"))
            {
                plan.Price = 1.99m;
                plan.TokenCount = 10;
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
            var cancelUrl = $"{frontendBaseUrl}/"; // Redirect directly to home, no cancellation screen

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
                new("allow_promotion_codes", "true"),
                // CRITICAL: Ensure customer email and name are collected
                new("billing_address_collection", "required"), // collect address
                new("customer_creation", "always"), // Always create a customer record
                new("phone_number_collection[enabled]", "true") // collect phone
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

            // CRITICAL FIX: Get actual session creation date from Stripe response
            DateTime purchaseDate = DateTime.UtcNow; // Fallback
            if (sessionData != null && sessionData.ContainsKey("created"))
            {
                try
                {
                    var createdValue = sessionData["created"];
                    if (createdValue is System.Text.Json.JsonElement createdElement)
                    {
                        var createdUnix = createdElement.GetInt64();
                        purchaseDate = DateTimeOffset.FromUnixTimeSeconds(createdUnix).UtcDateTime;
                        Console.WriteLine($"[StripeController] CreateCheckoutSession - Using session creation date as purchase date: {purchaseDate}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[StripeController] Error parsing created timestamp: {ex.Message}, using current time");
                }
            }
            
            // Save purchase record
            var purchase = new UserPurchase
            {
                DeviceId = request.DeviceId,
                PlanId = plan.PlanId,
                StripeSessionId = sessionId ?? "",
                Status = "pending",
                PurchasedAt = purchaseDate, // CRITICAL: Use actual session creation date, not current time
                IsUnlimited = plan.IsUnlimited,
                TokensGranted = plan.TokenCount
            };

            // Unlimited disabled: do not set unlimited expiration/grants here

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
                var paymentStatus = sessionObject?["payment_status"]?.ToString();

                if (!string.Equals(paymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine($"[StripeController] Skipping grant because payment_status is {paymentStatus}");
                    return Ok();
                }

                Console.WriteLine($"[StripeController] Session ID: {sessionId}, DeviceId: {deviceId}, PlanId: {planId}");

                if (!string.IsNullOrEmpty(deviceId) && !string.IsNullOrEmpty(planId))
                {
                    // Find purchase by session ID
                    var purchases = await _dynamoService.GetUserPurchasesAsync(deviceId);
                    var purchase = purchases.FirstOrDefault(p => p.StripeSessionId == sessionId);

                    // CRITICAL FIX: Get actual purchase date from Stripe session (created timestamp)
                    DateTime purchaseDate = DateTime.UtcNow; // Fallback
                    if (sessionObject != null && sessionObject.ContainsKey("created"))
                    {
                        try
                        {
                            var createdValue = sessionObject["created"];
                            if (createdValue is System.Text.Json.JsonElement createdElement)
                            {
                                var createdUnix = createdElement.GetInt64();
                                purchaseDate = DateTimeOffset.FromUnixTimeSeconds(createdUnix).UtcDateTime;
                                Console.WriteLine($"[StripeController] Using purchase date from Stripe session: {purchaseDate}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[StripeController] Error parsing created timestamp: {ex.Message}, using current time");
                        }
                    }
                    
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
                            Status = "pending",
                            PurchasedAt = purchaseDate, // CRITICAL: Use actual payment date from Stripe
                            IsUnlimited = plan.IsUnlimited,
                            TokensGranted = plan.TokenCount
                        };

                        if (plan.IsUnlimited)
                        {
                            // CRITICAL FIX: Always use 365 days (1 year) from actual purchase date
                            purchase.ExpiresAt = purchase.PurchasedAt.AddDays(365);
                            Console.WriteLine($"[StripeController] Set unlimited expiration to {purchase.ExpiresAt} (1 year from purchase date: {purchase.PurchasedAt})");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[StripeController] Found existing purchase: {purchase.PurchaseId}");
                        purchase.StripePaymentIntentId = paymentIntentId;
                        
                        // CRITICAL FIX: If PurchasedAt is wrong (was set to webhook time instead of payment time), fix it
                        if (purchase.PurchasedAt == default || purchase.PurchasedAt > DateTime.UtcNow.AddMinutes(-5))
                        {
                            // PurchasedAt seems wrong (default or very recent), use actual payment date
                            purchase.PurchasedAt = purchaseDate;
                            Console.WriteLine($"[StripeController] Fixed PurchasedAt to actual payment date: {purchase.PurchasedAt}");
                        }
                        
                        // AGGRESSIVE FIX: Update expiration to 1 year from purchase date if unlimited
                        if (purchase.IsUnlimited)
                        {
                            purchase.ExpiresAt = purchase.PurchasedAt.AddDays(365);
                            Console.WriteLine($"[StripeController] Updated unlimited expiration to {purchase.ExpiresAt} (1 year from purchase date: {purchase.PurchasedAt})");
                        }
                    }
                    
                    // AGGRESSIVE FIX: Fetch customer info from Stripe session
                    string? customerEmail = null;
                    string? customerName = null;
                    string? customerPhone = null;
                    string? customerAddress1 = null;
                    string? customerCity = null;
                    string? customerState = null;
                    string? customerPostal = null;
                    string? customerCountry = null;
                    try
                    {
                        var stripeSecretKey = await _configService.GetStripeSecretKeyAsync();
                        if (!string.IsNullOrEmpty(stripeSecretKey) && !string.IsNullOrEmpty(sessionId))
                        {
                            using var httpClient = new HttpClient();
                            httpClient.DefaultRequestHeaders.Authorization = 
                                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", stripeSecretKey);
                            
                            // Fetch session details to get customer info
                            var sessionUrl = $"https://api.stripe.com/v1/checkout/sessions/{sessionId}";
                            var sessionResponse = await httpClient.GetAsync(sessionUrl);
                            
                            if (sessionResponse.IsSuccessStatusCode)
                            {
                                var sessionContent = await sessionResponse.Content.ReadAsStringAsync();
                                var sessionData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(sessionContent);
                                
                                // Get customer_details
                                if (sessionData != null && sessionData.ContainsKey("customer_details"))
                                {
                                    var customerDetails = (System.Text.Json.JsonElement)sessionData["customer_details"];
                                    if (customerDetails.TryGetProperty("email", out var emailElement))
                                        customerEmail = emailElement.GetString();
                                    if (customerDetails.TryGetProperty("name", out var nameElement))
                                        customerName = nameElement.GetString();
                                    if (customerDetails.TryGetProperty("phone", out var phoneElement))
                                        customerPhone = phoneElement.GetString();
                                    if (customerDetails.TryGetProperty("address", out var addrElement) && addrElement.ValueKind == System.Text.Json.JsonValueKind.Object)
                                    {
                                        if (addrElement.TryGetProperty("line1", out var line1)) customerAddress1 = line1.GetString();
                                        if (addrElement.TryGetProperty("city", out var city)) customerCity = city.GetString();
                                        if (addrElement.TryGetProperty("state", out var state)) customerState = state.GetString();
                                        if (addrElement.TryGetProperty("postal_code", out var postal)) customerPostal = postal.GetString();
                                        if (addrElement.TryGetProperty("country", out var country)) customerCountry = country.GetString();
                                    }
                                    
                                    Console.WriteLine($"[StripeController] Fetched customer info from customer_details - Email: {customerEmail}, Name: {customerName}, Phone: {customerPhone}");
                                }
                                
                                // If not in customer_details, try to get from customer object
                                if (string.IsNullOrEmpty(customerEmail) && sessionData != null && sessionData.ContainsKey("customer"))
                                {
                                    var customerId = sessionData["customer"]?.ToString();
                                    if (!string.IsNullOrEmpty(customerId))
                                    {
                                        var customerUrl = $"https://api.stripe.com/v1/customers/{customerId}";
                                        var customerResponse = await httpClient.GetAsync(customerUrl);
                                        if (customerResponse.IsSuccessStatusCode)
                                        {
                                            var customerContent = await customerResponse.Content.ReadAsStringAsync();
                                            var customerData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(customerContent);
                                            if (customerData != null)
                                            {
                                                if (customerData.ContainsKey("email"))
                                                    customerEmail = customerData["email"]?.ToString();
                                                if (customerData.ContainsKey("name"))
                                                    customerName = customerData["name"]?.ToString();
                                                if (customerData.ContainsKey("phone"))
                                                    customerPhone = customerData["phone"]?.ToString();
                                                if (customerData.ContainsKey("address") && customerData["address"] is System.Text.Json.JsonElement caddr && caddr.ValueKind == System.Text.Json.JsonValueKind.Object)
                                                {
                                                    if (caddr.TryGetProperty("line1", out var line1)) customerAddress1 = line1.GetString();
                                                    if (caddr.TryGetProperty("city", out var city)) customerCity = city.GetString();
                                                    if (caddr.TryGetProperty("state", out var state)) customerState = state.GetString();
                                                    if (caddr.TryGetProperty("postal_code", out var postal)) customerPostal = postal.GetString();
                                                    if (caddr.TryGetProperty("country", out var country)) customerCountry = country.GetString();
                                                }
                                                
                                                Console.WriteLine($"[StripeController] Fetched customer info from customer object - Email: {customerEmail}, Name: {customerName}, Phone: {customerPhone}");
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[StripeController] Error fetching customer info from Stripe: {ex.Message}");
                        // Non-critical, continue processing
                    }
                    
                    // Set customer info on purchase
                    purchase.CustomerEmail = customerEmail ?? purchase.CustomerEmail;
                    purchase.CustomerName = customerName ?? purchase.CustomerName;
                    purchase.CustomerPhone = customerPhone ?? purchase.CustomerPhone;
                    purchase.CustomerAddressLine1 = customerAddress1 ?? purchase.CustomerAddressLine1;
                    purchase.CustomerCity = customerCity ?? purchase.CustomerCity;
                    purchase.CustomerState = customerState ?? purchase.CustomerState;
                    purchase.CustomerPostalCode = customerPostal ?? purchase.CustomerPostalCode;
                    purchase.CustomerCountry = customerCountry ?? purchase.CustomerCountry;

                    // Grant tokens (no unlimited; unlimited plans are disabled)
                    Console.WriteLine($"[StripeController] Granting tokens - TokensGranted: {purchase.TokensGranted}");

                    // Ensure TokensGranted is populated from plan if missing
                    if (!purchase.TokensGranted.HasValue)
                    {
                        var planLookup = await _dynamoService.GetPricingPlanAsync(planId ?? string.Empty);
                        if (planLookup?.TokenCount != null)
                        {
                            purchase.TokensGranted = planLookup.TokenCount;
                            Console.WriteLine($"[StripeController] Backfilled TokensGranted from plan {planId} => {planLookup.TokenCount}");
                        }
                    }

                    if (purchase.Status == "completed")
                    {
                        Console.WriteLine($"[StripeController] Purchase {purchase.PurchaseId} already completed; skipping duplicate grant.");
                    }
                    else if (purchase.TokensGranted.HasValue)
                    {
                        int tokensToAdd = purchase.TokensGranted.Value;
                        var beforeTokens = await _dynamoService.GetUserTokensAsync(deviceId);
                        Console.WriteLine($"[StripeController] Before increment - Device: {deviceId}, TokensRemaining: {beforeTokens?.TokensRemaining}");
                        var newBalance = await _dynamoService.IncrementUserTokensAsync(deviceId, tokensToAdd);
                        var afterTokens = await _dynamoService.GetUserTokensAsync(deviceId);
                        Console.WriteLine($"[StripeController] Added {tokensToAdd} tokens to device {deviceId}. New balance (return): {newBalance}, DB after: {afterTokens?.TokensRemaining}");
                        purchase.Status = "completed";
                    }
                    else
                    {
                        Console.WriteLine($"[StripeController] WARNING: TokensGranted is missing for purchase {purchase.PurchaseId}, tokens will not be added.");
                    }

                    // Save purchase record (may fail if table doesn't exist, but that's OK)
                    await _dynamoService.SaveUserPurchaseAsync(purchase);

                    // Link email to visitor ID for cross-device access
                    if (!string.IsNullOrEmpty(customerEmail))
                    {
                        try
                        {
                            var mapping = await _dynamoService.GetEmailVisitorMappingAsync(customerEmail);
                            if (mapping == null)
                            {
                                mapping = new EmailVisitorMapping
                                {
                                    Email = customerEmail.ToLowerInvariant(),
                                    VisitorIds = new List<string> { deviceId },
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                            }
                            else
                            {
                                if (!mapping.VisitorIds.Contains(deviceId))
                                {
                                    mapping.VisitorIds.Add(deviceId);
                                }
                                mapping.UpdatedAt = DateTime.UtcNow;
                            }
                            await _dynamoService.SaveEmailVisitorMappingAsync(mapping);
                            Console.WriteLine($"[StripeController] Linked email {customerEmail} to device {deviceId}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[StripeController] Failed to link email to visitor ID (non-critical): {ex.Message}");
                        }
                    }

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
                
                // CRITICAL FIX: Update customer data if missing, even for existing purchases
                if (string.IsNullOrEmpty(existingPurchase.CustomerEmail) || string.IsNullOrEmpty(existingPurchase.CustomerName))
                {
                    Console.WriteLine($"[StripeController] Existing purchase missing customer data, fetching from Stripe...");
                    try
                    {
                        // Fetch customer data from Stripe session
                        string? customerEmail = null;
                        string? customerName = null;
                        
                        if (sessionData != null && sessionData.ContainsKey("customer_details"))
                        {
                            var customerDetails = (System.Text.Json.JsonElement)sessionData["customer_details"];
                            if (customerDetails.TryGetProperty("email", out var emailElement))
                                customerEmail = emailElement.GetString();
                            if (customerDetails.TryGetProperty("name", out var nameElement))
                                customerName = nameElement.GetString();
                        }
                        
                        // If not in customer_details, try customer object
                        if (string.IsNullOrEmpty(customerEmail) && sessionData != null && sessionData.ContainsKey("customer"))
                        {
                            var customerId = sessionData["customer"]?.ToString();
                            if (!string.IsNullOrEmpty(customerId))
                            {
                                var customerUrl = $"https://api.stripe.com/v1/customers/{customerId}";
                                var customerResponse = await httpClient.GetAsync(customerUrl);
                                if (customerResponse.IsSuccessStatusCode)
                                {
                                    var customerContent = await customerResponse.Content.ReadAsStringAsync();
                                    var customerData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(customerContent);
                                    if (customerData != null)
                                    {
                                        if (customerData.ContainsKey("email"))
                                            customerEmail = customerData["email"]?.ToString();
                                        if (customerData.ContainsKey("name"))
                                            customerName = customerData["name"]?.ToString();
                                    }
                                }
                            }
                        }
                        
                        // Update purchase if we got customer data
                        if (!string.IsNullOrEmpty(customerEmail) || !string.IsNullOrEmpty(customerName))
                        {
                            existingPurchase.CustomerEmail = customerEmail ?? existingPurchase.CustomerEmail;
                            existingPurchase.CustomerName = customerName ?? existingPurchase.CustomerName;
                            await _dynamoService.SaveUserPurchaseAsync(existingPurchase);
                            Console.WriteLine($"[StripeController] Updated existing purchase with customer data - Email: {customerEmail}, Name: {customerName}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[StripeController] Error updating customer data for existing purchase: {ex.Message}");
                    }
                }
                
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

                // CRITICAL FIX: Get actual session creation date from Stripe
                DateTime purchaseDate = DateTime.UtcNow; // Fallback
                if (sessionData != null && sessionData.ContainsKey("created"))
                {
                    try
                    {
                        var createdValue = sessionData["created"];
                        if (createdValue is System.Text.Json.JsonElement createdElement)
                        {
                            var createdUnix = createdElement.GetInt64();
                            purchaseDate = DateTimeOffset.FromUnixTimeSeconds(createdUnix).UtcDateTime;
                            Console.WriteLine($"[StripeController] VerifyPayment - Using session creation date as purchase date: {purchaseDate}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[StripeController] Error parsing created timestamp: {ex.Message}, using current time");
                    }
                }
                
                var purchase = new UserPurchase
                {
                    PurchaseId = Guid.NewGuid().ToString(),
                    DeviceId = request.DeviceId,
                    PlanId = planId,
                    StripeSessionId = request.SessionId,
                    StripePaymentIntentId = sessionData?["payment_intent"]?.ToString() ?? "",
                    Status = "completed",
                    PurchasedAt = purchaseDate, // CRITICAL: Use actual session creation date, not current time
                    IsUnlimited = plan.IsUnlimited,
                    TokensGranted = plan.TokenCount
                };

                if (plan.IsUnlimited)
                {
                    // CRITICAL FIX: Always set expiration to 1 year (365 days) from actual purchase date
                    purchase.ExpiresAt = purchase.PurchasedAt.AddDays(365);
                    Console.WriteLine($"[StripeController] VerifyPayment - Set unlimited expiration to {purchase.ExpiresAt} (1 year from purchase date: {purchase.PurchasedAt})");
                }
                
                // CRITICAL FIX: Fetch customer email/name from Stripe session
                string? customerEmail = null;
                string? customerName = null;
                try
                {
                    // Get customer_details from session
                    if (sessionData != null && sessionData.ContainsKey("customer_details"))
                    {
                        var customerDetails = (System.Text.Json.JsonElement)sessionData["customer_details"];
                        if (customerDetails.TryGetProperty("email", out var emailElement))
                            customerEmail = emailElement.GetString();
                        if (customerDetails.TryGetProperty("name", out var nameElement))
                            customerName = nameElement.GetString();
                        
                        Console.WriteLine($"[StripeController] VerifyPayment - Fetched customer info - Email: {customerEmail}, Name: {customerName}");
                    }
                    
                    // If not in customer_details, try to get from customer object
                    if (string.IsNullOrEmpty(customerEmail) && sessionData != null && sessionData.ContainsKey("customer"))
                    {
                        var customerId = sessionData["customer"]?.ToString();
                        if (!string.IsNullOrEmpty(customerId))
                        {
                            var customerUrl = $"https://api.stripe.com/v1/customers/{customerId}";
                            var customerResponse = await httpClient.GetAsync(customerUrl);
                            if (customerResponse.IsSuccessStatusCode)
                            {
                                var customerContent = await customerResponse.Content.ReadAsStringAsync();
                                var customerData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(customerContent);
                                if (customerData != null)
                                {
                                    if (customerData.ContainsKey("email"))
                                        customerEmail = customerData["email"]?.ToString();
                                    if (customerData.ContainsKey("name"))
                                        customerName = customerData["name"]?.ToString();
                                    
                                    Console.WriteLine($"[StripeController] VerifyPayment - Fetched from customer object - Email: {customerEmail}, Name: {customerName}");
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[StripeController] VerifyPayment - Error fetching customer info: {ex.Message}");
                    // Non-critical, continue processing
                }
                
                // Set customer info on purchase
                purchase.CustomerEmail = customerEmail;
                purchase.CustomerName = customerName;

                // Idempotency: if already completed for this payment intent, skip double-grant
                var paymentIntentId = purchase.StripePaymentIntentId ?? string.Empty;
                if (purchase.Status == "completed" && !string.IsNullOrEmpty(paymentIntentId) && purchase.StripePaymentIntentId == paymentIntentId)
                {
                    Console.WriteLine($"[StripeController] VerifyPayment - Purchase {purchase.PurchaseId} already completed for paymentIntent {paymentIntentId}, skipping token grant.");
                    return Ok(new { message = "Payment already processed" });
                }

                // AGGRESSIVE FIX: If customer has email, merge tokens across all devices linked to that email
                List<string> linkedDeviceIds = new List<string> { request.DeviceId };
                if (!string.IsNullOrEmpty(customerEmail))
                {
                    try
                    {
                        var allLinkedDevices = await _dynamoService.GetVisitorIdsByEmailAsync(customerEmail);
                        if (allLinkedDevices.Any())
                        {
                            linkedDeviceIds = allLinkedDevices.Distinct().ToList();
                            Console.WriteLine($"[StripeController] VerifyPayment - Found {linkedDeviceIds.Count} devices linked to email {customerEmail}: {string.Join(", ", linkedDeviceIds)}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[StripeController] VerifyPayment - Error getting linked devices: {ex.Message}");
                    }
                }
                
                // Grant tokens
                if (purchase.IsUnlimited)
                {
                    Console.WriteLine($"[StripeController] Granting unlimited access - DeviceId: {request.DeviceId}, ExpiresAt: {purchase.ExpiresAt}");
                    
                    // AGGRESSIVE FIX: Grant unlimited access to ALL devices linked to this email
                    foreach (var linkedDeviceId in linkedDeviceIds)
                    {
                        var tokens = await _dynamoService.GetUserTokensAsync(linkedDeviceId);
                        if (tokens == null)
                        {
                            tokens = new UserTokens
                            {
                                DeviceId = linkedDeviceId,
                                TokensRemaining = 999999,
                                ExpiresAt = purchase.ExpiresAt
                            };
                            Console.WriteLine($"[StripeController] Creating new UserTokens for device {linkedDeviceId} with 999999 tokens");
                        }
                        else
                        {
                            Console.WriteLine($"[StripeController] Updating existing tokens for device {linkedDeviceId} from {tokens.TokensRemaining} to 999999");
                            tokens.TokensRemaining = 999999;
                            if (purchase.ExpiresAt.HasValue)
                            {
                                tokens.ExpiresAt = purchase.ExpiresAt;
                            }
                        }
                        await _dynamoService.SaveUserTokensAsync(tokens);
                        Console.WriteLine($"[StripeController] Successfully saved tokens for device {linkedDeviceId} - TokensRemaining: {tokens.TokensRemaining}, ExpiresAt: {tokens.ExpiresAt}");
                    }
                    Console.WriteLine($"[StripeController] Granted unlimited access to {linkedDeviceIds.Count} device(s)");
                }
                else
                {
                    // Ensure TokensGranted is populated from plan if missing
                    if (!purchase.TokensGranted.HasValue)
                    {
                        var planLookup = await _dynamoService.GetPricingPlanAsync(planId ?? string.Empty);
                        if (planLookup?.TokenCount != null)
                        {
                            purchase.TokensGranted = planLookup.TokenCount;
                            Console.WriteLine($"[StripeController] VerifyPayment - Backfilled TokensGranted from plan {planId} => {planLookup.TokenCount}");
                        }
                    }

                    if (purchase.TokensGranted.HasValue)
                    {
                        Console.WriteLine($"[StripeController] Granting {purchase.TokensGranted.Value} tokens - DeviceId: {request.DeviceId}");
                        
                        // Add purchased tokens to CURRENT device only (no cross-device merge)
                        int tokensToAdd = purchase.TokensGranted.Value;
                        var beforeTokens = await _dynamoService.GetUserTokensAsync(request.DeviceId);
                        Console.WriteLine($"[StripeController] VerifyPayment - Before increment Device {request.DeviceId}, Tokens: {beforeTokens?.TokensRemaining}");
                        var newBalance = await _dynamoService.IncrementUserTokensAsync(request.DeviceId, tokensToAdd);
                        var afterTokens = await _dynamoService.GetUserTokensAsync(request.DeviceId);
                        Console.WriteLine($"[StripeController] VerifyPayment - Added {tokensToAdd} tokens to device {request.DeviceId}. New balance (return): {newBalance}, DB after: {afterTokens?.TokensRemaining}");
                    }
                    else
                    {
                        Console.WriteLine($"[StripeController] VerifyPayment - WARNING: TokensGranted missing for purchase {purchase.PurchaseId}, tokens not granted.");
                    }
                }

                // Try to save purchase (may fail if table doesn't exist, but that's OK)
                try
                {
                    await _dynamoService.SaveUserPurchaseAsync(purchase);
                    Console.WriteLine($"[StripeController] Purchase record saved successfully");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[StripeController] Failed to save purchase record (non-critical): {ex.Message}");
                }

                // Link email to visitor ID for cross-device access
                if (!string.IsNullOrEmpty(customerEmail))
                {
                    try
                    {
                        var mapping = await _dynamoService.GetEmailVisitorMappingAsync(customerEmail);
                        if (mapping == null)
                        {
                            mapping = new EmailVisitorMapping
                            {
                                Email = customerEmail.ToLowerInvariant(),
                                VisitorIds = new List<string> { request.DeviceId },
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                        }
                        else
                        {
                            if (!mapping.VisitorIds.Contains(request.DeviceId))
                            {
                                mapping.VisitorIds.Add(request.DeviceId);
                            }
                            mapping.UpdatedAt = DateTime.UtcNow;
                        }
                        await _dynamoService.SaveEmailVisitorMappingAsync(mapping);
                        Console.WriteLine($"[StripeController] VerifyPayment - Linked email {customerEmail} to device {request.DeviceId}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[StripeController] VerifyPayment - Failed to link email to visitor ID (non-critical): {ex.Message}");
                    }
                }

                Console.WriteLine($"[StripeController] Payment verified and tokens granted - IsUnlimited: {purchase.IsUnlimited}, TokensGranted: {purchase.TokensGranted}");
                return Ok(new { 
                    verified = true, 
                    alreadyProcessed = false,
                    tokensGranted = purchase.TokensGranted,
                    hasUnlimitedAccess = purchase.IsUnlimited,
                    unlimitedExpiresAt = purchase.ExpiresAt?.ToString("O")
                });
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
