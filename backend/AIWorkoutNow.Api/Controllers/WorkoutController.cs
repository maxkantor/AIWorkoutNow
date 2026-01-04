using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class WorkoutController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly IDynamoDBService _dynamoService;
    private readonly ITokenService _tokenService;
    private readonly IConfigService _configService;

    public WorkoutController(
        IAIService aiService,
        IDynamoDBService dynamoService,
        ITokenService tokenService,
        IConfigService configService)
    {
        _aiService = aiService;
        _dynamoService = dynamoService;
        _tokenService = tokenService;
        _configService = configService;
    }

    [HttpPost("generate-workout")]
    public async Task<IActionResult> GenerateWorkout([FromBody] GenerateWorkoutRequest request)
    {
        try
        {
            var deviceId = request.DeviceId;
            var isFreeUser = request.IsFreeUser;

            // Check daily free limit for free users
            if (isFreeUser)
            {
                var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
                var usage = await _dynamoService.GetAnonymousUsageAsync(deviceId, today);
                var dailyLimit = _configService.GetDailyFreeWorkoutLimit();

                if (usage != null && usage.Count >= dailyLimit)
                {
                    return BadRequest(new { message = "Daily free workout limit reached. Purchase a token pack for unlimited workouts!" });
                }
            }
            else
            {
                // Check token balance for paid users
                var tokenBalance = await _tokenService.GetTokenBalanceAsync(deviceId);
                if (tokenBalance == null || tokenBalance.TokensRemaining <= 0)
                {
                    return BadRequest(new { message = "Insufficient tokens. Please purchase a token pack." });
                }
            }

            // Generate workout using AI
            var workout = await _aiService.GenerateWorkoutAsync(new WorkoutPreferences
            {
                FitnessLevel = request.FitnessLevel,
                WorkoutType = request.WorkoutType,
                Duration = request.Duration,
                Equipment = request.Equipment,
                Injuries = request.Injuries ?? new List<string>(),
                Goals = request.Goals ?? new List<string>()
            });

            // Save workout
            await _dynamoService.SaveWorkoutAsync(workout);

            // Update usage or deduct token
            if (isFreeUser)
            {
                var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
                await _dynamoService.IncrementAnonymousUsageAsync(deviceId, today);
            }
            else
            {
                await _tokenService.DeductTokenAsync(deviceId);
                var updatedBalance = await _tokenService.GetTokenBalanceAsync(deviceId);
                workout.TokensRemaining = updatedBalance?.TokensRemaining ?? 0;
            }

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
}

