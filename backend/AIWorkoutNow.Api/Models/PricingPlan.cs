namespace AIWorkoutNow.Api.Models;

public class PricingPlan
{
    public string PlanId { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "USD";
    public int? TokenCount { get; set; } // Null if unlimited
    public bool IsUnlimited { get; set; }
    public int? UnlimitedDays { get; set; } // Days of unlimited access (default 7)
    public int DisplayOrder { get; set; }
    public bool IsRecommended { get; set; }
    public string? BadgeText { get; set; }
    public string? MicroCopy { get; set; }
    public bool IsActive { get; set; } = true;
    public string StripePriceId { get; set; } = string.Empty; // Optional: Pre-created Stripe Price ID (not required)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class UserPurchase
{
    public string PurchaseId { get; set; } = Guid.NewGuid().ToString();
    public string DeviceId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string StripeSessionId { get; set; } = string.Empty;
    public string StripePaymentIntentId { get; set; } = string.Empty;
    public string Status { get; set; } = "pending"; // pending, completed, failed, expired
    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; } // For unlimited plans
    public int? TokensGranted { get; set; }
    public bool IsUnlimited { get; set; }
}
