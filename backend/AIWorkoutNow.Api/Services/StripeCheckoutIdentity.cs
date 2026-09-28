using AIWorkoutNow.Api.Models;
using Stripe.Checkout;

namespace AIWorkoutNow.Api.Services;

/// <summary>
/// AIWorkoutNow-specific Stripe Checkout copy and per-session branding (never account-wide).
/// </summary>
public static class StripeCheckoutIdentity
{
    public const string DisplayName = "AIWorkoutNow";
    public const string CheckoutIconPath = "/stripe-checkout-icon.png";
    public const string PurchaseTypeWorkoutCredits = "workout_credits";

    public static string CheckoutIconUrl(string frontendUrl) =>
        $"{frontendUrl.TrimEnd('/')}{CheckoutIconPath}";

    public static string WorkoutPackProductName(PricingPlan plan)
    {
        if (plan.TokenCount.HasValue && plan.TokenCount.Value > 0)
            return $"AIWorkoutNow — {plan.TokenCount.Value} AI Workout Generations";

        return $"AIWorkoutNow — {plan.Name}";
    }

    public static string WorkoutPackDescription(PricingPlan plan)
    {
        if (plan.TokenCount.HasValue && plan.TokenCount.Value > 0)
        {
            return
                $"Generate {plan.TokenCount.Value} personalized AI-powered workouts using your purchased workout credits on AIWorkoutNow.";
        }

        if (!string.IsNullOrWhiteSpace(plan.MicroCopy))
            return plan.MicroCopy;

        return "Generate personalized AI-powered workouts using your purchased workout credits on AIWorkoutNow.";
    }

    public static Dictionary<string, string> BuildFulfillmentMetadata(
        bool isProduction,
        PricingPlan plan,
        string deviceId)
    {
        var meta = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["deviceId"] = deviceId,
            ["planId"] = plan.PlanId,
            ["environment"] = isProduction ? "production" : "test",
            ["purchaseType"] = PurchaseTypeWorkoutCredits,
            ["plan"] = plan.PlanId,
            ["internalProductId"] = plan.PlanId,
        };

        if (plan.TokenCount.HasValue)
            meta["credits"] = plan.TokenCount.Value.ToString();

        if (plan.TokenCount.HasValue)
            meta["tokenCount"] = plan.TokenCount.Value.ToString();

        return StripeAppIsolation.WithAppMetadata(meta);
    }

    /// <summary>
    /// Same shape as LuckyNumbersLab: DisplayName + Icon only (no background/button overrides).
    /// </summary>
    public static SessionBrandingSettingsOptions CreateBrandingSettings(string frontendBaseUrl) =>
        new()
        {
            DisplayName = DisplayName,
            Icon = new SessionBrandingSettingsIconOptions
            {
                Type = "url",
                Url = CheckoutIconUrl(frontendBaseUrl),
            },
        };
}
