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
    public int FreeWorkoutsUsed { get; set; }
    public int FreeWorkoutsRemaining { get; set; }
    public DateTime? FirstSeen { get; set; }
    public DateTime? LastActivity { get; set; }
    public List<CustomerActivity>? RecentActivities { get; set; }
    public bool IsActive { get; set; } = true; // Default to active
}

// Admin-facing DTO for Customers list
public class AdminCustomerSummary
{
    public string DeviceId { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Name { get; set; }
    public bool IsDeactivated { get; set; }
    public string StatusLabel { get; set; } = "Free"; // Free | Paid | Deactivated
    public int RemainingTokens { get; set; }
    public int TotalWorkouts { get; set; }
    public int GeneratedWorkouts { get; set; }
    public int RemainingWorkouts { get; set; }
    public int PurchasesCount { get; set; }
    public int TotalSpentCents { get; set; }
    public string TotalSpentFormatted { get; set; } = "$0.00";
    public string? LastActivityIso { get; set; }
}

public class AdminPurchaseDto
{
    public string PurchaseId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public int AmountCents { get; set; }
    public string AmountFormatted { get; set; } = "$0.00";
    public string Status { get; set; } = string.Empty;
    public string PurchasedAtIso { get; set; } = string.Empty;
}

public class AdminUsageEventDto
{
    public string ActivityType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TimestampIso { get; set; } = string.Empty;
}

// Admin-facing DTO for Customer detail view (extends summary + history)
public class AdminCustomerDetails : AdminCustomerSummary
{
    public int FreeWorkoutsUsed { get; set; }
    public int FreeWorkoutsRemaining { get; set; }
    public List<AdminPurchaseDto> Purchases { get; set; } = new();
    public List<AdminUsageEventDto> UsageEvents { get; set; } = new();
}

// Shared balance DTO for Home + Admin
public class BalanceDto
{
    public string DeviceId { get; set; } = string.Empty;
    public int PaidWorkoutsRemaining { get; set; }
    public int FreeWorkoutsRemaining { get; set; }
    public int RemainingWorkouts { get; set; }
    public int TotalWorkouts { get; set; }
    public int GeneratedWorkouts { get; set; }
    public int PurchasesCount { get; set; }
    public int TotalSpentCents { get; set; }
    public bool HasUnlimitedAccess { get; set; }
    public DateTime? UnlimitedExpiresAt { get; set; }
    public string? LastActivityIso { get; set; }
    public bool IsActive { get; set; } = true;
}
