namespace AIWorkoutNow.Api.Models;

public class ProductRecommendation
{
    public string ASIN { get; set; } = string.Empty; // Can be actual ASIN or search keywords for tracking
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Price { get; set; }
    public string AffiliateLink { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // e.g., "Dumbbells", "Resistance Bands", "Yoga Mat"
    public string? SearchKeywords { get; set; } // Amazon search keywords (e.g., "adjustable dumbbells set")
    public string? Reason { get; set; } // Why this product is recommended for this workout
}
