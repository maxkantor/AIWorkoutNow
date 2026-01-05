namespace AIWorkoutNow.Api.Models;

public class GenerateWorkoutRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public bool IsFreeUser { get; set; }
    public string FitnessLevel { get; set; } = string.Empty;
    public string WorkoutType { get; set; } = string.Empty;
    public int Duration { get; set; }
    public string Equipment { get; set; } = string.Empty;
    public List<string>? Injuries { get; set; }
    public List<string>? Goals { get; set; }
}

public class ContactRequest
{
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class AdminLoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class SendEmailRequest
{
    public string To { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}


public class AffiliateClickRequest
{
    public string DeviceId { get; set; } = string.Empty;
    public string ASIN { get; set; } = string.Empty;
    public string WorkoutId { get; set; } = string.Empty;
    public string? LinkText { get; set; }
}
