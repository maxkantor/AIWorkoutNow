using Microsoft.AspNetCore.Http;
using AIWorkoutNow.Api.Services;

namespace AIWorkoutNow.Api.Middleware;

/// <summary>
/// Classifies each request as HUMAN, BOT, or UNKNOWN and stores result in HttpContext.Items
/// so write paths can skip persistence for non-HUMAN traffic.
/// </summary>
public sealed class TrafficClassificationMiddleware
{
    public const string ItemKeyType = "TrafficType";
    public const string ItemKeyReason = "TrafficClassificationReason";
    public const string ItemKeyIpPrefix = "TrafficClassificationIpPrefix";
    public const string ItemKeyUserAgentShort = "TrafficClassificationUserAgentShort";
    public const string ItemKeyPath = "TrafficClassificationPath";
    public const string ItemKeyRateLimitExceeded = "RateLimitExceeded";

    private readonly RequestDelegate _next;
    private readonly TrafficClassifier _classifier;
    private readonly WriteRateLimiter? _rateLimiter;

    public TrafficClassificationMiddleware(RequestDelegate next, TrafficClassifier classifier, WriteRateLimiter? rateLimiter = null)
    {
        _next = next;
        _classifier = classifier;
        _rateLimiter = rateLimiter;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        string? ip = null;
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) && !string.IsNullOrEmpty(xff.ToString()))
        {
            var first = xff.ToString().Split(',').FirstOrDefault()?.Trim();
            ip = first;
        }
        ip ??= context.Connection.RemoteIpAddress?.ToString();

        context.Request.Headers.TryGetValue("User-Agent", out var uaHeader);
        var userAgent = uaHeader.ToString();

        var path = context.Request.Path.Value ?? "";

        // Webhook and payment callback paths: treat as HUMAN so we never skip purchase/auth writes
        if (path.IndexOf("webhook", StringComparison.OrdinalIgnoreCase) >= 0 ||
            path.IndexOf("stripe-webhook", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            context.Items[ItemKeyType] = TrafficType.HUMAN;
            context.Items[ItemKeyReason] = "webhook_path";
            context.Items[ItemKeyIpPrefix] = GetIpPrefix(ip ?? "");
            context.Items[ItemKeyUserAgentShort] = Truncate(userAgent, 80);
            context.Items[ItemKeyPath] = path;
            await _next(context);
            return;
        }

        var result = _classifier.Classify(ip, userAgent);
        context.Items[ItemKeyType] = result.TrafficType;
        context.Items[ItemKeyReason] = result.Reason;
        var ipPrefix = GetIpPrefix(ip ?? "");
        context.Items[ItemKeyIpPrefix] = ipPrefix;
        context.Items[ItemKeyUserAgentShort] = Truncate(userAgent, 80);
        context.Items[ItemKeyPath] = path;

        if (result.IsHuman && _rateLimiter != null && !_rateLimiter.TryAcquire(ipPrefix, userAgent))
            context.Items[ItemKeyRateLimitExceeded] = true;

        await _next(context);
    }

    private static string GetIpPrefix(string ip)
    {
        if (string.IsNullOrEmpty(ip)) return "";
        var parts = ip.Split('.');
        if (parts.Length >= 2) return $"{parts[0]}.{parts[1]}.";
        return ip;
    }

    private static string Truncate(string s, int maxLen)
    {
        if (string.IsNullOrEmpty(s)) return "";
        return s.Length <= maxLen ? s : s.Substring(0, maxLen) + "...";
    }
}
