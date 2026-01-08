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
    private readonly string _workoutsTable;
    private readonly string _anonymousUsageTable;
    private readonly string _userTokensTable;
    private readonly string _progressLogsTable;
    private readonly string _adminUsersTable;
    private readonly string _contactMessagesTable;

    public DynamoDBService(IAmazonDynamoDB dynamoDB)
    {
        _dynamoDB = dynamoDB;
        _context = new DynamoDBContext(_dynamoDB);
        
        // Get table prefix from environment variable or use default
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        
        _workoutsTable = Environment.GetEnvironmentVariable("WORKOUTS_TABLE") ?? $"{tablePrefix}-Workouts";
        _anonymousUsageTable = Environment.GetEnvironmentVariable("ANONYMOUS_USAGE_TABLE") ?? $"{tablePrefix}-AnonymousUsage";
        _userTokensTable = Environment.GetEnvironmentVariable("USER_TOKENS_TABLE") ?? $"{tablePrefix}-UserTokens";
        _progressLogsTable = Environment.GetEnvironmentVariable("PROGRESS_LOGS_TABLE") ?? $"{tablePrefix}-ProgressLogs";
        _adminUsersTable = Environment.GetEnvironmentVariable("ADMIN_USERS_TABLE") ?? $"{tablePrefix}-AdminUsers";
        _contactMessagesTable = Environment.GetEnvironmentVariable("CONTACT_MESSAGES_TABLE") ?? $"{tablePrefix}-ContactMessages";
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

        // Count token purchases from Stripe purchases table
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var purchasesTable = $"{tablePrefix}-StripePurchases";
        try
        {
            var purchasesResponse = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = purchasesTable,
                Select = Select.COUNT
            });
            stats.TokenPurchases = purchasesResponse.Count;
        }
        catch
        {
            stats.TokenPurchases = 0;
        }

        return stats;
    }

    // CRM Methods
    public async Task<List<ContactMessage>> GetAllContactMessagesAsync()
    {
        var response = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _contactMessagesTable
        });

        return response.Items.Select(item => new ContactMessage
        {
            MessageId = item["MessageId"].S,
            Email = item["Email"].S,
            Message = item["Message"].S,
            CreatedAt = DateTime.Parse(item["CreatedAt"].S)
        }).OrderByDescending(m => m.CreatedAt).ToList();
    }

    public async Task<ContactMessage?> GetContactMessageAsync(string messageId)
    {
        var response = await _dynamoDB.GetItemAsync(new GetItemRequest
        {
            TableName = _contactMessagesTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { "MessageId", new AttributeValue { S = messageId } }
            }
        });

        if (!response.Item.Any())
            return null;

        return new ContactMessage
        {
            MessageId = response.Item["MessageId"].S,
            Email = response.Item["Email"].S,
            Message = response.Item["Message"].S,
            CreatedAt = DateTime.Parse(response.Item["CreatedAt"].S)
        };
    }

    public async Task SaveContactReplyAsync(ContactReply reply)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var repliesTable = $"{tablePrefix}-ContactReplies";
        
        var document = new Document();
        document["ReplyId"] = reply.ReplyId;
        document["MessageId"] = reply.MessageId;
        document["AdminId"] = reply.AdminId;
        document["ReplyText"] = reply.ReplyText;
        document["CreatedAt"] = reply.CreatedAt.ToString("O");
        document["Sent"] = reply.Sent;

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = repliesTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<List<ContactReply>> GetContactRepliesAsync(string messageId)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var repliesTable = $"{tablePrefix}-ContactReplies";
        
        var response = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = repliesTable,
            FilterExpression = "MessageId = :msgId",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":msgId", new AttributeValue { S = messageId } }
            }
        });

        return response.Items.Select(item => new ContactReply
        {
            ReplyId = item["ReplyId"].S,
            MessageId = item["MessageId"].S,
            AdminId = item["AdminId"].S,
            ReplyText = item["ReplyText"].S,
            CreatedAt = DateTime.Parse(item["CreatedAt"].S),
            Sent = item.ContainsKey("Sent") && item["Sent"].BOOL
        }).OrderBy(r => r.CreatedAt).ToList();
    }

    public async Task SaveStripePurchaseAsync(StripePurchase purchase)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var purchasesTable = $"{tablePrefix}-StripePurchases";
        
        var document = new Document();
        document["PurchaseId"] = purchase.PurchaseId;
        document["DeviceId"] = purchase.DeviceId;
        document["StripeCustomerId"] = purchase.StripeCustomerId;
        document["StripePaymentIntentId"] = purchase.StripePaymentIntentId;
        document["StripeSessionId"] = purchase.StripeSessionId;
        document["PackType"] = purchase.PackType;
        document["Amount"] = purchase.Amount.ToString("F2");
        document["Currency"] = purchase.Currency;
        document["TokensPurchased"] = purchase.TokensPurchased;
        document["Status"] = purchase.Status;
        document["CreatedAt"] = purchase.CreatedAt.ToString("O");
        if (purchase.CompletedAt.HasValue)
            document["CompletedAt"] = purchase.CompletedAt.Value.ToString("O");
        if (!string.IsNullOrEmpty(purchase.CustomerEmail))
            document["CustomerEmail"] = purchase.CustomerEmail;
        if (!string.IsNullOrEmpty(purchase.CustomerName))
            document["CustomerName"] = purchase.CustomerName;

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = purchasesTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<List<StripePurchase>> GetAllStripePurchasesAsync()
    {
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            
            var response = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = purchasesTable
            });

            // Convert UserPurchase to StripePurchase format for admin
            var purchases = new List<StripePurchase>();
            foreach (var item in response.Items)
            {
                // Get plan details to determine amount
                var planId = item["PlanId"].S;
                var plan = await GetPricingPlanAsync(planId);
                var amount = plan?.Price ?? 0;
                var currency = plan?.Currency ?? "USD";
                
                purchases.Add(new StripePurchase
                {
                    PurchaseId = item["PurchaseId"].S,
                    DeviceId = item["DeviceId"].S,
                    StripeCustomerId = "", // Not stored in UserPurchase
                    StripePaymentIntentId = item.ContainsKey("StripePaymentIntentId") ? item["StripePaymentIntentId"].S : "",
                    StripeSessionId = item["StripeSessionId"].S,
                    PackType = plan?.Name ?? planId,
                    Amount = amount,
                    Currency = currency,
                    TokensPurchased = item.ContainsKey("TokensGranted") && item["TokensGranted"].N != null 
                        ? int.Parse(item["TokensGranted"].N) 
                        : (item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL ? 999999 : 0),
                    Status = item["Status"].S,
                    CreatedAt = DateTime.Parse(item["PurchasedAt"].S),
                    CompletedAt = item["Status"].S == "completed" ? DateTime.Parse(item["PurchasedAt"].S) : null,
                    CustomerEmail = null, // Not stored in UserPurchase
                    CustomerName = null // Not stored in UserPurchase
                });
            }
            
            return purchases.OrderByDescending(p => p.CreatedAt).ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] UserPurchases table does not exist, returning empty list");
            return new List<StripePurchase>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting all purchases: {ex.Message}");
            return new List<StripePurchase>();
        }
    }

    public async Task<List<StripePurchase>> GetPurchasesByDeviceIdAsync(string deviceId)
    {
        try
        {
            var userPurchases = await GetUserPurchasesAsync(deviceId);
            
            // Convert UserPurchase to StripePurchase format for admin
            var purchases = new List<StripePurchase>();
            foreach (var userPurchase in userPurchases)
            {
                // Get plan details to determine amount
                var plan = await GetPricingPlanAsync(userPurchase.PlanId);
                var amount = plan?.Price ?? 0;
                var currency = plan?.Currency ?? "USD";
                
                purchases.Add(new StripePurchase
                {
                    PurchaseId = userPurchase.PurchaseId,
                    DeviceId = userPurchase.DeviceId,
                    StripeCustomerId = "", // Not stored in UserPurchase
                    StripePaymentIntentId = userPurchase.StripePaymentIntentId,
                    StripeSessionId = userPurchase.StripeSessionId,
                    PackType = plan?.Name ?? userPurchase.PlanId,
                    Amount = amount,
                    Currency = currency,
                    TokensPurchased = userPurchase.TokensGranted ?? (userPurchase.IsUnlimited ? 999999 : 0),
                    Status = userPurchase.Status,
                    CreatedAt = userPurchase.PurchasedAt,
                    CompletedAt = userPurchase.Status == "completed" ? userPurchase.PurchasedAt : null,
                    CustomerEmail = null, // Not stored in UserPurchase
                    CustomerName = null // Not stored in UserPurchase
                });
            }
            
            return purchases.OrderByDescending(p => p.CreatedAt).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting purchases by device ID: {ex.Message}");
            return new List<StripePurchase>();
        }
    }

    public async Task SaveCustomerActivityAsync(CustomerActivity activity)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var activitiesTable = $"{tablePrefix}-CustomerActivities";
        
        var document = new Document();
        document["ActivityId"] = activity.ActivityId;
        document["DeviceId"] = activity.DeviceId;
        document["ActivityType"] = activity.ActivityType;
        document["Description"] = activity.Description;
        document["Timestamp"] = activity.Timestamp.ToString("O");
        if (!string.IsNullOrEmpty(activity.WorkoutId))
            document["WorkoutId"] = activity.WorkoutId;
        if (!string.IsNullOrEmpty(activity.PurchaseId))
            document["PurchaseId"] = activity.PurchaseId;
        if (!string.IsNullOrEmpty(activity.ContactMessageId))
            document["ContactMessageId"] = activity.ContactMessageId;

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = activitiesTable,
            Item = document.ToAttributeMap()
        });
    }

    public async Task<List<CustomerActivity>> GetCustomerActivitiesAsync(string deviceId, int limit = 50)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var activitiesTable = $"{tablePrefix}-CustomerActivities";
        
        var response = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = activitiesTable,
            FilterExpression = "DeviceId = :deviceId",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":deviceId", new AttributeValue { S = deviceId } }
            }
        });

        return response.Items.Select(item => new CustomerActivity
        {
            ActivityId = item["ActivityId"].S,
            DeviceId = item["DeviceId"].S,
            ActivityType = item["ActivityType"].S,
            Description = item["Description"].S,
            Timestamp = DateTime.Parse(item["Timestamp"].S),
            WorkoutId = item.ContainsKey("WorkoutId") ? item["WorkoutId"].S : null,
            PurchaseId = item.ContainsKey("PurchaseId") ? item["PurchaseId"].S : null,
            ContactMessageId = item.ContainsKey("ContactMessageId") ? item["ContactMessageId"].S : null
        }).OrderByDescending(a => a.Timestamp).Take(limit).ToList();
    }

    public async Task<List<CustomerActivity>> GetAllActivitiesAsync(int limit = 100)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var activitiesTable = $"{tablePrefix}-CustomerActivities";
        
        var response = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = activitiesTable
        });

        return response.Items.Select(item => new CustomerActivity
        {
            ActivityId = item["ActivityId"].S,
            DeviceId = item["DeviceId"].S,
            ActivityType = item["ActivityType"].S,
            Description = item["Description"].S,
            Timestamp = DateTime.Parse(item["Timestamp"].S),
            WorkoutId = item.ContainsKey("WorkoutId") ? item["WorkoutId"].S : null,
            PurchaseId = item.ContainsKey("PurchaseId") ? item["PurchaseId"].S : null,
            ContactMessageId = item.ContainsKey("ContactMessageId") ? item["ContactMessageId"].S : null
        }).OrderByDescending(a => a.Timestamp).Take(limit).ToList();
    }

    public async Task<List<CustomerSummary>> GetAllCustomersAsync()
    {
        var customers = new Dictionary<string, CustomerSummary>();
        
        // Get all device IDs from anonymous usage
        var freeUsersResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _anonymousUsageTable
        });
        
        foreach (var item in freeUsersResponse.Items)
        {
            var deviceId = item["DeviceId"].S;
            if (!customers.ContainsKey(deviceId))
            {
                customers[deviceId] = new CustomerSummary
                {
                    DeviceId = deviceId,
                    IsPaidUser = false,
                    TokensRemaining = 0,
                    TotalWorkouts = 0,
                    TotalPurchases = 0,
                    TotalSpent = 0
                };
            }
        }

        // Get all paid users
        var paidUsersResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _userTokensTable
        });
        
        foreach (var item in paidUsersResponse.Items)
        {
            var deviceId = item["DeviceId"].S;
            var tokensRemaining = int.Parse(item["TokensRemaining"].N);
            if (!customers.ContainsKey(deviceId))
            {
                customers[deviceId] = new CustomerSummary
                {
                    DeviceId = deviceId,
                    IsPaidUser = true,
                    TokensRemaining = tokensRemaining,
                    TotalWorkouts = 0,
                    TotalPurchases = 0,
                    TotalSpent = 0
                };
            }
            else
            {
                customers[deviceId].IsPaidUser = true;
                customers[deviceId].TokensRemaining = tokensRemaining;
            }
        }

        // Get workout counts per device
        var workoutsResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _workoutsTable
        });
        
        // Note: This is simplified - in production, you'd want to track deviceId in workouts
        // For now, we'll count total workouts

        // Get purchase data
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var purchasesTable = $"{tablePrefix}-StripePurchases";
        
        try
        {
            var purchasesResponse = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = purchasesTable
            });
            
            foreach (var item in purchasesResponse.Items)
            {
                var deviceId = item["DeviceId"].S;
                if (customers.ContainsKey(deviceId))
                {
                    customers[deviceId].TotalPurchases++;
                    customers[deviceId].TotalSpent += decimal.Parse(item["Amount"].S);
                    if (string.IsNullOrEmpty(customers[deviceId].Email) && item.ContainsKey("CustomerEmail"))
                        customers[deviceId].Email = item["CustomerEmail"].S;
                    if (string.IsNullOrEmpty(customers[deviceId].Name) && item.ContainsKey("CustomerName"))
                        customers[deviceId].Name = item["CustomerName"].S;
                }
            }
        }
        catch
        {
            // Table might not exist yet
        }

        return customers.Values.OrderByDescending(c => c.LastActivity ?? c.FirstSeen).ToList();
    }

    public async Task<CustomerSummary?> GetCustomerSummaryAsync(string deviceId)
    {
        var summary = new CustomerSummary
        {
            DeviceId = deviceId,
            IsPaidUser = false,
            TokensRemaining = 0,
            TotalWorkouts = 0,
            TotalPurchases = 0,
            TotalSpent = 0
        };

        // Check if paid user
        var tokens = await GetUserTokensAsync(deviceId);
        if (tokens != null)
        {
            summary.IsPaidUser = true;
            summary.TokensRemaining = tokens.TokensRemaining;
        }

        // Get purchases
        var purchases = await GetPurchasesByDeviceIdAsync(deviceId);
        summary.TotalPurchases = purchases.Count;
        summary.TotalSpent = purchases.Sum(p => p.Amount);
        if (purchases.Any())
        {
            summary.Email = purchases.First().CustomerEmail;
            summary.Name = purchases.First().CustomerName;
        }

        // Get activities
        var activities = await GetCustomerActivitiesAsync(deviceId, 10);
        summary.RecentActivities = activities;
        if (activities.Any())
        {
            summary.LastActivity = activities.First().Timestamp;
            summary.FirstSeen = activities.Last().Timestamp;
        }

        return summary;
    }

    public async Task ResetUserTokensAsync(string deviceId, int newTokenCount)
    {
        var tokens = await GetUserTokensAsync(deviceId);
        if (tokens == null)
        {
            tokens = new UserTokens
            {
                DeviceId = deviceId,
                TokensRemaining = newTokenCount
            };
        }
        else
        {
            tokens.TokensRemaining = newTokenCount;
        }

        await SaveUserTokensAsync(tokens);
        
        // Also reset free workout count so user sees updated status immediately
        // Delete all AnonymousUsage records for this device to reset free workout count
        try
        {
            var usageResponse = await _dynamoDB.QueryAsync(new QueryRequest
            {
                TableName = _anonymousUsageTable,
                KeyConditionExpression = "DeviceId = :deviceId",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":deviceId", new AttributeValue { S = deviceId } }
                }
            });

            // Delete all usage records
            foreach (var item in usageResponse.Items)
            {
                await _dynamoDB.DeleteItemAsync(new DeleteItemRequest
                {
                    TableName = _anonymousUsageTable,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "DeviceId", new AttributeValue { S = deviceId } },
                        { "Date", item["Date"] }
                    }
                });
            }
            
            Console.WriteLine($"[DynamoDBService] Reset free workout count for device {deviceId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error resetting free workout count: {ex.Message}");
            // Don't throw - tokens were reset successfully
        }
    }

    // Pricing Plan Methods
    public async Task SavePricingPlanAsync(PricingPlan plan)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var plansTable = $"{tablePrefix}-PricingPlans";
        
        var document = new Document();
        document["PlanId"] = plan.PlanId;
        document["Name"] = plan.Name;
        document["Price"] = plan.Price.ToString("F2");
        document["Currency"] = plan.Currency;
        if (plan.TokenCount.HasValue)
            document["TokenCount"] = plan.TokenCount.Value;
        document["IsUnlimited"] = plan.IsUnlimited;
        if (plan.UnlimitedDays.HasValue)
            document["UnlimitedDays"] = plan.UnlimitedDays.Value;
        document["DisplayOrder"] = plan.DisplayOrder;
        document["IsRecommended"] = plan.IsRecommended;
        if (!string.IsNullOrEmpty(plan.BadgeText))
            document["BadgeText"] = plan.BadgeText;
        if (!string.IsNullOrEmpty(plan.MicroCopy))
            document["MicroCopy"] = plan.MicroCopy;
        document["IsActive"] = plan.IsActive;
        document["StripePriceId"] = plan.StripePriceId;
        document["CreatedAt"] = plan.CreatedAt.ToString("O");
        if (plan.UpdatedAt.HasValue)
            document["UpdatedAt"] = plan.UpdatedAt.Value.ToString("O");

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = plansTable,
            Item = document.ToAttributeMap()
        });
        
        // Invalidate cache so next request will check the table
        lock (_tableExistenceLock)
        {
            _defaultPlansCache = null; // Clear default cache
            // Don't reset _pricingPlansTableExists - table exists if we're saving to it
            _pricingPlansTableExists = true;
        }
        Console.WriteLine("[DynamoDBService] Invalidated pricing plans cache after saving plan");
    }

    // Cache table existence state to avoid slow scans
    // NOTE: Only cache that table doesn't exist - always check if table exists (with fast Limit scan)
    private static bool? _pricingPlansTableExists = null;
    private static readonly object _tableExistenceLock = new object();
    // Cache default plans to avoid recreating them
    private static List<PricingPlan>? _defaultPlansCache = null;
    
    public async Task<List<PricingPlan>> GetAllPricingPlansAsync()
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var plansTable = $"{tablePrefix}-PricingPlans";
        
        // Check cached table existence - if we know it doesn't exist, return defaults immediately
        lock (_tableExistenceLock)
        {
            if (_pricingPlansTableExists == false)
            {
                Console.WriteLine($"[DynamoDBService] PricingPlans table known to not exist (cached), returning default plans immediately");
                if (_defaultPlansCache == null)
                {
                    _defaultPlansCache = GetDefaultPricingPlans();
                }
                return _defaultPlansCache;
            }
        }
        
        Console.WriteLine($"[DynamoDBService] Getting pricing plans from table: {plansTable}");
        
        // Try to scan table directly - if it fails, cache the result and return defaults
        try
        {
            var response = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = plansTable,
                Limit = 20 // Fast scan - we don't expect more than 20 pricing plans
            });

            // Table exists - cache this fact
            lock (_tableExistenceLock)
            {
                _pricingPlansTableExists = true;
            }

            Console.WriteLine($"[DynamoDBService] Found {response.Items.Count} pricing plans");

            // If table is empty, populate it with default plans and return them
            if (response.Items.Count == 0)
            {
                Console.WriteLine("[DynamoDBService] Table exists but is empty, populating with default plans...");
                try
                {
                    await CreateDefaultPricingPlansAsync(plansTable);
                    Console.WriteLine("[DynamoDBService] Successfully populated table with default plans");
                    
                    // Return the default plans we just created
                    var defaultPlans = GetDefaultPricingPlans();
                    return defaultPlans;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DynamoDBService] Failed to populate default plans: {ex.Message}");
                    // Fallback to returning defaults from code
                    if (_defaultPlansCache == null)
                    {
                        _defaultPlansCache = GetDefaultPricingPlans();
                    }
                    return _defaultPlansCache;
                }
            }

            var plans = new List<PricingPlan>();
            foreach (var item in response.Items)
            {
                try
                {
                    // Only include active plans
                    var isActive = item.ContainsKey("IsActive") ? item["IsActive"].BOOL : true;
                    if (!isActive) continue;

                    var plan = new PricingPlan
                    {
                        PlanId = item.ContainsKey("PlanId") ? item["PlanId"].S : Guid.NewGuid().ToString(),
                        Name = item.ContainsKey("Name") ? item["Name"].S : "Unknown",
                        Price = item.ContainsKey("Price") ? (item["Price"].N != null ? decimal.Parse(item["Price"].N) : decimal.Parse(item["Price"].S)) : 0,
                        Currency = item.ContainsKey("Currency") ? item["Currency"].S : "USD",
                        TokenCount = item.ContainsKey("TokenCount") && item["TokenCount"].N != null ? int.Parse(item["TokenCount"].N) : 0,
                        IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL,
                        UnlimitedDays = item.ContainsKey("UnlimitedDays") && item["UnlimitedDays"].N != null ? int.Parse(item["UnlimitedDays"].N) : null,
                        DisplayOrder = item.ContainsKey("DisplayOrder") && item["DisplayOrder"].N != null ? int.Parse(item["DisplayOrder"].N) : 0,
                        IsRecommended = item.ContainsKey("IsRecommended") && item["IsRecommended"].BOOL,
                        BadgeText = item.ContainsKey("BadgeText") ? item["BadgeText"].S : null,
                        MicroCopy = item.ContainsKey("MicroCopy") ? item["MicroCopy"].S : null,
                        IsActive = isActive,
                        StripePriceId = item.ContainsKey("StripePriceId") ? item["StripePriceId"].S : string.Empty,
                        CreatedAt = item.ContainsKey("CreatedAt") ? DateTime.Parse(item["CreatedAt"].S) : DateTime.UtcNow,
                        UpdatedAt = item.ContainsKey("UpdatedAt") ? DateTime.Parse(item["UpdatedAt"].S) : null
                    };
                    plans.Add(plan);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DynamoDBService] Error parsing pricing plan item: {ex.Message}");
                    // Skip this item and continue
                }
            }

            Console.WriteLine($"[DynamoDBService] Returning {plans.Count} active pricing plans");
            
            // AGGRESSIVE FIX: Always return at least default plans if result is empty
            if (plans.Count == 0)
            {
                Console.WriteLine("[DynamoDBService] No active plans found, returning default plans as fallback");
                var defaultPlans = GetDefaultPricingPlans();
                return defaultPlans;
            }
            
            return plans.OrderBy(p => p.DisplayOrder).ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            // Cache that table doesn't exist so we never scan again
            lock (_tableExistenceLock)
            {
                _pricingPlansTableExists = false;
            }
            Console.WriteLine("[DynamoDBService] PricingPlans table does not exist, returning default plans immediately (cached)");
            return GetDefaultPricingPlans();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting pricing plans: {ex.Message}");
            Console.WriteLine($"[DynamoDBService] Stack trace: {ex.StackTrace}");
            // On error, return defaults instead of throwing
            return GetDefaultPricingPlans();
        }
    }

    public async Task<PricingPlan?> GetPricingPlanAsync(string planId)
    {
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var plansTable = $"{tablePrefix}-PricingPlans";
            
            var response = await _dynamoDB.GetItemAsync(new GetItemRequest
            {
                TableName = plansTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "PlanId", new AttributeValue { S = planId } }
                }
            });

            if (response.Item.Any())
            {
                var item = response.Item;
                return new PricingPlan
        {
            PlanId = item["PlanId"].S,
            Name = item["Name"].S,
                    Price = item.ContainsKey("Price") ? (item["Price"].N != null ? decimal.Parse(item["Price"].N) : decimal.Parse(item["Price"].S)) : 0,
            Currency = item["Currency"].S,
            TokenCount = item.ContainsKey("TokenCount") ? int.Parse(item["TokenCount"].N) : null,
            IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL,
            UnlimitedDays = item.ContainsKey("UnlimitedDays") ? int.Parse(item["UnlimitedDays"].N) : null,
            DisplayOrder = int.Parse(item["DisplayOrder"].N),
            IsRecommended = item.ContainsKey("IsRecommended") && item["IsRecommended"].BOOL,
            BadgeText = item.ContainsKey("BadgeText") ? item["BadgeText"].S : null,
            MicroCopy = item.ContainsKey("MicroCopy") ? item["MicroCopy"].S : null,
            IsActive = item.ContainsKey("IsActive") ? item["IsActive"].BOOL : true,
            StripePriceId = item["StripePriceId"].S,
            CreatedAt = DateTime.Parse(item["CreatedAt"].S),
                    UpdatedAt = item.ContainsKey("UpdatedAt") ? DateTime.Parse(item["UpdatedAt"].S) : null
                };
            }
            
            // Plan not found in DB, check default plans
            Console.WriteLine($"[DynamoDBService] Plan {planId} not found in DB, checking default plans");
            var defaultPlans = GetDefaultPricingPlans();
            return defaultPlans.FirstOrDefault(p => p.PlanId == planId);
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] PricingPlans table does not exist, checking default plans for: {planId}");
            var defaultPlans = GetDefaultPricingPlans();
            return defaultPlans.FirstOrDefault(p => p.PlanId == planId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting pricing plan {planId}: {ex.Message}");
            // Fall back to default plans on any error
            var defaultPlans = GetDefaultPricingPlans();
            return defaultPlans.FirstOrDefault(p => p.PlanId == planId);
        }
    }

    public async Task DeletePricingPlanAsync(string planId)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var plansTable = $"{tablePrefix}-PricingPlans";
        
        await _dynamoDB.DeleteItemAsync(new DeleteItemRequest
        {
            TableName = plansTable,
            Key = new Dictionary<string, AttributeValue>
            {
                { "PlanId", new AttributeValue { S = planId } }
            }
        });
    }

    public async Task SaveUserPurchaseAsync(UserPurchase purchase)
    {
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            
            var document = new Document();
            document["PurchaseId"] = purchase.PurchaseId;
            document["DeviceId"] = purchase.DeviceId;
            document["PlanId"] = purchase.PlanId;
            document["StripeSessionId"] = purchase.StripeSessionId;
            document["StripePaymentIntentId"] = purchase.StripePaymentIntentId;
            document["Status"] = purchase.Status;
            document["PurchasedAt"] = purchase.PurchasedAt.ToString("O");
            if (purchase.ExpiresAt.HasValue)
                document["ExpiresAt"] = purchase.ExpiresAt.Value.ToString("O");
            if (purchase.TokensGranted.HasValue)
                document["TokensGranted"] = purchase.TokensGranted.Value;
            document["IsUnlimited"] = purchase.IsUnlimited;

            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = purchasesTable,
                Item = document.ToAttributeMap()
            });
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] UserPurchases table does not exist, cannot save purchase");
            // Don't throw - allow the request to continue
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error saving user purchase: {ex.Message}");
            // Don't throw - allow the request to continue
        }
    }

    public async Task<UserPurchase?> GetUserPurchaseAsync(string purchaseId)
    {
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            
            var response = await _dynamoDB.GetItemAsync(new GetItemRequest
            {
                TableName = purchasesTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "PurchaseId", new AttributeValue { S = purchaseId } }
                }
            });

            if (!response.Item.Any())
                return null;

            var item = response.Item;
            return new UserPurchase
            {
                PurchaseId = item["PurchaseId"].S,
                DeviceId = item["DeviceId"].S,
                PlanId = item["PlanId"].S,
                StripeSessionId = item["StripeSessionId"].S,
                StripePaymentIntentId = item.ContainsKey("StripePaymentIntentId") ? item["StripePaymentIntentId"].S : "",
                Status = item["Status"].S,
                PurchasedAt = DateTime.Parse(item["PurchasedAt"].S),
                ExpiresAt = item.ContainsKey("ExpiresAt") ? DateTime.Parse(item["ExpiresAt"].S) : null,
                TokensGranted = item.ContainsKey("TokensGranted") ? int.Parse(item["TokensGranted"].N) : null,
                IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL
            };
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] UserPurchases table does not exist");
            return null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting user purchase: {ex.Message}");
            return null;
        }
    }

    public async Task<List<UserPurchase>> GetAllUserPurchasesAsync()
    {
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            
            // Try to scan directly - if table doesn't exist, return empty immediately
            var response = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = purchasesTable,
                Limit = 1000 // Reasonable limit
            });

            if (response.Items.Count == 0)
                return new List<UserPurchase>();

            var purchases = new List<UserPurchase>();
            foreach (var item in response.Items)
            {
                try
                {
                    purchases.Add(new UserPurchase
                    {
                        PurchaseId = item["PurchaseId"].S,
                        DeviceId = item["DeviceId"].S,
                        PlanId = item["PlanId"].S,
                        StripeSessionId = item["StripeSessionId"].S,
                        StripePaymentIntentId = item.ContainsKey("StripePaymentIntentId") ? item["StripePaymentIntentId"].S : "",
                        Status = item["Status"].S,
                        PurchasedAt = DateTime.Parse(item["PurchasedAt"].S),
                        ExpiresAt = item.ContainsKey("ExpiresAt") ? DateTime.Parse(item["ExpiresAt"].S) : null,
                        TokensGranted = item.ContainsKey("TokensGranted") ? int.Parse(item["TokensGranted"].N) : null,
                        IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DynamoDBService] Error parsing purchase item: {ex.Message}");
                }
            }

            return purchases.OrderByDescending(p => p.PurchasedAt).ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] UserPurchases table does not exist, returning empty list immediately");
            return new List<UserPurchase>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting all user purchases: {ex.Message}");
            return new List<UserPurchase>();
        }
    }

    public async Task<List<UserPurchase>> GetUserPurchasesByDeviceIdAsync(string deviceId)
    {
        return await GetUserPurchasesAsync(deviceId);
    }

    public async Task<List<UserPurchase>> GetUserPurchasesAsync(string deviceId)
    {
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            
            // Try to scan directly - if table doesn't exist, return empty immediately
            var response = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = purchasesTable,
                FilterExpression = "DeviceId = :deviceId",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":deviceId", new AttributeValue { S = deviceId } }
                }
            });

            return response.Items.Select(item => new UserPurchase
            {
                PurchaseId = item["PurchaseId"].S,
                DeviceId = item["DeviceId"].S,
                PlanId = item["PlanId"].S,
                StripeSessionId = item["StripeSessionId"].S,
                StripePaymentIntentId = item.ContainsKey("StripePaymentIntentId") ? item["StripePaymentIntentId"].S : "",
                Status = item["Status"].S,
                PurchasedAt = DateTime.Parse(item["PurchasedAt"].S),
                ExpiresAt = item.ContainsKey("ExpiresAt") ? DateTime.Parse(item["ExpiresAt"].S) : null,
                TokensGranted = item.ContainsKey("TokensGranted") ? int.Parse(item["TokensGranted"].N) : null,
                IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL
            }).OrderByDescending(p => p.PurchasedAt).ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] UserPurchases table does not exist, returning empty list immediately");
            return new List<UserPurchase>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting user purchases: {ex.Message}");
            return new List<UserPurchase>();
        }
    }

    public async Task<UserPurchase?> GetActiveUnlimitedPurchaseAsync(string deviceId)
    {
        var purchases = await GetUserPurchasesAsync(deviceId);
        var now = DateTime.UtcNow;
        
            return purchases.FirstOrDefault(p => 
            p.IsUnlimited && 
            p.Status == "completed" && 
            (p.ExpiresAt == null || p.ExpiresAt > now));
    }

    public async Task<int> GetTotalFreeWorkoutsAsync(string deviceId)
    {
        // Count total workouts generated by this device
        // We'll track this via anonymous usage across all dates
        var response = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _anonymousUsageTable,
            FilterExpression = "DeviceId = :deviceId",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":deviceId", new AttributeValue { S = deviceId } }
            }
        });

        // Sum up all counts across all dates
        int total = 0;
        foreach (var item in response.Items)
        {
            if (item.ContainsKey("Count"))
            {
                total += int.Parse(item["Count"].N);
            }
        }

        return total;
    }

    private List<PricingPlan> GetDefaultPricingPlans()
    {
        return new List<PricingPlan>
        {
            new PricingPlan
            {
                PlanId = "default-starter-boost",
                Name = "Starter Boost",
                Price = 1.99m,
                Currency = "USD",
                TokenCount = 10,
                IsUnlimited = false,
                DisplayOrder = 1,
                IsRecommended = true,
                BadgeText = "⭐ Most Popular",
                MicroCopy = "Perfect to get started.",
                IsActive = true,
                StripePriceId = string.Empty,
                CreatedAt = DateTime.UtcNow
            },
            new PricingPlan
            {
                PlanId = "default-regular-trainer",
                Name = "Regular Trainer",
                Price = 3.99m,
                Currency = "USD",
                TokenCount = 30,
                IsUnlimited = false,
                DisplayOrder = 2,
                IsRecommended = false,
                MicroCopy = "Best value for consistent training.",
                IsActive = true,
                StripePriceId = string.Empty,
                CreatedAt = DateTime.UtcNow
            },
            new PricingPlan
            {
                PlanId = "default-power-user",
                Name = "Power User",
                Price = 5.99m,
                Currency = "USD",
                TokenCount = 70,
                IsUnlimited = false,
                DisplayOrder = 3,
                IsRecommended = false,
                MicroCopy = "Train hard, pay less per workout.",
                IsActive = true,
                StripePriceId = string.Empty,
                CreatedAt = DateTime.UtcNow
            },
            new PricingPlan
            {
                PlanId = "default-unlimited-access",
                Name = "Unlimited Access",
                Price = 9.99m,
                Currency = "USD",
                TokenCount = 0,
                IsUnlimited = true,
                UnlimitedDays = 365, // 1 year
                DisplayOrder = 4,
                IsRecommended = false,
                MicroCopy = "Unlimited workouts. No recurring charges.",
                IsActive = true,
                StripePriceId = string.Empty,
                CreatedAt = DateTime.UtcNow
            }
        };
    }

    private async Task CreateDefaultPricingPlansAsync(string plansTable)
    {
        try
        {
            var defaultPlans = GetDefaultPricingPlans();
            foreach (var plan in defaultPlans)
            {
                try
                {
                    await SavePricingPlanAsync(plan);
                    Console.WriteLine($"[DynamoDBService] Created default plan: {plan.Name}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DynamoDBService] Failed to create default plan {plan.Name}: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error creating default pricing plans: {ex.Message}");
        }
    }
}

