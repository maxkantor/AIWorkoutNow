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
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly PricingController _controller;

    public PricingControllerTests()
    {
        _mockDynamoService = new Mock<IDynamoDBService>();
        _mockConfigService = new Mock<IConfigService>();
        _mockEmailService = new Mock<IEmailService>();
        _controller = new PricingController(_mockDynamoService.Object, _mockConfigService.Object, _mockEmailService.Object);
    }

    [Fact]
    public async Task GetUserAccessStatus_MapsBalanceFields_13Plus25Equals38()
    {
        var deviceId = "dev-13-25";
        var balance = new BalanceDto
        {
            DeviceId = deviceId,
            PaidWorkoutsRemaining = 38,
            FreeWorkoutsRemaining = 0,
            RemainingWorkouts = 38,
            TotalWorkouts = 38,
            HasUnlimitedAccess = false
        };

        _mockDynamoService.Setup(s => s.GetBalanceAsync(deviceId))
            .ReturnsAsync(balance);

        var result = await _controller.GetUserAccessStatus(deviceId);

        var ok = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(ok.StatusCode is null or 200);
        Assert.Equal(38, GetProp<int?>(ok.Value!, "tokensRemaining"));
        Assert.Equal(38, GetProp<int?>(ok.Value!, "remainingWorkouts"));
        Assert.Equal(38, GetProp<int?>(ok.Value!, "totalWorkouts"));
        Assert.False(GetProp<bool?>(ok.Value!, "hasUnlimitedAccess") ?? true);

        _mockDynamoService.Verify(s => s.GetBalanceAsync(deviceId), Times.Once);
    }

    [Fact]
    public async Task GetUserAccessStatus_MapsUnlimitedBalance()
    {
        var deviceId = "dev-unlimited";
        var expires = DateTime.UtcNow.AddDays(200);
        var balance = new BalanceDto
        {
            DeviceId = deviceId,
            PaidWorkoutsRemaining = 999999,
            FreeWorkoutsRemaining = 0,
            RemainingWorkouts = 999999,
            TotalWorkouts = 999999,
            HasUnlimitedAccess = true,
            UnlimitedExpiresAt = expires
        };

        _mockDynamoService.Setup(s => s.GetBalanceAsync(deviceId))
            .ReturnsAsync(balance);

        var result = await _controller.GetUserAccessStatus(deviceId);

        var ok = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(ok.StatusCode is null or 200);
        Assert.True(GetProp<bool?>(ok.Value!, "hasUnlimitedAccess"));
        Assert.Equal(999999, GetProp<int?>(ok.Value!, "tokensRemaining"));
        Assert.Equal(expires.ToString("O"), GetProp<string?>(ok.Value!, "unlimitedExpiresAt"));
    }

    [Fact]
    public async Task GetUserAccessStatus_MapsFreeWorkouts()
    {
        var deviceId = "dev-free";
        var balance = new BalanceDto
        {
            DeviceId = deviceId,
            PaidWorkoutsRemaining = 0,
            FreeWorkoutsRemaining = 2,
            RemainingWorkouts = 2,
            TotalWorkouts = 2,
            HasUnlimitedAccess = false
        };

        _mockDynamoService.Setup(s => s.GetBalanceAsync(deviceId))
            .ReturnsAsync(balance);

        var result = await _controller.GetUserAccessStatus(deviceId);

        var ok = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.True(ok.StatusCode is null or 200);
        Assert.Equal(2, GetProp<int?>(ok.Value!, "freeWorkoutsRemaining"));
        Assert.Equal(0, GetProp<int?>(ok.Value!, "tokensRemaining"));
        Assert.Equal(2, GetProp<int?>(ok.Value!, "remainingWorkouts"));
    }
}
