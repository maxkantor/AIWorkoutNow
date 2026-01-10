namespace AIWorkoutNow.Api.Models;

public class AnalyticsData
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Period { get; set; } = "day"; // day, week, month
    public List<TimeSeriesPoint> TimeSeries { get; set; } = new();
    public EventMetrics Events { get; set; } = new();
    public UserMetrics Users { get; set; } = new();
    public RevenueMetrics Revenue { get; set; } = new();
    public ConversionMetrics Conversion { get; set; } = new();
}

public class TimeSeriesPoint
{
    public string Date { get; set; } = string.Empty;
    public int WorkoutsGenerated { get; set; }
    public int TokenPurchases { get; set; }
    public int ContactSubmissions { get; set; }
    public int UniqueUsers { get; set; }
    public decimal Revenue { get; set; }
}

public class EventMetrics
{
    public int TotalWorkoutsGenerated { get; set; }
    public int TotalTokenPurchases { get; set; }
    public int TotalContactSubmissions { get; set; }
    public int TotalTokenResets { get; set; }
    public Dictionary<string, int> EventsByType { get; set; } = new();
}

public class UserMetrics
{
    public int TotalUsers { get; set; }
    public int NewUsers { get; set; }
    public int ReturningUsers { get; set; }
    public int FreeUsers { get; set; }
    public int PaidUsers { get; set; }
    public double AverageWorkoutsPerUser { get; set; }
    public double AverageRevenuePerUser { get; set; }
}

public class RevenueMetrics
{
    public decimal TotalRevenue { get; set; }
    public decimal AverageOrderValue { get; set; }
    public int TotalTransactions { get; set; }
    public Dictionary<string, decimal> RevenueByPlan { get; set; } = new();
}

public class ConversionMetrics
{
    public double FreeToPaidConversionRate { get; set; }
    public int FreeUsersConverted { get; set; }
    public int FreeUsersNotConverted { get; set; }
    public double AverageTimeToConvert { get; set; } // in days
}

