using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using AIWorkoutNow.Api.Controllers;
using AIWorkoutNow.Api.Models;
using AIWorkoutNow.Api.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AIWorkoutNow.Api.Tests;

public class AdminCustomersContractTests
{
    private readonly Mock<IDynamoDBService> _dynamo = new();
    private readonly Mock<IAuthService> _auth = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly Mock<IConfigService> _config = new();

    private AdminController CreateController()
    {
        return new AdminController(_dynamo.Object, _auth.Object, _email.Object, _config.Object);
    }

    [Fact]
    public async Task Customers_ListAndDetail_ReturnSameCoreValues()
    {
        // Arrange
        var summary = new AdminCustomerSummary
        {
            DeviceId = "dev-1",
            Email = "user@test.com",
            Name = "Test User",
            IsDeactivated = false,
            StatusLabel = "Paid",
            RemainingTokens = 42,
            TotalWorkouts = 45,
            GeneratedWorkouts = 7,
            RemainingWorkouts = 45,
            PurchasesCount = 3,
            TotalSpentCents = 1999,
            TotalSpentFormatted = "$19.99",
            LastActivityIso = "2025-01-01T00:00:00Z"
        };

        var detail = new AdminCustomerDetails
        {
            DeviceId = summary.DeviceId,
            Email = summary.Email,
            Name = summary.Name,
            IsDeactivated = summary.IsDeactivated,
            StatusLabel = summary.StatusLabel,
            RemainingTokens = summary.RemainingTokens,
            TotalWorkouts = summary.TotalWorkouts,
            GeneratedWorkouts = summary.GeneratedWorkouts,
            RemainingWorkouts = summary.RemainingWorkouts,
            PurchasesCount = summary.PurchasesCount,
            TotalSpentCents = summary.TotalSpentCents,
            TotalSpentFormatted = summary.TotalSpentFormatted,
            LastActivityIso = summary.LastActivityIso,
            FreeWorkoutsRemaining = 3,
            FreeWorkoutsUsed = 0
        };

        _dynamo.Setup(s => s.GetAllCustomersAsync())
            .ReturnsAsync(new List<AdminCustomerSummary> { summary });
        _dynamo.Setup(s => s.GetCustomerSummaryAsync(summary.DeviceId))
            .ReturnsAsync(detail);

        var controller = CreateController();

        // Act
        var listResult = await controller.GetAllCustomers();
        var listOk = Assert.IsAssignableFrom<ObjectResult>(listResult);
        var list = Assert.IsAssignableFrom<List<AdminCustomerSummary>>(listOk.Value);

        var detailResult = await controller.GetCustomer(summary.DeviceId);
        var detailOk = Assert.IsAssignableFrom<ObjectResult>(detailResult);
        var detailValue = Assert.IsAssignableFrom<AdminCustomerDetails>(detailOk.Value);

        // Assert parity
        Assert.Single(list);
        var listItem = list[0];
        Assert.Equal(listItem.DeviceId, detailValue.DeviceId);
        Assert.Equal(listItem.StatusLabel, detailValue.StatusLabel);
        Assert.Equal(listItem.RemainingTokens, detailValue.RemainingTokens);
        Assert.Equal(listItem.TotalWorkouts, detailValue.TotalWorkouts);
        Assert.Equal(listItem.GeneratedWorkouts, detailValue.GeneratedWorkouts);
        Assert.Equal(listItem.RemainingWorkouts, detailValue.RemainingWorkouts);
        Assert.Equal(listItem.PurchasesCount, detailValue.PurchasesCount);
        Assert.Equal(listItem.TotalSpentCents, detailValue.TotalSpentCents);
        Assert.Equal(listItem.TotalSpentFormatted, detailValue.TotalSpentFormatted);
    }

    [Fact]
    public async Task Status_DeactivatedWhenFlagged()
    {
        var summary = new AdminCustomerSummary
        {
            DeviceId = "dev-2",
            StatusLabel = "Deactivated",
            IsDeactivated = true
        };

        _dynamo.Setup(s => s.GetAllCustomersAsync()).ReturnsAsync(new List<AdminCustomerSummary> { summary });

        var controller = CreateController();
        var listResult = await controller.GetAllCustomers();
        var listOk = Assert.IsAssignableFrom<ObjectResult>(listResult);
        var list = Assert.IsAssignableFrom<List<AdminCustomerSummary>>(listOk.Value);

        Assert.Single(list);
        Assert.True(list[0].IsDeactivated);
        Assert.Equal("Deactivated", list[0].StatusLabel);
    }
}
