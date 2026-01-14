using System.Text.Json.Serialization;
using AIWorkoutNow.Api.Converters;

namespace AIWorkoutNow.Api.Models;

public class Workout
{
    public string WorkoutId { get; set; } = Guid.NewGuid().ToString();
    public string Hash { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public List<Exercise> Exercises { get; set; } = new();
    public List<string>? Tips { get; set; }
    public List<ProductRecommendation>? ProductRecommendations { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? TokensRemaining { get; set; }
}

public class Exercise
{
    public string Name { get; set; } = string.Empty;
    
    [JsonConverter(typeof(FlexibleIntConverter))]
    public int? Sets { get; set; }
    
    [JsonConverter(typeof(FlexibleIntConverter))]
    public int? Reps { get; set; }
    
    public string? Duration { get; set; }
    public string? Instructions { get; set; }
    public string? Rest { get; set; }
}

public class WorkoutPreferences
{
    public string FitnessLevel { get; set; } = string.Empty;
    public string WorkoutType { get; set; } = string.Empty;
    public int Duration { get; set; }
    public string Equipment { get; set; } = string.Empty;
    public List<string> Injuries { get; set; } = new();
    public List<string> Goals { get; set; } = new();
}

public class AnonymousUsage
{
    public string DeviceId { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class UserTokens
{
    public string DeviceId { get; set; } = string.Empty;
    public int TokensRemaining { get; set; }
    public int TotalWorkouts { get; set; } // New: denominator for remaining/total
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true; // For marking customers as inactive
    // When an admin resets a balance, we record the timestamp so reconciliation can avoid re-granting old purchases.
    public DateTime? LastResetAt { get; set; }
}

public class ProgressLog
{
    public string DeviceId { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string WorkoutId { get; set; } = string.Empty;
    public Dictionary<string, object>? Metrics { get; set; }
}

public class AdminUser
{
    public string AdminId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "admin";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ContactMessage
{
    public string MessageId { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class EmailVerificationCode
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(10);
    public int Attempts { get; set; } = 0;
}

public class EmailVisitorMapping
{
    public string Email { get; set; } = string.Empty;
    public List<string> VisitorIds { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
