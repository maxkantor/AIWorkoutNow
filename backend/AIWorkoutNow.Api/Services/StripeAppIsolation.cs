namespace AIWorkoutNow.Api.Services;

/// <summary>
/// Shared-Stripe isolation: AIWorkoutNow checkouts must be tagged; webhooks must ignore foreign apps.
/// </summary>
public static class StripeAppIsolation
{
    public const string AppId = "AIWorkoutNow";
    public const string SiteId = "aiworkoutnow";
    public const string MetadataAppKey = "app";
    public const string MetadataProductKey = "product";
    public const string MetadataSiteKey = "site";

    public static Dictionary<string, string> WithAppMetadata(IDictionary<string, string>? existing)
    {
        var meta = existing != null
            ? new Dictionary<string, string>(existing, StringComparer.Ordinal)
            : new Dictionary<string, string>(StringComparer.Ordinal);
        meta[MetadataAppKey] = AppId;
        meta[MetadataProductKey] = SiteId;
        meta[MetadataSiteKey] = SiteId;
        return meta;
    }

    /// <summary>
    /// True only when this Checkout Session belongs to AIWorkoutNow.
    /// Accepts legacy site-only metadata; rejects known foreign app markers.
    /// </summary>
    public static bool IsAIWorkoutNowSession(IReadOnlyDictionary<string, string>? metadata)
    {
        if (metadata == null || metadata.Count == 0)
            return false;

        var app = GetMeta(metadata, MetadataAppKey);
        var product = GetMeta(metadata, MetadataProductKey);
        var site = GetMeta(metadata, MetadataSiteKey);

        if (!string.IsNullOrEmpty(app) && !string.Equals(app, AppId, StringComparison.OrdinalIgnoreCase))
            return false;
        if (!string.IsNullOrEmpty(product) && !string.Equals(product, SiteId, StringComparison.OrdinalIgnoreCase))
            return false;
        if (!string.IsNullOrEmpty(site) && !string.Equals(site, SiteId, StringComparison.OrdinalIgnoreCase))
            return false;

        if (string.Equals(app, AppId, StringComparison.OrdinalIgnoreCase)
            || string.Equals(product, SiteId, StringComparison.OrdinalIgnoreCase)
            || string.Equals(site, SiteId, StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }

    private static string? GetMeta(IReadOnlyDictionary<string, string>? metadata, string key)
    {
        if (metadata == null) return null;
        if (!metadata.TryGetValue(key, out var value)) return null;
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
