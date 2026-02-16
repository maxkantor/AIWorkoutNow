using Xunit;
using Moq;
using Microsoft.AspNetCore.Http;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using AIWorkoutNow.Api.Services;
using AIWorkoutNow.Api.Middleware;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Tests;

/// <summary>
/// Integration-style tests: when request is classified as BOT, DynamoDB write methods must not call DynamoDB (zero writes).
/// </summary>
public class TrafficFilterZeroWriteTests
{
    [Fact]
    public async Task SaveWorkoutAsync_WhenTrafficTypeIsBot_DoesNotCallPutItem()
    {
        var mockDynamo = new Mock<IAmazonDynamoDB>();
        var ctx = new DefaultHttpContext();
        ctx.Items[TrafficClassificationMiddleware.ItemKeyType] = TrafficType.BOT;
        ctx.Items[TrafficClassificationMiddleware.ItemKeyReason] = "ua:bot";
        var mockHttp = new Mock<IHttpContextAccessor>();
        mockHttp.Setup(x => x.HttpContext).Returns(ctx);

        var service = new DynamoDBService(mockDynamo.Object, mockHttp.Object);
        var workout = new Workout
        {
            WorkoutId = "w1",
            Hash = "h1",
            Title = "Test",
            CreatedAt = DateTime.UtcNow
        };

        await service.SaveWorkoutAsync(workout);

        mockDynamo.Verify(
            x => x.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveWorkoutAsync_WhenTrafficTypeIsHuman_CallsPutItem()
    {
        var mockDynamo = new Mock<IAmazonDynamoDB>();
        mockDynamo.Setup(x => x.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PutItemResponse());
        var ctx = new DefaultHttpContext();
        ctx.Items[TrafficClassificationMiddleware.ItemKeyType] = TrafficType.HUMAN;
        var mockHttp = new Mock<IHttpContextAccessor>();
        mockHttp.Setup(x => x.HttpContext).Returns(ctx);

        var service = new DynamoDBService(mockDynamo.Object, mockHttp.Object);
        var workout = new Workout
        {
            WorkoutId = "w1",
            Hash = "h1",
            Title = "Test",
            CreatedAt = DateTime.UtcNow
        };

        await service.SaveWorkoutAsync(workout);

        mockDynamo.Verify(
            x => x.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SaveCustomerActivityAsync_WhenTrafficTypeIsBot_DoesNotCallPutItem()
    {
        var mockDynamo = new Mock<IAmazonDynamoDB>();
        var ctx = new DefaultHttpContext();
        ctx.Items[TrafficClassificationMiddleware.ItemKeyType] = TrafficType.BOT;
        var mockHttp = new Mock<IHttpContextAccessor>();
        mockHttp.Setup(x => x.HttpContext).Returns(ctx);

        var service = new DynamoDBService(mockDynamo.Object, mockHttp.Object);
        var activity = new CustomerActivity
        {
            ActivityId = "a1",
            DeviceId = "d1",
            ActivityType = "workout_generated",
            Description = "Test",
            Timestamp = DateTime.UtcNow
        };

        await service.SaveCustomerActivityAsync(activity);

        mockDynamo.Verify(
            x => x.PutItemAsync(It.IsAny<PutItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
