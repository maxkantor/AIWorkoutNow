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
    private readonly string _emailVerificationTable;
    private readonly string _emailVisitorMappingTable;

    private const int DefaultTokensPerPack = 10;

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
        _emailVerificationTable = Environment.GetEnvironmentVariable("EMAIL_VERIFICATION_TABLE") ?? $"{tablePrefix}-EmailVerification";
        _emailVisitorMappingTable = Environment.GetEnvironmentVariable("EMAIL_VISITOR_MAPPING_TABLE") ?? $"{tablePrefix}-EmailVisitorMapping";
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
        document["IsActive"] = tokens.IsActive; // Save IsActive flag

        await _dynamoDB.PutItemAsync(new PutItemRequest
        {
            TableName = _userTokensTable,
            Item = document.ToAttributeMap()
        });
    }

    // Atomically increment tokens for a device, returning the new balance
    public async Task<int> IncrementUserTokensAsync(string deviceId, int tokensToAdd)
    {
        if (tokensToAdd == 0) return (await GetUserTokensAsync(deviceId))?.TokensRemaining ?? 0;

        int? previous = null;
        try
        {
            previous = (await GetUserTokensAsync(deviceId))?.TokensRemaining;
            Console.WriteLine($"[DynamoDBService] IncrementUserTokensAsync start - Device: {deviceId}, Prev: {previous}, Delta: {tokensToAdd}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] IncrementUserTokensAsync could not read previous balance for {deviceId}: {ex.Message}");
        }

        try
        {
            var response = await _dynamoDB.UpdateItemAsync(new UpdateItemRequest
            {
                TableName = _userTokensTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "DeviceId", new AttributeValue { S = deviceId } }
                },
                UpdateExpression = "ADD TokensRemaining :delta SET IsActive = :true",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":delta", new AttributeValue { N = tokensToAdd.ToString() } },
                    { ":true", new AttributeValue { BOOL = true } }
                },
                ReturnValues = "UPDATED_NEW"
            });

            if (response.Attributes != null && response.Attributes.ContainsKey("TokensRemaining"))
            {
                var newValue = int.Parse(response.Attributes["TokensRemaining"].N);
                Console.WriteLine($"[DynamoDBService] IncrementUserTokensAsync success - Device: {deviceId}, Prev: {previous}, Delta: {tokensToAdd}, New: {newValue}");
                return newValue;
            }
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] UserTokens table not found when incrementing tokens");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] IncrementUserTokensAsync error: {ex.Message}");
        }

        // Fallback: create record with provided delta
        var fallbackTokens = new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = Math.Max(tokensToAdd, 0),
            ExpiresAt = null,
            IsActive = true
        };
        await SaveUserTokensAsync(fallbackTokens);
        return fallbackTokens.TokensRemaining;
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
            TokensRemaining = int.Parse(response.Item["TokensRemaining"].N),
            IsActive = response.Item.ContainsKey("IsActive") ? response.Item["IsActive"].BOOL : true // Default to active if not set
        };

        if (response.Item.ContainsKey("ExpiresAt"))
        {
            tokens.ExpiresAt = DateTime.Parse(response.Item["ExpiresAt"].S);
        }

        return tokens;
    }

    /// <summary>
    /// Reconcile tokens for a device from purchases. Returns the up-to-date UserTokens (persisted).
    /// </summary>
    public async Task<UserTokens> ReconcileTokensAsync(string deviceId)
    {
        // Start with current tokens (or default)
        var tokens = await GetUserTokensAsync(deviceId) ?? new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 0,
            IsActive = true
        };

        var purchases = await GetUserPurchasesByDeviceIdAsync(deviceId);
        var completed = purchases.Where(p => p.Status == "completed").ToList();

        // Unlimited check
        var unlimitedPurchase = completed.FirstOrDefault(p => p.IsUnlimited);
        if (unlimitedPurchase != null)
        {
            tokens.TokensRemaining = 999999;
            tokens.ExpiresAt = (unlimitedPurchase.ExpiresAt ?? unlimitedPurchase.PurchasedAt.AddDays(365));
            tokens.IsActive = true;
            await SaveUserTokensAsync(tokens);
            return tokens;
        }

        // Sum paid tokens; backfill TokensGranted when missing
        int purchasedTokens = 0;
        foreach (var p in completed)
        {
            if (p.TokensGranted.HasValue && p.TokensGranted.Value > 0)
            {
                purchasedTokens += p.TokensGranted.Value;
                continue;
            }

            try
            {
                var plan = await GetPricingPlanAsync(p.PlanId);
                if (plan?.IsUnlimited == true)
                {
                    // Should have been caught above; skip
                    continue;
                }

                if (plan?.TokenCount != null && plan.TokenCount.Value > 0)
                {
                    purchasedTokens += plan.TokenCount.Value;
                    Console.WriteLine($"[DynamoDBService] ReconcileTokens - Backfilled TokensGranted from plan {p.PlanId} => {plan.TokenCount}");
                }
                else
                {
                    purchasedTokens += DefaultTokensPerPack;
                    Console.WriteLine($"[DynamoDBService] ReconcileTokens - Plan {p.PlanId} missing TokenCount, defaulting TokensGranted to {DefaultTokensPerPack}");
                }
            }
            catch (Exception exPlan)
            {
                purchasedTokens += DefaultTokensPerPack;
                Console.WriteLine($"[DynamoDBService] ReconcileTokens - Plan lookup failed for {p.PlanId}: {exPlan.Message}. Defaulting TokensGranted to {DefaultTokensPerPack}");
            }
        }

        if (purchasedTokens > tokens.TokensRemaining)
        {
            tokens.TokensRemaining = purchasedTokens;
            tokens.ExpiresAt = null;
            tokens.IsActive = true;
            await SaveUserTokensAsync(tokens);
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
        document["Name"] = message.Name ?? string.Empty;
        document["Email"] = message.Email;
        document["Subject"] = message.Subject ?? string.Empty;
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
        var freeUsersSet = new System.Collections.Generic.HashSet<string>();
        var freeUsersResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _anonymousUsageTable
        });
        
        foreach (var item in freeUsersResponse.Items)
        {
            if (item.ContainsKey("DeviceId"))
            {
                freeUsersSet.Add(item["DeviceId"].S);
            }
        }
        stats.FreeUsers = freeUsersSet.Count;
        Console.WriteLine($"[DynamoDBService] FreeUsers count: {stats.FreeUsers}");

        // Count unique device IDs in user tokens (paid users)
        var paidUsersSet = new System.Collections.Generic.HashSet<string>();
        var paidUsersResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _userTokensTable
        });
        
        foreach (var item in paidUsersResponse.Items)
        {
            if (item.ContainsKey("DeviceId"))
            {
                paidUsersSet.Add(item["DeviceId"].S);
            }
        }
        stats.PaidUsers = paidUsersSet.Count;
        Console.WriteLine($"[DynamoDBService] PaidUsers count: {stats.PaidUsers}");

        // Count total workouts
        var workoutsResponse = await _dynamoDB.ScanAsync(new ScanRequest
        {
            TableName = _workoutsTable,
            Select = Select.COUNT
        });
        stats.TotalWorkouts = workoutsResponse.Count;
        Console.WriteLine($"[DynamoDBService] TotalWorkouts count: {stats.TotalWorkouts}");

        // Count token purchases from UserPurchases table (not StripePurchases)
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var purchasesTable = $"{tablePrefix}-UserPurchases";
        try
        {
            var purchasesResponse = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = purchasesTable,
                Select = Select.COUNT
            });
            stats.TokenPurchases = purchasesResponse.Count;
            Console.WriteLine($"[DynamoDBService] TokenPurchases count: {stats.TokenPurchases}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error counting token purchases: {ex.Message}");
            stats.TokenPurchases = 0;
        }

        return stats;
    }

    // CRM Methods
    public async Task<List<ContactMessage>> GetAllContactMessagesAsync()
    {
        try
        {
            // Use ProjectionExpression to ensure we get all necessary fields
            var response = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = _contactMessagesTable,
                ProjectionExpression = "MessageId, #N, #E, #S, #M, CreatedAt",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    { "#N", "Name" },
                    { "#E", "Email" },
                    { "#S", "Subject" },
                    { "#M", "Message" }
                },
                Limit = 1000 // Reasonable limit
            });

            var messages = new List<ContactMessage>();
            foreach (var item in response.Items)
            {
                try
                {
                    messages.Add(new ContactMessage
                    {
                        MessageId = item.ContainsKey("MessageId") ? item["MessageId"].S : Guid.NewGuid().ToString(),
                        Name = item.ContainsKey("Name") ? item["Name"].S : item.ContainsKey("#N") ? item["#N"].S : "",
                        Email = item.ContainsKey("Email") ? item["Email"].S : item.ContainsKey("#E") ? item["#E"].S : "",
                        Subject = item.ContainsKey("Subject") ? item["Subject"].S : item.ContainsKey("#S") ? item["#S"].S : "",
                        Message = item.ContainsKey("Message") ? item["Message"].S : item.ContainsKey("#M") ? item["#M"].S : "",
                        CreatedAt = item.ContainsKey("CreatedAt") ? DateTime.Parse(item["CreatedAt"].S) : DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DynamoDBService] Error parsing contact message item: {ex.Message}");
                    // Skip this item and continue
                }
            }
            
            Console.WriteLine($"[DynamoDBService] Retrieved {messages.Count} contact messages");
            return messages.OrderByDescending(m => m.CreatedAt).ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] ContactMessages table does not exist, returning empty list");
            return new List<ContactMessage>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting contact messages: {ex.Message}");
            Console.WriteLine($"[DynamoDBService] Stack trace: {ex.StackTrace}");
            return new List<ContactMessage>();
        }
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
            Name = response.Item.ContainsKey("Name") ? response.Item["Name"].S : string.Empty,
            Email = response.Item["Email"].S,
            Subject = response.Item.ContainsKey("Subject") ? response.Item["Subject"].S : string.Empty,
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
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var activitiesTable = $"{tablePrefix}-CustomerActivities";
            
            // AGGRESSIVE FIX: Ensure timestamp is set to current time if not provided
            if (activity.Timestamp == default)
            {
                activity.Timestamp = DateTime.UtcNow;
            }
            
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
            
            Console.WriteLine($"[DynamoDBService] Saved activity: {activity.ActivityType} for {activity.DeviceId} at {activity.Timestamp}");
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] CustomerActivities table does not exist, cannot save activity");
            // Don't throw - allow the request to continue
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error saving customer activity: {ex.Message}");
            // Don't throw - allow the request to continue
        }
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

    public async Task<List<AdminCustomerSummary>> GetAllCustomersAsync()
    {
        var summaries = new Dictionary<string, AdminCustomerSummary>();
        var planCache = new Dictionary<string, PricingPlan?>();
        var freeUsed = new Dictionary<string, int>();
        var tokensActive = new Dictionary<string, (int tokens, bool isActive)>();

        AdminCustomerSummary Ensure(string deviceId)
        {
            if (!summaries.ContainsKey(deviceId))
            {
                summaries[deviceId] = new AdminCustomerSummary
                {
                    DeviceId = deviceId,
                    RemainingTokens = 0,
                    GeneratedWorkouts = 0,
                    RemainingWorkouts = 0,
                    PurchasesCount = 0,
                    TotalSpentCents = 0,
                    TotalSpentFormatted = "$0.00",
                    StatusLabel = "Free",
                    IsDeactivated = false
                };
            }
            return summaries[deviceId];
        }

        int GetFreeRemaining(string deviceId)
        {
            var used = freeUsed.TryGetValue(deviceId, out var v) ? v : 0;
            return Math.Max(0, 3 - used);
        }

        string FormatCurrency(int cents)
        {
            return $"${(cents / 100.0m):0.00}";
        }

        // Free usage
        try
        {
            var freeResp = await _dynamoDB.ScanAsync(new ScanRequest { TableName = _anonymousUsageTable });
            foreach (var item in freeResp.Items)
            {
                var deviceId = item["DeviceId"].S;
                var count = item.ContainsKey("Count") ? int.Parse(item["Count"].N) : 0;
                freeUsed[deviceId] = freeUsed.TryGetValue(deviceId, out var existing) ? existing + count : count;
                Ensure(deviceId);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] GetAllCustomersAsync free usage scan error: {ex.Message}");
        }

        // Tokens (reconciled)
        try
        {
            var tokensResp = await _dynamoDB.ScanAsync(new ScanRequest { TableName = _userTokensTable });
            foreach (var item in tokensResp.Items)
            {
                var deviceId = item["DeviceId"].S;
                // Reconcile per-device to ensure purchased tokens are applied and IsActive set
                var reconciled = await ReconcileTokensAsync(deviceId);
                tokensActive[deviceId] = (reconciled.TokensRemaining, reconciled.IsActive);
                var summary = Ensure(deviceId);
                summary.RemainingTokens = reconciled.IsActive ? reconciled.TokensRemaining : 0;
                summary.IsDeactivated = !reconciled.IsActive;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] GetAllCustomersAsync tokens scan error: {ex.Message}");
        }

        var lastActivity = new Dictionary<string, DateTime>();

        // Activities
        try
        {
            var prefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var activitiesTable = $"{prefix}-CustomerActivities";
            var resp = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = activitiesTable,
                Limit = 20000
            });

            foreach (var item in resp.Items)
            {
                var deviceId = item["DeviceId"].S;
                var type = item.ContainsKey("ActivityType") ? item["ActivityType"].S : "";
                var ts = item.ContainsKey("Timestamp") ? DateTime.Parse(item["Timestamp"].S) : DateTime.UtcNow;

                if (type == "workout_generated")
                {
                    var summary = Ensure(deviceId);
                    summary.GeneratedWorkouts += 1;
                }

                if (!lastActivity.ContainsKey(deviceId) || ts > lastActivity[deviceId])
                {
                    lastActivity[deviceId] = ts;
                }
                Ensure(deviceId);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] GetAllCustomersAsync activities scan error: {ex.Message}");
        }

        // Purchases
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            var resp = await _dynamoDB.ScanAsync(new ScanRequest { TableName = purchasesTable, Limit = 5000 });

            foreach (var item in resp.Items)
            {
                try
                {
                    var deviceId = item["DeviceId"].S;
                    var status = item["Status"].S;
                    var purchasedAt = item.ContainsKey("PurchasedAt") ? DateTime.Parse(item["PurchasedAt"].S) : DateTime.UtcNow;
                    var planId = item.ContainsKey("PlanId") ? item["PlanId"].S : string.Empty;

                    var summary = Ensure(deviceId);

                    if (status == "completed")
                    {
                        summary.PurchasesCount += 1;
                        if (!planCache.ContainsKey(planId))
                        {
                            planCache[planId] = await GetPricingPlanAsync(planId);
                        }

                        var plan = planCache[planId];
                        if (plan != null)
                        {
                            var cents = (int)Math.Round(plan.Price * 100);
                            summary.TotalSpentCents += cents;
                        }
                    }

                    if (string.IsNullOrEmpty(summary.Email) && item.ContainsKey("CustomerEmail"))
                        summary.Email = item["CustomerEmail"].S;
                    if (string.IsNullOrEmpty(summary.Name) && item.ContainsKey("CustomerName"))
                        summary.Name = item["CustomerName"].S;

                    if (!lastActivity.ContainsKey(deviceId) || purchasedAt > lastActivity[deviceId])
                    {
                        lastActivity[deviceId] = purchasedAt;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DynamoDBService] GetAllCustomersAsync purchase parse error: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] GetAllCustomersAsync purchases scan error: {ex.Message}");
        }

        // Finalize
        foreach (var summary in summaries.Values)
        {
            var freeRem = GetFreeRemaining(summary.DeviceId);
            summary.RemainingWorkouts = Math.Max(0, summary.RemainingTokens) + freeRem;
            summary.TotalSpentFormatted = FormatCurrency(summary.TotalSpentCents);

            var isActive = !summary.IsDeactivated;
            var isPaid = summary.RemainingTokens > 0 || summary.PurchasesCount > 0;
            summary.StatusLabel = !isActive ? "Deactivated" : (isPaid ? "Paid" : "Free");

            if (lastActivity.TryGetValue(summary.DeviceId, out var ts))
            {
                summary.LastActivityIso = ts.ToUniversalTime().ToString("o");
            }
        }

        return summaries.Values
            .OrderByDescending(c => c.LastActivityIso ?? string.Empty)
            .ToList();
    }

    public async Task<AdminCustomerDetails?> GetCustomerSummaryAsync(string deviceId)
    {
        var summaries = await GetAllCustomersAsync();
        var summary = summaries.FirstOrDefault(c => c.DeviceId == deviceId);
        if (summary == null) return null;

        var details = new AdminCustomerDetails
        {
            DeviceId = summary.DeviceId,
            Email = summary.Email,
            Name = summary.Name,
            IsDeactivated = summary.IsDeactivated,
            StatusLabel = summary.StatusLabel,
            RemainingTokens = summary.RemainingTokens,
            GeneratedWorkouts = summary.GeneratedWorkouts,
            RemainingWorkouts = summary.RemainingWorkouts,
            PurchasesCount = summary.PurchasesCount,
            TotalSpentCents = summary.TotalSpentCents,
            TotalSpentFormatted = summary.TotalSpentFormatted,
            LastActivityIso = summary.LastActivityIso
        };

        try
        {
            details.FreeWorkoutsUsed = await GetTotalFreeWorkoutsAsync(deviceId);
            details.FreeWorkoutsRemaining = Math.Max(0, 3 - details.FreeWorkoutsUsed);
            details.RemainingWorkouts = Math.Max(0, details.RemainingTokens) + details.FreeWorkoutsRemaining;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error counting free workouts for {deviceId}: {ex.Message}");
        }

        // Purchases detail
        try
        {
            var purchases = await GetUserPurchasesByDeviceIdAsync(deviceId);
            var planCache = new Dictionary<string, PricingPlan?>();
            foreach (var p in purchases.OrderByDescending(p => p.PurchasedAt))
            {
                if (!planCache.ContainsKey(p.PlanId))
                {
                    planCache[p.PlanId] = await GetPricingPlanAsync(p.PlanId);
                }
                var plan = planCache[p.PlanId];
                var cents = plan != null ? (int)Math.Round(plan.Price * 100) : 0;
                details.Purchases.Add(new AdminPurchaseDto
                {
                    PurchaseId = p.PurchaseId,
                    PlanId = p.PlanId,
                    PlanName = plan?.Name ?? p.PlanId,
                    AmountCents = cents,
                    AmountFormatted = $"${(cents / 100.0m):0.00}",
                    Status = p.Status,
                    PurchasedAtIso = p.PurchasedAt.ToUniversalTime().ToString("o")
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error loading purchases for {deviceId}: {ex.Message}");
        }

        // Usage events detail (recent)
        try
        {
            var activities = await GetCustomerActivitiesAsync(deviceId, 50);
            details.UsageEvents = activities
                .Select(a => new AdminUsageEventDto
                {
                    ActivityType = a.ActivityType,
                    Description = a.Description,
                    TimestampIso = a.Timestamp.ToUniversalTime().ToString("o")
                })
                .ToList();

            if (activities.Any())
            {
                var latest = activities.Max(a => a.Timestamp);
                if (string.IsNullOrEmpty(details.LastActivityIso) || latest > DateTime.Parse(details.LastActivityIso))
                {
                    details.LastActivityIso = latest.ToUniversalTime().ToString("o");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error loading activities for {deviceId}: {ex.Message}");
        }

        return details;
    }

    public async Task ResetUserTokensAsync(string deviceId, int newTokenCount)
    {
        var tokens = await GetUserTokensAsync(deviceId);
        if (tokens == null)
        {
            tokens = new UserTokens
            {
                DeviceId = deviceId,
                TokensRemaining = newTokenCount,
                ExpiresAt = null, // No expiration for non-unlimited tokens
                IsActive = true
            };
        }
        else
        {
            tokens.TokensRemaining = newTokenCount;
            tokens.IsActive = true;
            // CRITICAL FIX: If resetting from unlimited (999999) to a lower number, clear expiration
            // This ensures the system doesn't still think it's unlimited
            if (newTokenCount < 999999)
            {
                tokens.ExpiresAt = null;
                Console.WriteLine($"[DynamoDBService] Reset tokens from unlimited to {newTokenCount}, cleared ExpiresAt");
            }
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
            // AGGRESSIVE FIX: Use ProjectionExpression to only fetch needed fields for faster scans
            var response = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = plansTable,
                Limit = 20, // Fast scan - we don't expect more than 20 pricing plans
                ProjectionExpression = "PlanId, #N, Price, Currency, TokenCount, IsUnlimited, UnlimitedDays, DisplayOrder, IsRecommended, BadgeText, MicroCopy, IsActive, StripePriceId, CreatedAt, UpdatedAt",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    { "#N", "Name" }
                }
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
            StripePriceId = item.ContainsKey("StripePriceId") ? item["StripePriceId"].S : string.Empty,
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
                IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL,
                CustomerEmail = item.ContainsKey("CustomerEmail") ? item["CustomerEmail"].S : null,
                CustomerName = item.ContainsKey("CustomerName") ? item["CustomerName"].S : null
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
                        IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL,
                        CustomerEmail = item.ContainsKey("CustomerEmail") ? item["CustomerEmail"].S : null,
                        CustomerName = item.ContainsKey("CustomerName") ? item["CustomerName"].S : null
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
                IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL,
                CustomerEmail = item.ContainsKey("CustomerEmail") ? item["CustomerEmail"].S : null,
                CustomerName = item.ContainsKey("CustomerName") ? item["CustomerName"].S : null
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

    // Email Verification Methods
    public async Task SaveEmailVerificationCodeAsync(EmailVerificationCode code)
    {
        try
        {
            var document = new Document();
            document["Email"] = code.Email.ToLowerInvariant();
            document["Code"] = code.Code;
            document["ExpiresAt"] = code.ExpiresAt.ToString("O");
            document["Attempts"] = code.Attempts;

            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = _emailVerificationTable,
                Item = document.ToAttributeMap()
            });
        }
        catch (ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVerification table does not exist: {_emailVerificationTable}");
            throw;
        }
    }

    public async Task<EmailVerificationCode?> GetEmailVerificationCodeAsync(string email)
    {
        try
        {
            var response = await _dynamoDB.GetItemAsync(new GetItemRequest
            {
                TableName = _emailVerificationTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "Email", new AttributeValue { S = email.ToLowerInvariant() } }
                }
            });

            if (!response.Item.Any())
                return null;

            return new EmailVerificationCode
            {
                Email = response.Item["Email"].S,
                Code = response.Item["Code"].S,
                ExpiresAt = DateTime.Parse(response.Item["ExpiresAt"].S),
                Attempts = response.Item.ContainsKey("Attempts") ? int.Parse(response.Item["Attempts"].N) : 0
            };
        }
        catch (ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVerification table does not exist: {_emailVerificationTable}");
            return null;
        }
    }

    public async Task DeleteEmailVerificationCodeAsync(string email)
    {
        try
        {
            await _dynamoDB.DeleteItemAsync(new DeleteItemRequest
            {
                TableName = _emailVerificationTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "Email", new AttributeValue { S = email.ToLowerInvariant() } }
                }
            });
        }
        catch (ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVerification table does not exist: {_emailVerificationTable}");
        }
    }

    // Email-Visitor ID Mapping Methods
    public async Task SaveEmailVisitorMappingAsync(EmailVisitorMapping mapping)
    {
        try
        {
            var document = new Document();
            document["Email"] = mapping.Email.ToLowerInvariant();
            document["VisitorIds"] = string.Join(",", mapping.VisitorIds);
            document["CreatedAt"] = mapping.CreatedAt.ToString("O");
            document["UpdatedAt"] = mapping.UpdatedAt.ToString("O");

            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = _emailVisitorMappingTable,
                Item = document.ToAttributeMap()
            });
        }
        catch (ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVisitorMapping table does not exist: {_emailVisitorMappingTable}");
            throw;
        }
    }

    public async Task<EmailVisitorMapping?> GetEmailVisitorMappingAsync(string email)
    {
        try
        {
            var response = await _dynamoDB.GetItemAsync(new GetItemRequest
            {
                TableName = _emailVisitorMappingTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "Email", new AttributeValue { S = email.ToLowerInvariant() } }
                }
            });

            if (!response.Item.Any())
                return null;

            var visitorIdsStr = response.Item["VisitorIds"].S;
            var visitorIds = string.IsNullOrEmpty(visitorIdsStr) 
                ? new List<string>() 
                : visitorIdsStr.Split(',').Where(id => !string.IsNullOrEmpty(id)).ToList();

            return new EmailVisitorMapping
            {
                Email = response.Item["Email"].S,
                VisitorIds = visitorIds,
                CreatedAt = DateTime.Parse(response.Item["CreatedAt"].S),
                UpdatedAt = DateTime.Parse(response.Item["UpdatedAt"].S)
            };
        }
        catch (ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVisitorMapping table does not exist: {_emailVisitorMappingTable}");
            return null;
        }
    }

    public async Task<List<string>> GetVisitorIdsByEmailAsync(string email)
    {
        var mapping = await GetEmailVisitorMappingAsync(email);
        return mapping?.VisitorIds ?? new List<string>();
    }

    // Aggressive helper: find email mapping by visitor/device ID (scan)
    public async Task<EmailVisitorMapping?> GetEmailByVisitorIdAsync(string visitorId)
    {
        try
        {
            var scanResponse = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = _emailVisitorMappingTable
            });

            foreach (var item in scanResponse.Items)
            {
                if (!item.TryGetValue("VisitorIds", out var visitorIdsAttr)) continue;
                var visitorIdsStr = visitorIdsAttr.S ?? string.Empty;
                var visitorIds = visitorIdsStr.Split(',').Where(id => !string.IsNullOrEmpty(id)).ToList();
                if (visitorIds.Contains(visitorId))
                {
                    return new EmailVisitorMapping
                    {
                        Email = item["Email"].S,
                        VisitorIds = visitorIds,
                        CreatedAt = item.ContainsKey("CreatedAt") ? DateTime.Parse(item["CreatedAt"].S) : DateTime.UtcNow,
                        UpdatedAt = item.ContainsKey("UpdatedAt") ? DateTime.Parse(item["UpdatedAt"].S) : DateTime.UtcNow
                    };
                }
            }
        }
        catch (ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVisitorMapping table does not exist: {_emailVisitorMappingTable}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error scanning EmailVisitorMapping: {ex.Message}");
        }

        return null;
    }

    public async Task MergeCreditsFromVisitorIdsAsync(string targetDeviceId, List<string> sourceVisitorIds)
    {
        Console.WriteLine($"[DynamoDBService] Merging credits from {sourceVisitorIds.Count} visitor IDs to {targetDeviceId}");
        
        // Get target device tokens
        var targetTokens = await GetUserTokensAsync(targetDeviceId) ?? new UserTokens
        {
            DeviceId = targetDeviceId,
            TokensRemaining = 0,
            ExpiresAt = null
        };

        // IDP-safe merge: take the maximum token balance across linked devices (no additive sum)
        int maxTokens = targetTokens.TokensRemaining;
        DateTime? latestExpiration = targetTokens.ExpiresAt;

        // Merge tokens from all source visitor IDs
        foreach (var visitorId in sourceVisitorIds)
        {
            if (visitorId == targetDeviceId) continue; // Skip self

            var sourceTokens = await GetUserTokensAsync(visitorId);
            if (sourceTokens != null && sourceTokens.TokensRemaining > 0)
            {
                Console.WriteLine($"[DynamoDBService] Considering merge from {visitorId} with {sourceTokens.TokensRemaining} tokens");
                
                // If source has unlimited (999999), preserve unlimited status
                if (sourceTokens.TokensRemaining >= 999999)
                {
                    maxTokens = 999999;
                    // Use the latest expiration date
                    if (sourceTokens.ExpiresAt.HasValue && 
                        (!latestExpiration.HasValue || sourceTokens.ExpiresAt.Value > latestExpiration.Value))
                    {
                        latestExpiration = sourceTokens.ExpiresAt;
                    }
                }
                else if (maxTokens < 999999)
                {
                    // Take the maximum non-unlimited token balance across linked devices (no additive sum)
                    if (sourceTokens.TokensRemaining > maxTokens)
                    {
                        maxTokens = sourceTokens.TokensRemaining;
                        // carry over expiration only if it exists and target isn't unlimited
                        latestExpiration = sourceTokens.ExpiresAt;
                    }
                }

                // Merge purchases - copy all purchases from source to target
                var sourcePurchases = await GetUserPurchasesAsync(visitorId);
                foreach (var purchase in sourcePurchases)
                {
                    // Check if purchase already exists for target device
                    var existingPurchases = await GetUserPurchasesAsync(targetDeviceId);
                    if (!existingPurchases.Any(p => p.PurchaseId == purchase.PurchaseId))
                    {
                        // Create a copy of the purchase with target device ID
                        var newPurchase = new UserPurchase
                        {
                            PurchaseId = purchase.PurchaseId,
                            DeviceId = targetDeviceId,
                            PlanId = purchase.PlanId,
                            Status = purchase.Status,
                            PurchasedAt = purchase.PurchasedAt,
                            ExpiresAt = purchase.ExpiresAt,
                            IsUnlimited = purchase.IsUnlimited,
                            TokensGranted = purchase.TokensGranted,
                            CustomerEmail = purchase.CustomerEmail,
                            CustomerName = purchase.CustomerName,
                            StripeSessionId = purchase.StripeSessionId,
                            StripePaymentIntentId = purchase.StripePaymentIntentId
                        };
                        await SaveUserPurchaseAsync(newPurchase);
                        Console.WriteLine($"[DynamoDBService] Copied purchase {purchase.PurchaseId} to target device");
                    }
                }
            }
        }

        // Update target device tokens
        targetTokens.TokensRemaining = maxTokens;
        targetTokens.ExpiresAt = latestExpiration;
        await SaveUserTokensAsync(targetTokens);
        
        Console.WriteLine($"[DynamoDBService] Merged credits complete - Target device now has {maxTokens} tokens, expires: {latestExpiration}");
    }

    public async Task ResetFreeWorkoutCountAsync(string deviceId)
    {
        try
        {
            Console.WriteLine($"[DynamoDBService] Resetting free workout count for device {deviceId}");
            
            // Get all AnonymousUsage records for this device
            var usageResponse = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = _anonymousUsageTable,
                FilterExpression = "DeviceId = :deviceId",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":deviceId", new AttributeValue { S = deviceId } }
                }
            });

            // Delete all usage records to reset free workout count
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
            
            Console.WriteLine($"[DynamoDBService] Deleted {usageResponse.Items.Count} AnonymousUsage records for device {deviceId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error resetting free workout count: {ex.Message}");
            // Don't throw - this is a non-critical operation
        }
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

    public async Task<AnalyticsData> GetAnalyticsDataAsync(DateTime startDate, DateTime endDate, string period)
    {
        var analytics = new AnalyticsData
        {
            StartDate = startDate,
            EndDate = endDate,
            Period = period
        };

        try
        {
            // Get all activities and purchases using existing methods
            var allActivities = await GetAllActivitiesAsync(10000);
            var allPurchases = await GetAllUserPurchasesAsync();
            
            // Filter by date range
            var filteredActivities = allActivities
                .Where(a => a.Timestamp >= startDate && a.Timestamp <= endDate)
                .ToList();
            
            var filteredPurchases = allPurchases
                .Where(p => p.PurchasedAt >= startDate && p.PurchasedAt <= endDate && p.Status == "completed")
                .ToList();

            // Group by time period
            var timeSeriesMap = new Dictionary<string, TimeSeriesPoint>();
            var uniqueUsersPerPeriod = new Dictionary<string, HashSet<string>>();

            foreach (var activity in filteredActivities)
            {
                var dateKey = GetDateKey(activity.Timestamp, period);
                if (!timeSeriesMap.ContainsKey(dateKey))
                {
                    timeSeriesMap[dateKey] = new TimeSeriesPoint { Date = dateKey };
                    uniqueUsersPerPeriod[dateKey] = new HashSet<string>();
                }

                var point = timeSeriesMap[dateKey];
                uniqueUsersPerPeriod[dateKey].Add(activity.DeviceId);

                switch (activity.ActivityType)
                {
                    case "workout_generated":
                        point.WorkoutsGenerated++;
                        break;
                    case "contact_submitted":
                        point.ContactSubmissions++;
                        break;
                }
            }

            // Process purchases and calculate revenue
            foreach (var purchase in filteredPurchases)
            {
                var dateKey = GetDateKey(purchase.PurchasedAt, period);
                if (!timeSeriesMap.ContainsKey(dateKey))
                {
                    timeSeriesMap[dateKey] = new TimeSeriesPoint { Date = dateKey };
                    uniqueUsersPerPeriod[dateKey] = new HashSet<string>();
                }

                var point = timeSeriesMap[dateKey];
                point.TokenPurchases++;
                uniqueUsersPerPeriod[dateKey].Add(purchase.DeviceId);

                // Get plan price
                var plan = await GetPricingPlanAsync(purchase.PlanId);
                if (plan != null)
                {
                    point.Revenue += plan.Price;
                }
            }

            // Set unique users per period
            foreach (var kvp in uniqueUsersPerPeriod)
            {
                if (timeSeriesMap.ContainsKey(kvp.Key))
                {
                    timeSeriesMap[kvp.Key].UniqueUsers = kvp.Value.Count;
                }
            }

            analytics.TimeSeries = timeSeriesMap.Values.OrderBy(t => t.Date).ToList();

            // Calculate aggregate metrics
            analytics.Events = new EventMetrics
            {
                TotalWorkoutsGenerated = filteredActivities.Count(a => a.ActivityType == "workout_generated"),
                TotalTokenPurchases = filteredPurchases.Count,
                TotalContactSubmissions = filteredActivities.Count(a => a.ActivityType == "contact_submitted"),
                TotalTokenResets = filteredActivities.Count(a => a.ActivityType == "tokens_reset"),
                EventsByType = filteredActivities.GroupBy(a => a.ActivityType)
                    .ToDictionary(g => g.Key, g => g.Count())
            };

            // User metrics
            var allDeviceIds = filteredActivities.Select(a => a.DeviceId)
                .Concat(filteredPurchases.Select(p => p.DeviceId))
                .Distinct()
                .ToList();
            
            var freeUsersSet = new HashSet<string>();
            var paidUsersSet = new HashSet<string>();

            // Check each device for paid/free status
            foreach (var deviceId in allDeviceIds)
            {
                var tokens = await GetUserTokensAsync(deviceId);
                if (tokens != null && tokens.TokensRemaining > 0)
                {
                    paidUsersSet.Add(deviceId);
                }
                else
                {
                    freeUsersSet.Add(deviceId);
                }
            }

            var allCustomers = await GetAllCustomersAsync();
            var newUsers = allCustomers.Count(c =>
            {
                if (string.IsNullOrEmpty(c.LastActivityIso)) return false;
                if (!DateTime.TryParse(c.LastActivityIso, out var dt)) return false;
                return dt >= startDate && dt <= endDate;
            });

            // Revenue metrics (calculate first)
            decimal totalRevenue = 0;
            var revenueByPlan = new Dictionary<string, decimal>();
            
            foreach (var purchase in filteredPurchases)
            {
                var plan = await GetPricingPlanAsync(purchase.PlanId);
                if (plan != null)
                {
                    totalRevenue += plan.Price;
                    if (!revenueByPlan.ContainsKey(purchase.PlanId))
                        revenueByPlan[purchase.PlanId] = 0;
                    revenueByPlan[purchase.PlanId] += plan.Price;
                }
            }

            analytics.Revenue = new RevenueMetrics
            {
                TotalRevenue = totalRevenue,
                AverageOrderValue = filteredPurchases.Count > 0 
                    ? totalRevenue / filteredPurchases.Count 
                    : 0,
                TotalTransactions = filteredPurchases.Count,
                RevenueByPlan = revenueByPlan
            };

            // User metrics (now we can use analytics.Revenue)
            analytics.Users = new UserMetrics
            {
                TotalUsers = allDeviceIds.Count,
                NewUsers = newUsers,
                ReturningUsers = allDeviceIds.Count - newUsers,
                FreeUsers = freeUsersSet.Count,
                PaidUsers = paidUsersSet.Count,
                AverageWorkoutsPerUser = allDeviceIds.Count > 0 
                    ? (double)analytics.Events.TotalWorkoutsGenerated / allDeviceIds.Count 
                    : 0,
                AverageRevenuePerUser = paidUsersSet.Count > 0 
                    ? (double)analytics.Revenue.TotalRevenue / paidUsersSet.Count 
                    : 0
            };

            // Conversion metrics
            var convertedFromFree = paidUsersSet.Intersect(freeUsersSet).Count();

            analytics.Conversion = new ConversionMetrics
            {
                FreeToPaidConversionRate = freeUsersSet.Count > 0 
                    ? (double)convertedFromFree / freeUsersSet.Count * 100 
                    : 0,
                FreeUsersConverted = convertedFromFree,
                FreeUsersNotConverted = freeUsersSet.Count - convertedFromFree
            };

            return analytics;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting analytics data: {ex.Message}");
            Console.WriteLine($"[DynamoDBService] Stack trace: {ex.StackTrace}");
            return analytics;
        }
    }

    private string GetDateKey(DateTime date, string period)
    {
        return period switch
        {
            "hour" => date.ToString("yyyy-MM-dd HH:00"),
            "day" => date.ToString("yyyy-MM-dd"),
            "week" => $"{date.Year}-W{GetWeekOfYear(date)}",
            "month" => date.ToString("yyyy-MM"),
            _ => date.ToString("yyyy-MM-dd")
        };
    }

    private int GetWeekOfYear(DateTime date)
    {
        var culture = System.Globalization.CultureInfo.CurrentCulture;
        var calendar = culture.Calendar;
        return calendar.GetWeekOfYear(date, culture.DateTimeFormat.CalendarWeekRule, culture.DateTimeFormat.FirstDayOfWeek);
    }

    public async Task<List<UserPurchase>> GetPurchasesByEmailAsync(string email)
    {
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            
            // Scan for purchases with matching CustomerEmail
            var response = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = purchasesTable,
                FilterExpression = "CustomerEmail = :email AND #status = :completed",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    { "#status", "Status" }
                },
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":email", new AttributeValue { S = email.ToLowerInvariant() } },
                    { ":completed", new AttributeValue { S = "completed" } }
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
                IsUnlimited = item.ContainsKey("IsUnlimited") && item["IsUnlimited"].BOOL,
                CustomerEmail = item.ContainsKey("CustomerEmail") ? item["CustomerEmail"].S : null,
                CustomerName = item.ContainsKey("CustomerName") ? item["CustomerName"].S : null
            }).OrderByDescending(p => p.PurchasedAt).ToList(); // Latest first
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting purchases by email {email}: {ex.Message}");
            return new List<UserPurchase>();
        }
    }

    public async Task DeleteCustomerAsync(string deviceId)
    {
        // AGGRESSIVE FIX: Mark as inactive instead of deleting
        await DeactivateCustomerAsync(deviceId);
    }

    public async Task DeactivateCustomerAsync(string deviceId)
    {
        try
        {
            Console.WriteLine($"[DynamoDBService] DeactivateCustomer called for device: {deviceId}");
            
            // Mark customer as inactive by updating UserTokens
            var tokens = await GetUserTokensAsync(deviceId);
            if (tokens != null)
            {
                tokens.IsActive = false;
                await SaveUserTokensAsync(tokens);
                Console.WriteLine($"[DynamoDBService] Marked customer {deviceId} as inactive");
            }
            else
            {
                // If no tokens record exists, create one with IsActive=false
                tokens = new UserTokens
                {
                    DeviceId = deviceId,
                    TokensRemaining = 0,
                    IsActive = false
                };
                await SaveUserTokensAsync(tokens);
                Console.WriteLine($"[DynamoDBService] Created inactive UserTokens record for device {deviceId}");
            }
            
            Console.WriteLine($"[DynamoDBService] Successfully deactivated customer {deviceId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error in DeactivateCustomer: {ex.Message}");
            throw;
        }
    }
}

