using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public interface IAmazonAffiliateService
{
    string GenerateAffiliateLink(string asin, string? linkText = null);
    Task<List<ProductRecommendation>> GetProductRecommendationsAsync(string workoutType, string equipment, List<string> exercises);
    List<ProductRecommendation> ProcessProductRecommendations(List<ProductRecommendation>? recommendations, string workoutType);
    Task TrackAffiliateClickAsync(string deviceId, string asin, string workoutId, string? linkText = null);
}
