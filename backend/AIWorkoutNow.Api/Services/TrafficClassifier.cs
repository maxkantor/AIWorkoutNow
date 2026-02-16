namespace AIWorkoutNow.Api.Services;

/// <summary>
/// Classifies request traffic as HUMAN, BOT, or UNKNOWN to avoid persisting bot/proxy traffic.
/// Used before any user/session/usage DB writes.
/// </summary>
public sealed class TrafficClassifier
{
    /// <summary>User-Agent substrings that indicate bot/crawler (case-insensitive). Kept in one place for editing.</summary>
    private static readonly string[] BotUserAgentPatterns =
    {
        "bot", "crawler", "spider", "googlebot", "adsbot", "apis-google", "headless", "lighthouse",
        "bingbot", "yandex", "duckduckbot", "facebookexternalhit", "slackbot", "twitterbot"
    };

    /// <summary>IP prefix ranges (first two octets) for known proxy/cloud/crawler origins. Kept in one place for editing.</summary>
    private static readonly string[] BotIpPrefixes =
    {
        "66.249.",   // Google
        "72.14.",    // Google
        "74.125.",   // Google
        "64.233.",   // Google
        "34.",       // GCP
        "35."        // GCP
    };

    public TrafficClassificationResult Classify(string? ipAddress, string? userAgent)
    {
        var ip = (ipAddress ?? "").Trim();
        var ua = (userAgent ?? "").Trim();

        // No headers or empty => UNKNOWN
        if (string.IsNullOrEmpty(ip) && string.IsNullOrEmpty(ua))
        {
            return new TrafficClassificationResult(TrafficType.UNKNOWN, "no_ip_or_user_agent");
        }

        // User-Agent bot patterns (case-insensitive)
        var uaLower = ua.ToLowerInvariant();
        foreach (var pattern in BotUserAgentPatterns)
        {
            if (uaLower.Contains(pattern.ToLowerInvariant()))
            {
                return new TrafficClassificationResult(TrafficType.BOT, $"ua:{pattern}");
            }
        }

        // IP in known bot/proxy ranges (first two octets)
        var ipPrefix = GetIpPrefix(ip);
        if (!string.IsNullOrEmpty(ipPrefix))
        {
            foreach (var prefix in BotIpPrefixes)
            {
                if (ipPrefix.StartsWith(prefix, StringComparison.Ordinal))
                {
                    return new TrafficClassificationResult(TrafficType.BOT, $"ip:{ipPrefix}");
                }
            }
        }

        // Suspicious: has IP but no or very short UA
        if (!string.IsNullOrEmpty(ip) && ua.Length < 10)
        {
            return new TrafficClassificationResult(TrafficType.UNKNOWN, "short_or_missing_ua");
        }

        return new TrafficClassificationResult(TrafficType.HUMAN, "ok");
    }

    private static string GetIpPrefix(string ip)
    {
        if (string.IsNullOrEmpty(ip)) return string.Empty;
        // Take first two octets for IPv4 (e.g. 66.249)
        var parts = ip.Split('.');
        if (parts.Length >= 2)
            return $"{parts[0]}.{parts[1]}.";
        return ip;
    }
}

public enum TrafficType
{
    HUMAN,
    BOT,
    UNKNOWN
}

public sealed class TrafficClassificationResult
{
    public TrafficType TrafficType { get; }
    public string Reason { get; }

    public TrafficClassificationResult(TrafficType trafficType, string reason)
    {
        TrafficType = trafficType;
        Reason = reason ?? "";
    }

    public bool IsHuman => TrafficType == TrafficType.HUMAN;
}
