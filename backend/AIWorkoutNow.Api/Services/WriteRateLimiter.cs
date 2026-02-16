using System.Collections.Concurrent;

namespace AIWorkoutNow.Api.Services;

/// <summary>
/// Lightweight in-memory (per Lambda container) rate limiter for write attempts.
/// Key = ipPrefix + userAgent hash; allows max N write-attempts per minute.
/// If exceeded, callers should still return success but skip heavy downstream work.
/// </summary>
public sealed class WriteRateLimiter
{
    private const int DefaultMaxWritesPerMinute = 60;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private readonly int _maxPerMinute;
    private readonly ConcurrentDictionary<string, WindowCount> _windows = new();

    public WriteRateLimiter(int maxWritesPerMinute = DefaultMaxWritesPerMinute)
    {
        _maxPerMinute = maxWritesPerMinute;
    }

    /// <summary>Returns true if the request is within limit; false if over limit (caller should skip heavy work).</summary>
    public bool TryAcquire(string ipPrefix, string? userAgent)
    {
        var key = $"{ipPrefix}|{(userAgent ?? "").GetHashCode()}";
        var now = DateTime.UtcNow;
        var w = _windows.AddOrUpdate(key,
            _ => new WindowCount(now, 1),
            (_, existing) =>
            {
                if (now - existing.Start > Window)
                    return new WindowCount(now, 1);
                return new WindowCount(existing.Start, existing.Count + 1);
            });
        PruneOld(key, now);
        return w.Count <= _maxPerMinute;
    }

    private void PruneOld(string currentKey, DateTime now)
    {
        try
        {
            foreach (var k in _windows.Keys.ToList())
            {
                if (k == currentKey) continue;
                if (_windows.TryGetValue(k, out var w) && now - w.Start > Window)
                    _windows.TryRemove(k, out _);
            }
        }
        catch
        {
            // best-effort cleanup
        }
    }

    private sealed class WindowCount
    {
        public readonly DateTime Start;
        public readonly int Count;
        public WindowCount(DateTime start, int count) { Start = start; Count = count; }
    }
}
