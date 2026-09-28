using AIWorkoutNow.Api.Models;
using AIWorkoutNow.Api.Services;
using Xunit;

namespace AIWorkoutNow.Api.Tests;

public class StripeCheckoutIdentityTests
{
    [Fact]
    public void CheckoutIconUrl_UsesFrontendBase_AndStablePath()
    {
        Assert.Equal(
            "https://aiworkoutnow.com/stripe-checkout-icon.png",
            StripeCheckoutIdentity.CheckoutIconUrl("https://aiworkoutnow.com/"));
    }

    [Fact]
    public void CreateBrandingSettings_MatchesLuckyNumbersLabShape_DisplayNameAndIconOnly()
    {
        var branding = StripeCheckoutIdentity.CreateBrandingSettings("https://aiworkoutnow.com");
        Assert.Equal("AIWorkoutNow", branding.DisplayName);
        Assert.Null(branding.BackgroundColor);
        Assert.Null(branding.ButtonColor);
        Assert.NotNull(branding.Icon);
        Assert.Equal("url", branding.Icon!.Type);
        Assert.Equal(
            "https://aiworkoutnow.com/stripe-checkout-icon.png",
            branding.Icon.Url);
        Assert.Null(branding.Logo);
    }

    [Fact]
    public void WorkoutPackCopy_UsesActualTokenCounts()
    {
        var plan = new PricingPlan { Name = "30 Workouts", TokenCount = 30, PlanId = "default-30-workouts" };
        Assert.Equal("AIWorkoutNow — 30 AI Workout Generations", StripeCheckoutIdentity.WorkoutPackProductName(plan));
        Assert.Contains("30", StripeCheckoutIdentity.WorkoutPackDescription(plan));
        Assert.Contains("AIWorkoutNow", StripeCheckoutIdentity.WorkoutPackDescription(plan));
    }

    [Fact]
    public void BuildFulfillmentMetadata_IncludesAppIsolationFields()
    {
        var plan = new PricingPlan
        {
            PlanId = "default-10-workouts",
            TokenCount = 10,
            Name = "10 Workouts",
        };

        var meta = StripeCheckoutIdentity.BuildFulfillmentMetadata(true, plan, "device-123");

        Assert.Equal("AIWorkoutNow", meta["app"]);
        Assert.Equal("aiworkoutnow", meta["product"]);
        Assert.Equal("aiworkoutnow", meta["site"]);
        Assert.Equal("production", meta["environment"]);
        Assert.Equal("workout_credits", meta["purchaseType"]);
        Assert.Equal("default-10-workouts", meta["plan"]);
        Assert.Equal("default-10-workouts", meta["internalProductId"]);
        Assert.Equal("10", meta["credits"]);
        Assert.Equal("10", meta["tokenCount"]);
        Assert.Equal("device-123", meta["deviceId"]);
    }

    [Fact]
    public void IsAIWorkoutNowSession_RejectsForeignAppMetadata()
    {
        Assert.True(StripeAppIsolation.IsAIWorkoutNowSession(new Dictionary<string, string>
        {
            ["app"] = "AIWorkoutNow",
            ["site"] = "aiworkoutnow",
        }));

        Assert.True(StripeAppIsolation.IsAIWorkoutNowSession(new Dictionary<string, string>
        {
            ["site"] = "aiworkoutnow",
        }));

        Assert.False(StripeAppIsolation.IsAIWorkoutNowSession(new Dictionary<string, string>
        {
            ["app"] = "luckynumberslab",
        }));

        Assert.False(StripeAppIsolation.IsAIWorkoutNowSession(new Dictionary<string, string>
        {
            ["site"] = "hybridrace",
        }));
    }
}
