using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Controllers;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AIWorkoutNow.Api.Tests;

public class PricingControllerTests
{
    private static T? GetProp<T>(object obj, string name) =>
        (T?)obj.GetType().GetProperty(name)?.GetValue(obj);

    private readonly Mock<IDynamoDBService> _mockDynamoService;
    private readonly Mock<IConfigService> _mockConfigService;
    private readonly PricingController _controller;

    public PricingControllerTests()
    {
        _mockDynamoService = new Mock<IDynamoDBService>();
        _mockConfigService = new Mock<IConfigService>();
        _controller = new PricingController(_mockDynamoService.Object, _mockConfigService.Object);
    }

    [Fact]
    public async Task GetUserAccessStatus_WithAdminResetTokens_ReturnsTokensImmediately()
    {
        // Arrange
        var deviceId = "device-admin-reset";
        var tokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 7, // Admin reset value
            IsActive = true
        };

        _mockDynamoService.Setup(x => x.ReconcileTokensAsync(deviceId))
            .ReturnsAsync(tokens);

        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(okResult.StatusCode is null or 200);
        var tokensRemaining = GetProp<int?>(okResult.Value!, "tokensRemaining");
        var hasUnlimitedAccess = GetProp<bool?>(okResult.Value!, "hasUnlimitedAccess");
        Assert.Equal(7, tokensRemaining);
        Assert.False(hasUnlimitedAccess ?? true);

        // Verify Stripe was NOT checked (admin reset should skip Stripe)
        _mockConfigService.Verify(x => x.GetStripeSecretKeyAsync(), Times.Never);
    }

    [Fact]
    public async Task GetUserAccessStatus_WithZeroTokens_ChecksStripe()
    {
        // Arrange
        var deviceId = "device-zero-tokens";
        var tokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 0,
            IsActive = true
        };

        _mockDynamoService.Setup(x => x.ReconcileTokensAsync(deviceId))
            .ReturnsAsync(tokens);
        _mockConfigService.Setup(x => x.GetStripeSecretKeyAsync())
            .ReturnsAsync("sk_test_123");

        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(okResult.StatusCode is null or 200);
        // Verify Stripe was checked when tokens are 0
        _mockConfigService.Verify(x => x.GetStripeSecretKeyAsync(), Times.AtLeastOnce);
    }

    [Fact]
    public async Task GetUserAccessStatus_WithUnlimitedAccess_ReturnsUnlimited()
    {
        // Arrange
        var deviceId = "device-unlimited";
        var tokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 999999,
            ExpiresAt = DateTime.UtcNow.AddDays(365),
            IsActive = true
        };

        _mockDynamoService.Setup(x => x.ReconcileTokensAsync(deviceId))
            .ReturnsAsync(tokens);
        _mockDynamoService.Setup(x => x.GetActiveUnlimitedPurchaseAsync(deviceId))
            .ReturnsAsync(new UserPurchase
            {
                DeviceId = deviceId,
                IsUnlimited = true,
                ExpiresAt = tokens.ExpiresAt
            });

        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetUserAccessStatus_WithFreeWorkouts_ReturnsFreeWorkouts()
    {
        // Arrange
        var deviceId = "device-free";
        var tokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 0,
            IsActive = true
        };

        _mockDynamoService.Setup(x => x.ReconcileTokensAsync(deviceId))
            .ReturnsAsync(tokens);
        _mockDynamoService.Setup(x => x.GetTotalFreeWorkoutsAsync(deviceId))
            .ReturnsAsync(2); // 2 free workouts used, 1 remaining

        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(okResult.StatusCode is null or 200);
        var freeRemaining = GetProp<int?>(okResult.Value!, "freeWorkoutsRemaining");
        var tokensRemaining = GetProp<int?>(okResult.Value!, "tokensRemaining");
        Assert.Equal(1, freeRemaining);
        Assert.Equal(0, tokensRemaining);
    }

    [Fact]
    public async Task GetUserAccessStatus_ReconcilesPurchasedTokens_WhenStoredBalanceIsLower()
    {
        // Arrange
        var deviceId = "device-reconcile";
        var tokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 90,
            IsActive = true
        };

        _mockDynamoService.Setup(x => x.ReconcileTokensAsync(deviceId))
            .ReturnsAsync(new UserTokens
            {
                DeviceId = deviceId,
                TokensRemaining = 100,
                IsActive = true
            });

        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(okResult.StatusCode is null or 200);
        var tokensRemaining = GetProp<int?>(okResult.Value!, "tokensRemaining");
        Assert.Equal(100, tokensRemaining);
        _mockDynamoService.Verify(x => x.ReconcileTokensAsync(deviceId), Times.Once);
    }
}
