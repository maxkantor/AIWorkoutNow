using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[Route("")]
public class WorkoutController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly IDynamoDBService _dynamoService;
    private readonly ITokenService _tokenService;
    private readonly IConfigService _configService;
    private readonly IAmazonAffiliateService _affiliateService;

    public WorkoutController(
        IAIService aiService,
        IDynamoDBService dynamoService,
        ITokenService tokenService,
        IConfigService configService,
        IAmazonAffiliateService affiliateService)
    {
        _aiService = aiService;
        _dynamoService = dynamoService;
        _tokenService = tokenService;
        _configService = configService;
        _affiliateService = affiliateService;
    }

    [HttpPost("generate-workout")]
    public async Task<IActionResult> GenerateWorkout([FromBody] GenerateWorkoutRequest request)
    {
        try
        {
            Console.WriteLine($"[WorkoutController] Starting GenerateWorkout - DeviceId: {request.DeviceId}, IsFreeUser: {request.IsFreeUser}");
            
            var deviceId = request.DeviceId;
            var isFreeUser = request.IsFreeUser;

            // Check daily free limit for free users
            if (isFreeUser)
            {
                Console.WriteLine("[WorkoutController] Checking daily free limit...");
                var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
                var usage = await _dynamoService.GetAnonymousUsageAsync(deviceId, today);
                Console.WriteLine($"[WorkoutController] Usage retrieved: {(usage != null ? usage.Count.ToString() : "null")}");
                var dailyLimit = _configService.GetDailyFreeWorkoutLimit();

                if (usage != null && usage.Count >= dailyLimit)
                {
                    return BadRequest(new { message = "Daily free workout limit reached. Purchase a token pack for unlimited workouts!" });
                }
            }
            else
            {
                Console.WriteLine("[WorkoutController] Checking token balance...");
                // Check token balance for paid users
                var tokenBalance = await _tokenService.GetTokenBalanceAsync(deviceId);
                Console.WriteLine($"[WorkoutController] Token balance: {(tokenBalance != null ? tokenBalance.TokensRemaining.ToString() : "null")}");
                if (tokenBalance == null || tokenBalance.TokensRemaining <= 0)
                {
                    return BadRequest(new { message = "Insufficient tokens. Please purchase a token pack." });
                }
            }

            // Generate workout using AI
            Console.WriteLine("[WorkoutController] Generating workout with AI...");
            var workout = await _aiService.GenerateWorkoutAsync(new WorkoutPreferences
            {
                FitnessLevel = request.FitnessLevel,
                WorkoutType = request.WorkoutType,
                Duration = request.Duration,
                Equipment = request.Equipment,
                Injuries = request.Injuries ?? new List<string>(),
                Goals = request.Goals ?? new List<string>()
            });
            Console.WriteLine("[WorkoutController] Workout generated successfully");

            // Process product recommendations from OpenAI (generate affiliate links)
            Console.WriteLine("[WorkoutController] Processing product recommendations...");
            if (workout.ProductRecommendations != null && workout.ProductRecommendations.Count > 0)
            {
                workout.ProductRecommendations = _affiliateService.ProcessProductRecommendations(
                    workout.ProductRecommendations,
                    request.WorkoutType
                );
                Console.WriteLine($"[WorkoutController] Processed {workout.ProductRecommendations.Count} product recommendations");
            }
            else
            {
                Console.WriteLine("[WorkoutController] No product recommendations from AI");
            }

            // Save workout
            Console.WriteLine("[WorkoutController] Saving workout to DynamoDB...");
            await _dynamoService.SaveWorkoutAsync(workout);
            Console.WriteLine("[WorkoutController] Workout saved");

            // Update usage or deduct token
            if (isFreeUser)
            {
                Console.WriteLine("[WorkoutController] Incrementing anonymous usage...");
                var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
                await _dynamoService.IncrementAnonymousUsageAsync(deviceId, today);
                Console.WriteLine("[WorkoutController] Usage incremented");
            }
            else
            {
                Console.WriteLine("[WorkoutController] Deducting token...");
                await _tokenService.DeductTokenAsync(deviceId);
                var updatedBalance = await _tokenService.GetTokenBalanceAsync(deviceId);
                workout.TokensRemaining = updatedBalance?.TokensRemaining ?? 0;
                Console.WriteLine("[WorkoutController] Token deducted");
            }

            Console.WriteLine("[WorkoutController] Returning success response");
            return Ok(workout);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate workout", error = ex.Message });
        }
    }

    [HttpGet("token-balance")]
    public async Task<IActionResult> GetTokenBalance([FromQuery] string deviceId)
    {
        try
        {
            var balance = await _tokenService.GetTokenBalanceAsync(deviceId);
            if (balance == null)
            {
                return Ok(new { tokensRemaining = 0 });
            }
            return Ok(new { tokensRemaining = balance.TokensRemaining });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to get token balance", error = ex.Message });
        }
    }

    [HttpPost("track-affiliate-click")]
    public async Task<IActionResult> TrackAffiliateClick([FromBody] Models.AffiliateClickRequest request)
    {
        try
        {
            await _affiliateService.TrackAffiliateClickAsync(
                request.DeviceId,
                request.ASIN,
                request.WorkoutId,
                request.LinkText
            );
            return Ok(new { message = "Click tracked successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to track click", error = ex.Message });
        }
    }
}

