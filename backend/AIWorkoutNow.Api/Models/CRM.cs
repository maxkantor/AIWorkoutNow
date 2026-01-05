namespace AIWorkoutNow.Api.Models;

public class StripePurchase
{
    public string PurchaseId { get; set; } = Guid.NewGuid().ToString();
    public string DeviceId { get; set; } = string.Empty;
    public string StripeCustomerId { get; set; } = string.Empty;
    public string StripePaymentIntentId { get; set; } = string.Empty;
    public string StripeSessionId { get; set; } = string.Empty;
    public string PackType { get; set; } = string.Empty; // Weekly, Monthly, Challenge, Annual
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public int TokensPurchased { get; set; }
    public string Status { get; set; } = string.Empty; // completed, pending, failed, refunded
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }
}

public class CustomerActivity
{
    public string ActivityId { get; set; } = Guid.NewGuid().ToString();
    public string DeviceId { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty; // workout_generated, token_purchased, contact_submitted, etc.
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, object>? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? WorkoutId { get; set; }
    public string? PurchaseId { get; set; }
    public string? ContactMessageId { get; set; }
}

public class ContactReply
{
    public string ReplyId { get; set; } = Guid.NewGuid().ToString();
    public string MessageId { get; set; } = string.Empty;
    public string AdminId { get; set; } = string.Empty;
    public string ReplyText { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool Sent { get; set; } = false;
}

public class CustomerSummary
{
    public string DeviceId { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Name { get; set; }
    public bool IsPaidUser { get; set; }
    public int TokensRemaining { get; set; }
    public int TotalWorkouts { get; set; }
    public int TotalPurchases { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime? FirstSeen { get; set; }
    public DateTime? LastActivity { get; set; }
    public List<CustomerActivity>? RecentActivities { get; set; }
}
