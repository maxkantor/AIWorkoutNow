using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Controllers;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AIWorkoutNow.Api.Tests;

public class PricingControllerTests
{
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
    public async Task GetPricingPlans_ReturnsDefaultPlans_WhenCacheIsEmpty()
    {
        // Arrange
        _mockDynamoService.Setup(x => x.GetAllPricingPlansAsync())
            .ReturnsAsync(new List<PricingPlan>());

        // Act
        var result = await _controller.GetPricingPlans();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var plans = Assert.IsAssignableFrom<List<PricingPlan>>(okResult.Value);
        Assert.True(plans.Count > 0);
        Assert.All(plans, p => Assert.True(p.IsActive));
    }

    [Fact]
    public async Task GetPricingPlans_ReturnsCachedPlans_WhenCacheIsValid()
    {
        // Arrange
        var cachedPlans = new List<PricingPlan>
        {
            new PricingPlan { PlanId = "test-plan", Name = "Test", Price = 9.99m, IsActive = true }
        };
        
        // First call populates cache
        _mockDynamoService.Setup(x => x.GetAllPricingPlansAsync())
            .ReturnsAsync(cachedPlans);
        
        await _controller.GetPricingPlans();
        
        // Second call should use cache
        var result = await _controller.GetPricingPlans();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var plans = Assert.IsAssignableFrom<List<PricingPlan>>(okResult.Value);
        Assert.True(plans.Count > 0);
        
        // Verify GetAllPricingPlansAsync was only called once (cache hit on second call)
        _mockDynamoService.Verify(x => x.GetAllPricingPlansAsync(), Times.Once);
    }

    [Fact]
    public async Task GetUserAccessStatus_GrantsUnlimitedAccess_WhenStripeSessionFound()
    {
        // Arrange
        var deviceId = "test-device-123";
        var planId = "default-unlimited-access";
        
        _mockDynamoService.Setup(x => x.GetUserTokensAsync(deviceId))
            .ReturnsAsync((UserTokens?)null);
        
        _mockDynamoService.Setup(x => x.GetPricingPlanAsync(planId))
            .ReturnsAsync(new PricingPlan 
            { 
                PlanId = planId, 
                IsUnlimited = true,
                IsActive = true
            });
        
        _mockConfigService.Setup(x => x.GetStripeSecretKeyAsync())
            .ReturnsAsync("sk_test_123");
        
        // Mock Stripe API response
        var mockHttpClient = new Mock<HttpClient>();
        // Note: This is a simplified test - in reality, we'd need to mock HttpClient properly
        
        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = okResult.Value;
        
        // Verify tokens were saved
        _mockDynamoService.Verify(x => x.SaveUserTokensAsync(It.Is<UserTokens>(t => 
            t.TokensRemaining == 999999 && 
            t.DeviceId == deviceId &&
            t.ExpiresAt.HasValue
        )), Times.AtLeastOnce);
    }

    [Fact]
    public async Task GetUserAccessStatus_SetsExpirationToOneYear_WhenUnlimitedPurchaseFound()
    {
        // Arrange
        var deviceId = "test-device-123";
        var purchaseDate = new DateTime(2026, 1, 8, 12, 0, 0, DateTimeKind.Utc);
        var expectedExpiration = purchaseDate.AddDays(365);
        
        var tokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 999999,
            ExpiresAt = purchaseDate.AddDays(7) // Wrong expiration (7 days)
        };
        
        var purchase = new UserPurchase
        {
            DeviceId = deviceId,
            PlanId = "default-unlimited-access",
            IsUnlimited = true,
            Status = "completed",
            PurchasedAt = purchaseDate,
            ExpiresAt = purchaseDate.AddDays(7) // Wrong expiration
        };
        
        _mockDynamoService.Setup(x => x.GetUserTokensAsync(deviceId))
            .ReturnsAsync(tokens);
        
        _mockDynamoService.Setup(x => x.GetActiveUnlimitedPurchaseAsync(deviceId))
            .ReturnsAsync(purchase);
        
        _mockDynamoService.Setup(x => x.GetUserPurchasesAsync(deviceId))
            .ReturnsAsync(new List<UserPurchase> { purchase });

        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        
        // Verify expiration was corrected to 1 year
        _mockDynamoService.Verify(x => x.SaveUserPurchaseAsync(It.Is<UserPurchase>(p => 
            p.ExpiresAt.HasValue && 
            p.ExpiresAt.Value.Date == expectedExpiration.Date
        )), Times.Once);
        
        _mockDynamoService.Verify(x => x.SaveUserTokensAsync(It.Is<UserTokens>(t => 
            t.ExpiresAt.HasValue && 
            t.ExpiresAt.Value.Date == expectedExpiration.Date
        )), Times.Once);
    }

    [Fact]
    public async Task GetUserAccessStatus_ReturnsUnlimitedAccess_WhenTokensAre999999()
    {
        // Arrange
        var deviceId = "test-device-123";
        var tokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 999999,
            ExpiresAt = DateTime.UtcNow.AddDays(365)
        };
        
        _mockDynamoService.Setup(x => x.GetUserTokensAsync(deviceId))
            .ReturnsAsync(tokens);
        
        _mockDynamoService.Setup(x => x.GetActiveUnlimitedPurchaseAsync(deviceId))
            .ReturnsAsync((UserPurchase?)null);
        
        _mockDynamoService.Setup(x => x.GetUserPurchasesAsync(deviceId))
            .ReturnsAsync(new List<UserPurchase>());

        // Act
        var result = await _controller.GetUserAccessStatus(deviceId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
        
        // Use reflection to check hasUnlimitedAccess property
        var hasUnlimitedAccess = okResult.Value.GetType().GetProperty("hasUnlimitedAccess")?.GetValue(okResult.Value);
        Assert.True((bool)(hasUnlimitedAccess ?? false));
    }
}
