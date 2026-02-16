using Xunit;
using AIWorkoutNow.Api.Services;

namespace AIWorkoutNow.Api.Tests;

public class TrafficClassifierTests
{
    private readonly TrafficClassifier _classifier = new TrafficClassifier();

    [Fact]
    public void Googlebot_UserAgent_ReturnsBot()
    {
        var result = _classifier.Classify("192.168.1.1", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
        Assert.Equal(TrafficType.BOT, result.TrafficType);
        Assert.True(result.Reason.Contains("ua:", StringComparison.OrdinalIgnoreCase) || result.Reason.Contains("googlebot", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Ip_66_249_ReturnsBot()
    {
        var result = _classifier.Classify("66.249.66.1", "Some Agent");
        Assert.Equal(TrafficType.BOT, result.TrafficType);
    }

    [Fact]
    public void NormalChrome_NonCloudIp_ReturnsHuman()
    {
        var result = _classifier.Classify("192.168.1.100", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        Assert.Equal(TrafficType.HUMAN, result.TrafficType);
        Assert.Equal("ok", result.Reason);
    }

    [Fact]
    public void EmptyIpAndUserAgent_ReturnsUnknown()
    {
        var result = _classifier.Classify(null, null);
        Assert.Equal(TrafficType.UNKNOWN, result.TrafficType);
    }

    [Fact]
    public void Crawler_UserAgent_ReturnsBot()
    {
        var result = _classifier.Classify("10.0.0.1", "crawler/1.0");
        Assert.Equal(TrafficType.BOT, result.TrafficType);
    }

    [Fact]
    public void Ip_34_Prefix_ReturnsBot()
    {
        var result = _classifier.Classify("34.100.50.1", "Custom Client");
        Assert.Equal(TrafficType.BOT, result.TrafficType);
    }
}
