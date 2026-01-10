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

            // CRITICAL FIX: Get ALL purchases for this email (not just linked devices)
            // This ensures we restore credits even if purchases are on different devices
            var purchasesByEmail = await _dynamoService.GetPurchasesByEmailAsync(request.Email);
            Console.WriteLine($"[EmailVerificationController] Found {purchasesByEmail.Count} completed purchases for {request.Email}");

            // Merge credits from all linked visitor IDs (existing devices)
            var allVisitorIds = mapping.VisitorIds.Where(id => id != request.DeviceId).ToList();
            if (allVisitorIds.Any())
            {
                Console.WriteLine($"[EmailVerificationController] Merging credits from {allVisitorIds.Count} linked devices for {request.Email}");
                await _dynamoService.MergeCreditsFromVisitorIdsAsync(request.DeviceId, allVisitorIds);
            }

            // CRITICAL FIX: Grant tokens from ALL purchases for this email
            // If multiple purchases exist, use the latest expiration date, but sum all tokens
            // If any purchase is unlimited, grant unlimited with latest expiration
            if (purchasesByEmail.Any())
            {
                Console.WriteLine($"[EmailVerificationController] Processing {purchasesByEmail.Count} purchases for {request.Email}");

                int totalTokensToGrant = 0;
                DateTime? latestExpiration = null;
                bool purchaseIsUnlimited = false;
                var purchasesToCopy = new List<UserPurchase>();

                // Process all purchases for this email
                foreach (var purchase in purchasesByEmail)
                {
                    var plan = await _dynamoService.GetPricingPlanAsync(purchase.PlanId);
                    if (plan == null)
                    {
                        Console.WriteLine($"[EmailVerificationController] Plan {purchase.PlanId} not found, skipping purchase {purchase.PurchaseId}");
                        continue;
                    }

                    // Check if unlimited
                    if (purchase.IsUnlimited || plan.IsUnlimited)
                    {
                        purchaseIsUnlimited = true;
                        var purchaseExpiration = purchase.ExpiresAt ?? DateTime.UtcNow.AddDays(plan.UnlimitedDays ?? 365);
                        if (!latestExpiration.HasValue || purchaseExpiration > latestExpiration.Value)
                        {
                            latestExpiration = purchaseExpiration;
                        }
                        Console.WriteLine($"[EmailVerificationController] Found unlimited purchase {purchase.PurchaseId} (expires: {purchaseExpiration})");
                    }
                    else
                    {
                        // Add tokens from this purchase
                        int tokensFromPurchase = 0;
                        if (purchase.TokensGranted.HasValue)
                        {
                            tokensFromPurchase = purchase.TokensGranted.Value;
                        }
                        else if (plan.TokenCount.HasValue)
                        {
                            tokensFromPurchase = plan.TokenCount.Value;
                        }
                        totalTokensToGrant += tokensFromPurchase;
                        Console.WriteLine($"[EmailVerificationController] Adding {tokensFromPurchase} tokens from purchase {purchase.PurchaseId} (Plan: {plan.Name})");
                    }

                    purchasesToCopy.Add(purchase);
                }

                // Determine final tokens to grant
                int finalTokensToGrant = purchaseIsUnlimited ? 999999 : totalTokensToGrant;
                Console.WriteLine($"[EmailVerificationController] Total tokens to grant: {finalTokensToGrant} (Unlimited: {purchaseIsUnlimited}, Regular: {totalTokensToGrant})");

                if (finalTokensToGrant > 0)
                {
                    // Get current tokens for this device
                    var currentTokens = await _dynamoService.GetUserTokensAsync(request.DeviceId);
                    if (currentTokens != null)
                    {
                        // Update tokens - if unlimited or if current is less, update
                        if (finalTokensToGrant >= 999999 || currentTokens.TokensRemaining < finalTokensToGrant)
                        {
                            currentTokens.TokensRemaining = finalTokensToGrant;
                            if (latestExpiration.HasValue || purchaseIsUnlimited)
                            {
                                currentTokens.ExpiresAt = latestExpiration;
                            }
                            await _dynamoService.SaveUserTokensAsync(currentTokens);
                            Console.WriteLine($"[EmailVerificationController] Updated tokens to {finalTokensToGrant} for device {request.DeviceId} (expires: {latestExpiration})");
                        }
                        else
                        {
                            Console.WriteLine($"[EmailVerificationController] Current tokens ({currentTokens.TokensRemaining}) >= tokens to grant ({finalTokensToGrant}), keeping current");
                        }
                    }
                    else
                    {
                        // Create new tokens
                        var newTokens = new UserTokens
                        {
                            DeviceId = request.DeviceId,
                            TokensRemaining = finalTokensToGrant,
                            ExpiresAt = latestExpiration
                        };
                        await _dynamoService.SaveUserTokensAsync(newTokens);
                        Console.WriteLine($"[EmailVerificationController] Created new tokens: {finalTokensToGrant} for device {request.DeviceId} (expires: {latestExpiration})");
                    }

                    // Copy all purchases to this device if they don't already exist
                    var existingPurchases = await _dynamoService.GetUserPurchasesAsync(request.DeviceId);
                    foreach (var purchase in purchasesToCopy)
                    {
                        if (!existingPurchases.Any(p => p.PurchaseId == purchase.PurchaseId))
                        {
                            var purchaseCopy = new UserPurchase
                            {
                                PurchaseId = purchase.PurchaseId,
                                DeviceId = request.DeviceId,
                                PlanId = purchase.PlanId,
                                Status = purchase.Status,
                                PurchasedAt = purchase.PurchasedAt,
                                ExpiresAt = purchase.ExpiresAt,
                                IsUnlimited = purchase.IsUnlimited,
                                TokensGranted = purchase.TokensGranted,
                                CustomerEmail = purchase.CustomerEmail,
                                CustomerName = purchase.CustomerName,
                                StripeSessionId = purchase.StripeSessionId,
                                StripePaymentIntentId = purchase.StripePaymentIntentId
                            };
                            await _dynamoService.SaveUserPurchaseAsync(purchaseCopy);
                            Console.WriteLine($"[EmailVerificationController] Copied purchase {purchase.PurchaseId} to device {request.DeviceId}");
                        }
                    }
                }
            }

            // Get updated token status
            var tokens = await _dynamoService.GetUserTokensAsync(request.DeviceId);
            var tokensRemaining = tokens?.TokensRemaining ?? 0;
            var userHasUnlimited = tokensRemaining >= 999999;
            
            // Get updated free workout count (should be 0 after reset, so 3 remaining)
            var freeWorkoutsUsed = await _dynamoService.GetTotalFreeWorkoutsAsync(request.DeviceId);
            var freeWorkoutsRemaining = Math.Max(0, 3 - freeWorkoutsUsed);

            return Ok(new
            {
                message = "Credits restored successfully",
                tokensRemaining = tokensRemaining,
                hasUnlimited = userHasUnlimited,
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
