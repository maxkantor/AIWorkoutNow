using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Controllers;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AIWorkoutNow.Api.Tests;

public class AdminControllerTests
{
    private static T? GetProp<T>(object obj, string name) =>
        (T?)obj.GetType().GetProperty(name)?.GetValue(obj);

    private readonly Mock<IDynamoDBService> _mockDynamoService;
    private readonly Mock<IAuthService> _mockAuthService;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IConfigService> _mockConfigService;
    private readonly AdminController _controller;

    public AdminControllerTests()
    {
        _mockDynamoService = new Mock<IDynamoDBService>();
        _mockAuthService = new Mock<IAuthService>();
        _mockEmailService = new Mock<IEmailService>();
        _mockConfigService = new Mock<IConfigService>();

        _controller = new AdminController(
            _mockDynamoService.Object,
            _mockAuthService.Object,
            _mockEmailService.Object,
            _mockConfigService.Object
        );

        // Setup controller context with authenticated user
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "admin-123"),
            new Claim(ClaimTypes.Email, "admin@test.com")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        _controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = principal
            }
        };
    }

    [Fact]
    public async Task ResetTokens_WithValidRequest_ReturnsSuccess()
    {
        // Arrange
        var deviceId = "device-123";
        var request = new ResetTokensRequest
        {
            NewTokenCount = 10,
            PreviousTokenCount = 5,
            Reason = "Test reset"
        };

        var balance = new BalanceDto
        {
            DeviceId = deviceId,
            PaidWorkoutsRemaining = 10,
            RemainingWorkouts = 10,
            TotalWorkouts = 10,
            FreeWorkoutsRemaining = 0
        };

        _mockDynamoService.Setup(x => x.ResetBalanceAsync(deviceId, request.NewTokenCount, request.Reason, false))
            .ReturnsAsync(balance);

        // Act
        var result = await _controller.ResetTokens(deviceId, request);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(okResult.StatusCode is null or 200);
        var returnedBalance = Assert.IsAssignableFrom<BalanceDto>(okResult.Value);
        Assert.Equal(10, returnedBalance.PaidWorkoutsRemaining);
        Assert.Equal(10, returnedBalance.RemainingWorkouts);
        Assert.Equal(10, returnedBalance.TotalWorkouts);

        _mockDynamoService.Verify(x => x.ResetBalanceAsync(deviceId, 10, "Test reset", false), Times.Once);
    }

    [Fact]
    public async Task ResetTokens_WithoutPreviousCount_FetchesFromDatabase()
    {
        // Arrange
        var deviceId = "device-456";
        var request = new ResetTokensRequest
        {
            NewTokenCount = 20,
            PreviousTokenCount = 0, // Not provided
            Reason = "Admin reset"
        };

        var existingTokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 15
        };

        _mockDynamoService.Setup(x => x.GetUserTokensAsync(deviceId))
            .ReturnsAsync(existingTokens);
        _mockDynamoService.Setup(x => x.ResetBalanceAsync(deviceId, request.NewTokenCount, request.Reason, false))
            .ReturnsAsync(new BalanceDto { DeviceId = deviceId, PaidWorkoutsRemaining = 20, RemainingWorkouts = 20, TotalWorkouts = 20, FreeWorkoutsRemaining = 0 });

        // Act
        var result = await _controller.ResetTokens(deviceId, request);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(okResult.StatusCode is null or 200);
        _mockDynamoService.Verify(x => x.GetUserTokensAsync(deviceId), Times.Once);
        _mockDynamoService.Verify(x => x.ResetBalanceAsync(deviceId, 20, request.Reason, false), Times.Once);
    }

    [Fact]
    public async Task ResetTokens_WithException_ReturnsError()
    {
        // Arrange
        var deviceId = "device-789";
        var request = new ResetTokensRequest
        {
            NewTokenCount = 5,
            PreviousTokenCount = 3
        };

        _mockDynamoService.Setup(x => x.ResetBalanceAsync(deviceId, request.NewTokenCount, request.Reason, false))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.ResetTokens(deviceId, request);

        // Assert
        var statusResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
        var message = GetProp<string>(statusResult.Value!, "message");
        Assert.Equal("Failed to reset tokens", message);
    }

    [Fact]
    public async Task ResetTokensByEmail_WithValidEmail_ResetsAllDevices()
    {
        // Arrange
        var email = "test@example.com";
        var request = new ResetTokensRequest
        {
            NewTokenCount = 25,
            PreviousTokenCount = 0,
            Reason = "Bulk reset"
        };

        var deviceIds = new List<string> { "device-1", "device-2", "device-3" };
        _mockDynamoService.Setup(x => x.GetVisitorIdsByEmailAsync(email))
            .ReturnsAsync(deviceIds);

        foreach (var deviceId in deviceIds)
        {
            _mockDynamoService.Setup(x => x.GetUserTokensAsync(deviceId))
                .ReturnsAsync(new UserTokens { DeviceId = deviceId, TokensRemaining = 10 });
            _mockDynamoService.Setup(x => x.ResetBalanceAsync(deviceId, request.NewTokenCount, request.Reason, false))
                .ReturnsAsync(new BalanceDto { DeviceId = deviceId, PaidWorkoutsRemaining = request.NewTokenCount, TotalWorkouts = request.NewTokenCount });
            _mockDynamoService.Setup(x => x.SaveCustomerActivityAsync(It.Is<CustomerActivity>(
                a => a.DeviceId == deviceId && a.ActivityType == "tokens_reset")))
                .Returns(Task.CompletedTask);
        }

        // Act
        var result = await _controller.ResetTokensByEmail(email, request);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(okResult.StatusCode is null or 200);
        var message = GetProp<string>(okResult.Value!, "message") ?? string.Empty;
        Assert.Contains("3", message);

        foreach (var deviceId in deviceIds)
        {
            _mockDynamoService.Verify(x => x.ResetBalanceAsync(deviceId, 25, "Bulk reset", false), Times.Once);
        }
    }

    [Fact]
    public async Task ResetTokensByEmail_WithNoDevices_ReturnsNotFound()
    {
        // Arrange
        var email = "nonexistent@example.com";
        var request = new ResetTokensRequest { NewTokenCount = 10 };

        _mockDynamoService.Setup(x => x.GetVisitorIdsByEmailAsync(email))
            .ReturnsAsync(new List<string>());

        // Act
        var result = await _controller.ResetTokensByEmail(email, request);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        var message = GetProp<string>(notFoundResult.Value!, "message") ?? string.Empty;
        Assert.Contains("No devices found", message);
    }

    [Fact]
    public async Task ResetTokens_SetsCorsHeaders()
    {
        // Arrange
        var deviceId = "device-cors";
        var request = new ResetTokensRequest { NewTokenCount = 5, PreviousTokenCount = 3 };

        _mockDynamoService.Setup(x => x.ResetUserTokensAsync(deviceId, request.NewTokenCount))
            .Returns(Task.CompletedTask);
        _mockDynamoService.Setup(x => x.SaveCustomerActivityAsync(It.IsAny<CustomerActivity>()))
            .Returns(Task.CompletedTask);

        // Act
        await _controller.ResetTokens(deviceId, request);

        // Assert
        Assert.Equal("*", _controller.Response.Headers["Access-Control-Allow-Origin"].ToString());
        Assert.Contains("GET, POST", _controller.Response.Headers["Access-Control-Allow-Methods"].ToString());
    }
}
