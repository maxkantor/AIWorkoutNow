using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;
using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public class DynamoDBService : IDynamoDBService
{
    private readonly IAmazonDynamoDB _dynamoDB;
    private readonly DynamoDBContext _context;
    private readonly string _workoutsTable = "AIWorkoutNow-Workouts";
    private readonly string _anonymousUsageTable = "AIWorkoutNow-AnonymousUsage";
    private readonly string _userTokensTable = "AIWorkoutNow-UserTokens";
    private readonly string _progressLogsTable = "AIWorkoutNow-ProgressLogs";
    private readonly string _adminUsersTable = "AIWorkoutNow-AdminUsers";
    private readonly string _contactMessagesTable = "AIWorkoutNow-ContactMessages";

    public DynamoDBService(IAmazonDynamoDB dynamoDB)
    {
        _dynamoDB = dynamoDB;
        _context = new DynamoDBContext(_dynamoDB);
    }

    public async Task SaveWorkoutAsync(Workout workout)
    {
        var document = new Document();
        document["WorkoutId"] = workout.WorkoutId;
        document["Hash"] = workout.Hash;
        document["Content"] = System.Text.Json.JsonSerializer.Serialize(workout);
        document["CreatedAt"] = workout.CreatedAt.ToString("O");

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = _workoutsTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<Workout?> GetWorkoutAsync(string workoutId)
    {
        var response = await _dynamoDB.GetItemAsync(new GetItemRequest
        {
            TableName = _workoutsTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { "WorkoutId", new AttributeValue { S = workoutId } }
            }
        });

        if (!response.Item.ContainsKey("Content"))
            return null;

        var content = response.Item["Content"].S;
        return System.Text.Json.JsonSerializer.Deserialize<Workout>(content);
    }

    public async Task<AnonymousUsage?> GetAnonymousUsageAsync(string deviceId, string date)
    {
        var response = await _dynamoDB.GetItemAsync(new GetItemRequest
        {
            TableName = _anonymousUsageTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { "DeviceId", new AttributeValue { S = deviceId } },
                { "Date", new AttributeValue { S = date } }
            }
        });

        if (!response.Item.Any())
            return null;

        return new AnonymousUsage
        {
            DeviceId = response.Item["DeviceId"].S,
            Date = response.Item["Date"].S,
            Count = int.Parse(response.Item["Count"].N)
        };
    }

    public async Task IncrementAnonymousUsageAsync(string deviceId, string date)
    {
        await _dynamoDB.UpdateItemAsync(new UpdateItemRequest
        {
            TableName = _anonymousUsageTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { "DeviceId", new AttributeValue { S = deviceId } },
                { "Date", new AttributeValue { S = date } }
            },
            UpdateExpression = "ADD #count :inc",
            ExpressionAttributeNames = new Dictionary<string, string>
            {
                { "#count", "Count" }
            },
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":inc", new AttributeValue { N = "1" } }
            }
        });
    }

    public async Task SaveUserTokensAsync(UserTokens tokens)
    {
        var document = new Document();
        document["DeviceId"] = tokens.DeviceId;
        document["TokensRemaining"] = tokens.TokensRemaining;
        document["ExpiresAt"] = tokens.ExpiresAt?.ToString("O");

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = _userTokensTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<UserTokens?> GetUserTokensAsync(string deviceId)
    {
        var response = await _dynamoDB.GetItemAsync(new GetItemRequest
        {
            TableName = _userTokensTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { "DeviceId", new AttributeValue { S = deviceId } }
            }
        });

        if (!response.Item.Any())
            return null;

        var tokens = new UserTokens
        {
            DeviceId = response.Item["DeviceId"].S,
            TokensRemaining = int.Parse(response.Item["TokensRemaining"].N)
        };

        if (response.Item.ContainsKey("ExpiresAt"))
        {
            tokens.ExpiresAt = DateTime.Parse(response.Item["ExpiresAt"].S);
        }

        return tokens;
    }

    public async Task SaveProgressLogAsync(ProgressLog log)
    {
        var document = new Document();
        document["DeviceId"] = log.DeviceId;
        document["Timestamp"] = log.Timestamp;
        document["WorkoutId"] = log.WorkoutId;
        if (log.Metrics != null)
        {
            document["Metrics"] = System.Text.Json.JsonSerializer.Serialize(log.Metrics);
        }

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = _progressLogsTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<List<ProgressLog>> GetProgressLogsAsync(string deviceId)
    {
        // Implementation for querying progress logs by deviceId
        // This would use Query operation with GSI if needed
        return new List<ProgressLog>();
    }

    public async Task SaveAdminUserAsync(AdminUser admin)
    {
        var document = new Document();
        document["AdminId"] = admin.AdminId;
        document["Email"] = admin.Email;
        document["PasswordHash"] = admin.PasswordHash;
        document["Role"] = admin.Role;
        document["CreatedAt"] = admin.CreatedAt.ToString("O");

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = _adminUsersTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<AdminUser?> GetAdminUserAsync(string email)
    {
        // Note: This assumes a GSI on Email field
        // For simplicity, we'll scan (not recommended for production)
        var response = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _adminUsersTable,
            FilterExpression = "Email = :email",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":email", new AttributeValue { S = email } }
            }
        });

        if (response.Items.Count == 0)
            return null;

        var item = response.Items[0];
        return new AdminUser
        {
            AdminId = item["AdminId"].S,
            Email = item["Email"].S,
            PasswordHash = item["PasswordHash"].S,
            Role = item["Role"].S,
            CreatedAt = DateTime.Parse(item["CreatedAt"].S)
        };
    }

    public async Task SaveContactMessageAsync(ContactMessage message)
    {
        var document = new Document();
        document["MessageId"] = message.MessageId;
        document["Email"] = message.Email;
        document["Message"] = message.Message;
        document["CreatedAt"] = message.CreatedAt.ToString("O");

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = _contactMessagesTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<AdminStats> GetAdminStatsAsync()
    {
        // This is a simplified version - in production, use CloudWatch metrics or pre-aggregated data
        var stats = new AdminStats();

        // Count unique device IDs in anonymous usage (free users)
        var freeUsersResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _anonymousUsageTable,
            Select = Select.COUNT
        });
        stats.FreeUsers = freeUsersResponse.Count;

        // Count unique device IDs in user tokens (paid users)
        var paidUsersResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _userTokensTable,
            Select = Select.COUNT
        });
        stats.PaidUsers = paidUsersResponse.Count;

        // Count total workouts
        var workoutsResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _workoutsTable,
            Select = Select.COUNT
        });
        stats.TotalWorkouts = workoutsResponse.Count;

        // Token purchases would be tracked separately (e.g., via Stripe webhooks)
        stats.TokenPurchases = 0;

        return stats;
    }
}

