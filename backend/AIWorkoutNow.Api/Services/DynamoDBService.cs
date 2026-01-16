using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;
using AIWorkoutNow.Api.Models;
using System.Text.Json;

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
    private static readonly HashSet<string> _loggedMissingPlans = new(StringComparer.OrdinalIgnoreCase);
    private static bool DebugPlansEnabled =>
        string.Equals(Environment.GetEnvironmentVariable("DEBUG_PLANS"), "1", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(Environment.GetEnvironmentVariable("DEBUG_PLANS"), "true", StringComparison.OrdinalIgnoreCase);

    private static bool DebugPurchasesEnabled =>
        string.Equals(Environment.GetEnvironmentVariable("DEBUG_PURCHASES"), "1", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(Environment.GetEnvironmentVariable("DEBUG_PURCHASES"), "true", StringComparison.OrdinalIgnoreCase);

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

    private static bool ReadBool(Dictionary<string, AttributeValue> item, string key, bool defaultValue)
    {
        if (!item.TryGetValue(key, out var v) || v == null) return defaultValue;
        try
        {
            // BOOL
            if (v.IsBOOLSet) return v.BOOL;
        }
        catch { /* ignore */ }
        // Number "1"/"0"
        if (!string.IsNullOrEmpty(v.N))
        {
            return v.N != "0";
        }
        // String "true"/"false"/"1"/"0"
        if (!string.IsNullOrEmpty(v.S))
        {
            if (string.Equals(v.S, "true", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(v.S, "false", StringComparison.OrdinalIgnoreCase)) return false;
            if (v.S == "1") return true;
            if (v.S == "0") return false;
        }
        return defaultValue;
    }

    private static int? ReadInt(Dictionary<string, AttributeValue> item, string key)
    {
        if (!item.TryGetValue(key, out var v) || v == null) return null;
        if (!string.IsNullOrEmpty(v.N) && int.TryParse(v.N, out var n)) return n;
        if (!string.IsNullOrEmpty(v.S) && int.TryParse(v.S, out var s)) return s;
        return null;
    }

    private static int? InferTokenCountFromPlanId(string planId)
    {
        var id = (planId ?? string.Empty).ToLowerInvariant();
        if (id.Contains("unlimited")) return 999999;
        if (id.Contains("100")) return 100;
        if (id.Contains("70")) return 70;
        if (id.Contains("30")) return 30;
        if (id.Contains("25")) return 25;
        if (id.Contains("10")) return 10;
        return null;
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
        try
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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            // Free-tier usage depends on this table. Create if missing then retry once.
            await CreateTableIfMissingAsync(_anonymousUsageTable, "DeviceId", "Date");
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
    }

    public async Task SaveUserTokensAsync(UserTokens tokens)
    {
        var document = new Document();
        document["DeviceId"] = tokens.DeviceId;
        document["TokensRemaining"] = tokens.TokensRemaining;
        document["TotalWorkouts"] = tokens.TotalWorkouts;
        document["ExpiresAt"] = tokens.ExpiresAt?.ToString("O");
        document["IsActive"] = tokens.IsActive; // Save IsActive flag
        if (tokens.LastResetAt.HasValue)
        {
            document["LastResetAt"] = tokens.LastResetAt.Value.ToString("O");
        }

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
                UpdateExpression = "ADD TokensRemaining :delta, TotalWorkouts :delta SET IsActive = :true",
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
            TotalWorkouts = response.Item.ContainsKey("TotalWorkouts") ? int.Parse(response.Item["TotalWorkouts"].N) : int.Parse(response.Item["TokensRemaining"].N),
            IsActive = response.Item.ContainsKey("IsActive") ? response.Item["IsActive"].BOOL : true // Default to active if not set
        };

        if (response.Item.ContainsKey("ExpiresAt"))
        {
            tokens.ExpiresAt = DateTime.Parse(response.Item["ExpiresAt"].S);
        }
        if (response.Item.ContainsKey("LastResetAt"))
        {
            tokens.LastResetAt = DateTime.Parse(response.Item["LastResetAt"].S);
        }

        return tokens;
    }

    /// <summary>
    /// Reconcile tokens for a device from purchases. Returns the up-to-date UserTokens (persisted).
    /// </summary>
    public async Task<UserTokens> ReconcileTokensAsync(string deviceId)
    {
        // Aggressive fix: apply any pending purchases first (promote to completed and increment tokens)
        await ApplyPendingPurchasesAsync(deviceId, null);

        // Start with current tokens (or default)
        var tokens = await GetUserTokensAsync(deviceId) ?? new UserTokens
        {
            DeviceId = deviceId,
            TokensRemaining = 0,
            TotalWorkouts = 0,
            IsActive = true
        };

        var purchases = await GetUserPurchasesByDeviceIdAsync(deviceId);
        var completed = purchases.Where(p => p.Status == "completed").ToList();
        if (tokens.LastResetAt.HasValue)
        {
            // Do not re-grant or re-count purchases that happened before the last admin reset.
            completed = completed.Where(p => p.PurchasedAt > tokens.LastResetAt.Value).ToList();
        }

        // Unlimited disabled: do not auto-promote to unlimited

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
                    if (DebugPlansEnabled)
                    {
                        Console.WriteLine($"[DynamoDBService] DEBUG_PLANS: ReconcileTokens backfilled TokensGranted from plan {p.PlanId} => {plan.TokenCount}");
                    }
                }
                else
                {
                    var inferred = InferTokenCountFromPlanId(p.PlanId) ?? DefaultTokensPerPack;
                    purchasedTokens += inferred == 999999 ? 0 : inferred;
                    if (DebugPlansEnabled && _loggedMissingPlans.Add(p.PlanId))
                        Console.WriteLine($"[DynamoDBService] DEBUG_PLANS: ReconcileTokens plan {p.PlanId} missing TokenCount; inferred {inferred}");
                }
            }
            catch (Exception exPlan)
            {
                var inferred = InferTokenCountFromPlanId(p.PlanId) ?? DefaultTokensPerPack;
                purchasedTokens += inferred == 999999 ? 0 : inferred;
                if (DebugPlansEnabled && _loggedMissingPlans.Add(p.PlanId))
                    Console.WriteLine($"[DynamoDBService] DEBUG_PLANS: ReconcileTokens plan lookup failed for {p.PlanId}: {exPlan.Message}. Inferred {inferred}");
            }
        }

        // IMPORTANT: Never overwrite TokensRemaining during reconciliation.
        // TokensRemaining decreases when workouts are generated. If we "recompute" it from purchases,
        // it will jump back up and users can generate workouts without spending tokens.
        //
        // Reconciliation is allowed to:
        // - keep TotalWorkouts (denominator) in sync with purchases
        // - ensure TotalWorkouts >= TokensRemaining
        var desiredTotal = tokens.TotalWorkouts;
        desiredTotal = Math.Max(desiredTotal, tokens.TokensRemaining);
        desiredTotal = Math.Max(desiredTotal, purchasedTokens);

        if (desiredTotal != tokens.TotalWorkouts)
        {
            tokens.TotalWorkouts = desiredTotal;
            tokens.ExpiresAt = null;
            tokens.IsActive = true;
            await SaveUserTokensAsync(tokens);
        }

        return tokens;
    }

    public async Task<BalanceDto> GetBalanceAsync(string deviceId)
    {
        // Reconcile tokens first
        var tokens = await ReconcileTokensAsync(deviceId);

        // Free workouts
        var freeUsed = await GetTotalFreeWorkoutsAsync(deviceId);
        var freeRemaining = Math.Max(0, 3 - freeUsed);

        // Purchases
        var purchases = await GetUserPurchasesByDeviceIdAsync(deviceId);
        var completed = purchases.Where(p => p.Status == "completed").ToList();

        // Deduplicate completed purchases by payment intent or session to avoid double-counting
        var distinctCompleted = new List<UserPurchase>();
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in completed.OrderBy(p => p.PurchasedAt))
        {
            var key = !string.IsNullOrEmpty(p.StripePaymentIntentId)
                ? $"pi:{p.StripePaymentIntentId}"
                : !string.IsNullOrEmpty(p.StripeSessionId)
                    ? $"cs:{p.StripeSessionId}"
                    : $"id:{p.PurchaseId}";

            if (seenKeys.Add(key))
            {
                distinctCompleted.Add(p);
            }
        }

        var purchasesCount = distinctCompleted.Count;
        var totalSpentCents = 0;
        // Purchase-derived totals (deduped):
        // - purchasedTokensAllTime: used for sanity-clamping corrupt TotalWorkouts values (e.g., 430)
        // - purchasedTokensAfterReset: used for post-reset calculations (if LastResetAt is set)
        var purchasedTokensAllTime = 0;
        var purchasedTokensTotal = 0;
        var purchasedUnlimited = false;
        foreach (var p in distinctCompleted)
        {
            if (p.TokensGranted.HasValue && p.TokensGranted.Value > 0)
            {
                // If we later store AmountCents on purchase, use that; fallback: infer from plan
            }
            var plan = await GetPricingPlanAsync(p.PlanId);
            if (plan != null)
            {
                totalSpentCents += (int)Math.Round(plan.Price * 100);
                if (p.IsUnlimited || plan.IsUnlimited)
                {
                    purchasedUnlimited = true;
                }
                else if (plan.TokenCount.HasValue)
                {
                    purchasedTokensAllTime += plan.TokenCount.Value;
                }
                // Only count purchases after an admin reset (if any) for denominator reconstruction.
                if (!tokens.LastResetAt.HasValue || p.PurchasedAt > tokens.LastResetAt.Value)
                {
                    if (!p.IsUnlimited && !plan.IsUnlimited && plan.TokenCount.HasValue)
                        purchasedTokensTotal += plan.TokenCount.Value;
                }
            }
            else
            {
                // Fallback: infer price from tokens granted for known default packs
                if (p.TokensGranted.HasValue)
                {
                    var tg = p.TokensGranted.Value;
                    if (tg == 10) totalSpentCents += 199; // default 10-pack
                    else if (tg == 30) totalSpentCents += 399; // default 30-pack
                    else if (tg == 100) totalSpentCents += 799; // default 100-pack
                }

                if (p.IsUnlimited) purchasedUnlimited = true;
                else if (p.TokensGranted.HasValue && p.TokensGranted.Value > 0)
                {
                    purchasedTokensAllTime += p.TokensGranted.Value;
                }

                if (!tokens.LastResetAt.HasValue || p.PurchasedAt > tokens.LastResetAt.Value)
                {
                    if (p.IsUnlimited) purchasedUnlimited = true;
                    else if (p.TokensGranted.HasValue && p.TokensGranted.Value > 0)
                    {
                        purchasedTokensTotal += p.TokensGranted.Value;
                    }
                }
            }
        }

        // Activities (generated workouts, last activity)
        int generatedWorkouts = 0;
        DateTime? lastActivity = null;
        try
        {
            var prefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var activitiesTable = $"{prefix}-CustomerActivities";
            // NOTE: CustomerActivities table is keyed by ActivityId in some deployments,
            // so querying by DeviceId will fail with "missed key schema element".
            // Use a filtered scan here (small scope) to avoid CloudWatch noise and compute last activity.
            var resp = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = activitiesTable,
                FilterExpression = "DeviceId = :deviceId",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    {":deviceId", new AttributeValue { S = deviceId } }
                },
                Limit = 200
            });

            foreach (var item in resp.Items)
            {
                var type = item.ContainsKey("ActivityType") ? item["ActivityType"].S : "";
                var ts = item.ContainsKey("Timestamp") ? DateTime.Parse(item["Timestamp"].S) : DateTime.UtcNow;
                if (type == "workout_generated") generatedWorkouts += 1;
                if (!lastActivity.HasValue || ts > lastActivity.Value) lastActivity = ts;
            }
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            // Table missing; keep balance functional without noisy logs.
        }
        catch (Amazon.Runtime.AmazonServiceException ex) when (string.Equals(ex.ErrorCode, "ValidationException", StringComparison.OrdinalIgnoreCase))
        {
            // Schema mismatch or filter issues; keep balance functional without noisy logs.
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error reading activities for balance: {ex.Message}");
        }

        // Fallback generated count if activities table missing: derive from total - remaining
        if (generatedWorkouts == 0 && tokens.TotalWorkouts > tokens.TokensRemaining)
        {
            generatedWorkouts = Math.Max(0, tokens.TotalWorkouts - tokens.TokensRemaining);
        }

        // If we have an explicit total (purchases or admin reset), show exactly that without adding free on top.
        // Otherwise (no total recorded), include free workouts in remaining/total.
        int remainingWorkouts;
        int totalWorkouts;
        if (tokens.TotalWorkouts > 0)
        {
            remainingWorkouts = tokens.TokensRemaining;
            // Reconstruct a sane denominator to avoid showing inflated totals (e.g., 109/430).
            // If there's been an admin reset, treat tokens.TotalWorkouts as "baseline + purchases after reset".
            var baseline = 0;
            if (tokens.LastResetAt.HasValue)
            {
                baseline = tokens.TotalWorkouts - purchasedTokensTotal;
                if (baseline < 0 || baseline > 100000) baseline = 0;
            }

            var reconstructedTotal = purchasedUnlimited ? 999999 : (baseline + purchasedTokensTotal);
            if (reconstructedTotal < remainingWorkouts) reconstructedTotal = remainingWorkouts;

            // If stored total is wildly higher than reconstructed totals, clamp it.
            totalWorkouts = tokens.TotalWorkouts;
            if (reconstructedTotal > 0 && totalWorkouts > reconstructedTotal * 2)
            {
                totalWorkouts = reconstructedTotal;
            }
            if (purchasedTokensAllTime > 0 && totalWorkouts > purchasedTokensAllTime * 2)
            {
                totalWorkouts = purchasedUnlimited ? 999999 : purchasedTokensAllTime;
            }
            if (totalWorkouts < remainingWorkouts) totalWorkouts = remainingWorkouts;
        }
        else
        {
            remainingWorkouts = tokens.TokensRemaining + freeRemaining;
            totalWorkouts = remainingWorkouts;
        }

        var dto = new BalanceDto
        {
            DeviceId = deviceId,
            PaidWorkoutsRemaining = tokens.TokensRemaining,
            FreeWorkoutsRemaining = freeRemaining,
            RemainingWorkouts = remainingWorkouts,
            TotalWorkouts = totalWorkouts,
            GeneratedWorkouts = generatedWorkouts,
            PurchasesCount = purchasesCount,
            TotalSpentCents = totalSpentCents,
            HasUnlimitedAccess = tokens.TokensRemaining >= 999999,
            UnlimitedExpiresAt = tokens.ExpiresAt,
            LastActivityIso = lastActivity?.ToUniversalTime().ToString("o"),
            // If a device has any paid balance, consider it active to keep Admin/Home in sync
            IsActive = tokens.IsActive || tokens.TokensRemaining > 0 || tokens.TotalWorkouts > 0
        };
        return dto;
    }

    public async Task<BalanceDto> ResetBalanceAsync(string deviceId, int newCount, string? reason = null)
    {
        // Reset tokens to exact count, clear unlimited, set totalWorkouts to newCount
        var tokens = await GetUserTokensAsync(deviceId) ?? new UserTokens { DeviceId = deviceId };
        tokens.TokensRemaining = newCount;
        tokens.TotalWorkouts = newCount;
        tokens.IsActive = true;
        tokens.ExpiresAt = null;
        tokens.LastResetAt = DateTime.UtcNow;
        await SaveUserTokensAsync(tokens);

        // Reset free usage: delete anonymous usage rows
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
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error resetting free workouts for {deviceId}: {ex.Message}");
        }

        // Log activity
        await SaveCustomerActivityAsync(new CustomerActivity
        {
            DeviceId = deviceId,
            ActivityType = "tokens_reset",
            Description = $"Tokens reset to {newCount} by admin",
            Details = new Dictionary<string, object>
            {
                { "newCount", newCount },
                { "reason", reason ?? "Admin reset" }
            }
        });

        // Return updated balance
        return await GetBalanceAsync(deviceId);
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

        try
        {
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = _contactMessagesTable,
                Item = document.ToAttributeMap()
            });
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            // Restore credits + contact flows depend on this table. Create if missing then retry once.
            await CreateTableIfMissingAsync(_contactMessagesTable, "MessageId");
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = _contactMessagesTable,
                Item = document.ToAttributeMap()
            });
        }
    }

    public async Task<AdminStats> GetAdminStatsAsync()
    {
        // This is a simplified version - in production, use CloudWatch metrics or pre-aggregated data
        var stats = new AdminStats();
        try
        {
            // Count unique device IDs in anonymous usage (free users)
            var freeUsersSet = new System.Collections.Generic.HashSet<string>();
            try
            {
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
            }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                // Quiet fallback when table missing or IAM blocks Describe/Create
                stats.FreeUsers = 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DynamoDBService] Error counting FreeUsers: {ex.Message}");
                stats.FreeUsers = 0;
            }

            // Count unique device IDs in user tokens (paid users)
            var paidUsersSet = new System.Collections.Generic.HashSet<string>();
            try
            {
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
            }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                stats.PaidUsers = 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DynamoDBService] Error counting PaidUsers: {ex.Message}");
                stats.PaidUsers = 0;
            }

            // Count total workouts
            try
            {
                var workoutsResponse = await _dynamoDB.ScanAsync(new ScanRequest
                {
                    TableName = _workoutsTable,
                    Select = Select.COUNT
                });
                stats.TotalWorkouts = workoutsResponse.Count;
                Console.WriteLine($"[DynamoDBService] TotalWorkouts count: {stats.TotalWorkouts}");
            }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                stats.TotalWorkouts = 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DynamoDBService] Error counting TotalWorkouts: {ex.Message}");
                stats.TotalWorkouts = 0;
            }

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
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                stats.TokenPurchases = 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DynamoDBService] Error counting token purchases: {ex.Message}");
                stats.TokenPurchases = 0;
            }

            return stats;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] GetAdminStatsAsync fatal error: {ex.Message}");
            return new AdminStats
            {
                FreeUsers = 0,
                PaidUsers = 0,
                TotalWorkouts = 0,
                TokenPurchases = 0
            };
        }
    }

    /// <summary>
    /// Promote pending purchases to completed by verifying payment status with Stripe, grant tokens once, and persist.
    /// </summary>
    public async Task ApplyPendingPurchasesAsync(string deviceId, string? stripeSecretKey = null)
    {
        if (string.IsNullOrEmpty(stripeSecretKey))
        {
            return;
        }

        try
        {
            var pending = (await GetUserPurchasesByDeviceIdAsync(deviceId))
                .Where(p => string.Equals(p.Status, "pending", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (!pending.Any())
            {
                return;
            }

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", stripeSecretKey);

            foreach (var purchase in pending)
            {
                try
                {
                    var sessionId = purchase.StripeSessionId;
                    var paymentIntentId = purchase.StripePaymentIntentId;
                    var planId = purchase.PlanId;
                    int tokenGrant = purchase.TokensGranted ?? 0;
                    string paymentStatus = "";
                    string sessionStatus = "";
                    string? customerEmail = null;
                    string? customerName = null;
                    string? customerPhone = null;
                    string? customerAddress1 = null;
                    string? customerCity = null;
                    string? customerState = null;
                    string? customerPostal = null;
                    string? customerCountry = null;

                    void ExtractCustomerDetails(System.Text.Json.JsonElement elem)
                    {
                        if (elem.ValueKind != System.Text.Json.JsonValueKind.Object) return;
                        if (elem.TryGetProperty("email", out var e)) customerEmail = e.GetString();
                        if (elem.TryGetProperty("name", out var n)) customerName = n.GetString();
                        if (elem.TryGetProperty("phone", out var ph)) customerPhone = ph.GetString();
                        if (elem.TryGetProperty("address", out var addr) && addr.ValueKind == System.Text.Json.JsonValueKind.Object)
                        {
                            if (addr.TryGetProperty("line1", out var line1)) customerAddress1 = line1.GetString();
                            if (addr.TryGetProperty("city", out var city)) customerCity = city.GetString();
                            if (addr.TryGetProperty("state", out var state)) customerState = state.GetString();
                            if (addr.TryGetProperty("postal_code", out var postal)) customerPostal = postal.GetString();
                            if (addr.TryGetProperty("country", out var country)) customerCountry = country.GetString();
                        }
                    }

                    // Prefer session lookup
                    if (!string.IsNullOrEmpty(sessionId))
                    {
                        var resp = await httpClient.GetAsync($"https://api.stripe.com/v1/checkout/sessions/{sessionId}");
                        if (resp.IsSuccessStatusCode)
                        {
                            var content = await resp.Content.ReadAsStringAsync();
                            var data = System.Text.Json.JsonDocument.Parse(content).RootElement;
                            if (data.TryGetProperty("payment_status", out var ps)) paymentStatus = ps.GetString() ?? "";
                            if (data.TryGetProperty("status", out var ss)) sessionStatus = ss.GetString() ?? "";
                            if (data.TryGetProperty("payment_intent", out var pi))
                            {
                                paymentIntentId = pi.GetString() ?? paymentIntentId;
                            }
                            if (data.TryGetProperty("customer_details", out var cd))
                            {
                                ExtractCustomerDetails(cd);
                            }
                            if (data.TryGetProperty("metadata", out var meta) && meta.ValueKind == System.Text.Json.JsonValueKind.Object)
                            {
                                if (string.IsNullOrEmpty(planId) && meta.TryGetProperty("planId", out var pid))
                                    planId = pid.GetString();
                                if (meta.TryGetProperty("tokenCount", out var tg) && tg.TryGetInt32(out var tgInt))
                                    tokenGrant = tgInt;
                            }
                        }
                        else
                        {
                            Console.WriteLine($"[DynamoDBService] Stripe session lookup failed for {sessionId}: {resp.StatusCode}");
                        }
                    }
                    else if (!string.IsNullOrEmpty(paymentIntentId))
                    {
                        var resp = await httpClient.GetAsync($"https://api.stripe.com/v1/payment_intents/{paymentIntentId}");
                        if (resp.IsSuccessStatusCode)
                        {
                            var content = await resp.Content.ReadAsStringAsync();
                            var data = System.Text.Json.JsonDocument.Parse(content).RootElement;
                            if (data.TryGetProperty("status", out var ps)) paymentStatus = ps.GetString() ?? "";
                            // Pull customer details from charges when using payment intent
                            if (data.TryGetProperty("charges", out var charges) &&
                                charges.TryGetProperty("data", out var arr) &&
                                arr.ValueKind == System.Text.Json.JsonValueKind.Array &&
                                arr.GetArrayLength() > 0)
                            {
                                var charge = arr[0];
                                if (charge.TryGetProperty("billing_details", out var bd))
                                {
                                    ExtractCustomerDetails(bd);
                                }
                            }
                            if (data.TryGetProperty("metadata", out var meta) && meta.ValueKind == System.Text.Json.JsonValueKind.Object)
                            {
                                if (string.IsNullOrEmpty(planId) && meta.TryGetProperty("planId", out var pid))
                                    planId = pid.GetString();
                                if (meta.TryGetProperty("tokenCount", out var tg) && tg.TryGetInt32(out var tgInt))
                                    tokenGrant = tgInt;
                            }
                        }
                        else
                        {
                            Console.WriteLine($"[DynamoDBService] Stripe payment_intent lookup failed for {paymentIntentId}: {resp.StatusCode}");
                        }
                    }

                    // Backfill tokens from plan if still missing
                    if (tokenGrant <= 0 && !string.IsNullOrEmpty(planId))
                    {
                        var plan = await GetPricingPlanAsync(planId);
                        if (plan?.TokenCount != null)
                        {
                            tokenGrant = plan.TokenCount.Value;
                        }
                    }

                    if (string.Equals(paymentStatus, "paid", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(paymentStatus, "succeeded", StringComparison.OrdinalIgnoreCase))
                    {
                        if (tokenGrant > 0)
                        {
                            var after = await IncrementUserTokensAsync(deviceId, tokenGrant);
                            Console.WriteLine($"[DynamoDBService] Applied pending purchase {purchase.PurchaseId} (+{tokenGrant}) new balance {after}");
                        }
                        purchase.Status = "completed";
                        purchase.PlanId = planId ?? purchase.PlanId;
                        purchase.TokensGranted = tokenGrant;
                        if (!string.IsNullOrWhiteSpace(paymentIntentId))
                        {
                            purchase.StripePaymentIntentId = paymentIntentId;
                        }
                        purchase.CustomerEmail = customerEmail ?? purchase.CustomerEmail;
                        purchase.CustomerName = customerName ?? purchase.CustomerName;
                        purchase.CustomerPhone = customerPhone ?? purchase.CustomerPhone;
                        purchase.CustomerAddressLine1 = customerAddress1 ?? purchase.CustomerAddressLine1;
                        purchase.CustomerCity = customerCity ?? purchase.CustomerCity;
                        purchase.CustomerState = customerState ?? purchase.CustomerState;
                        purchase.CustomerPostalCode = customerPostal ?? purchase.CustomerPostalCode;
                        purchase.CustomerCountry = customerCountry ?? purchase.CustomerCountry;
                        await SaveUserPurchaseAsync(purchase);
                    }
                    else if (string.Equals(sessionStatus, "expired", StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(paymentStatus, "canceled", StringComparison.OrdinalIgnoreCase))
                    {
                        purchase.Status = "canceled";
                        await SaveUserPurchaseAsync(purchase);
                    }
                    else
                    {
                        if (DebugPurchasesEnabled)
                        {
                            Console.WriteLine($"[DynamoDBService] DEBUG_PURCHASES: Pending purchase {purchase.PurchaseId} not paid yet (payment_status={paymentStatus}, status={sessionStatus})");
                        }
                    }
                }
                catch (Exception exInner)
                {
                    Console.WriteLine($"[DynamoDBService] Error processing pending purchase {purchase.PurchaseId}: {exInner.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] ApplyPendingPurchasesAsync error: {ex.Message}");
        }
    }

    /// <summary>
    /// Enrich completed purchases missing customer info or token counts by querying Stripe session/payment_intent.
    /// Does NOT grant tokens; only updates purchase metadata.
    /// </summary>
    public async Task EnrichPurchasesFromStripeAsync(string deviceId, string stripeSecretKey)
    {
        try
        {
            var purchases = await GetUserPurchasesByDeviceIdAsync(deviceId);
            var targets = purchases.Where(p =>
                (string.Equals(p.Status, "completed", StringComparison.OrdinalIgnoreCase) &&
                 (string.IsNullOrEmpty(p.CustomerEmail) || string.IsNullOrEmpty(p.CustomerName) || !p.TokensGranted.HasValue || p.TokensGranted.Value <= 0))
                // Historical bug: admin reset used to overwrite purchase.Status = "reset".
                // We restore a real Stripe-derived status here (without granting tokens).
                || string.Equals(p.Status, "reset", StringComparison.OrdinalIgnoreCase)
            ).ToList();

            if (!targets.Any())
            {
                return;
            }

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", stripeSecretKey);

            foreach (var purchase in targets)
            {
                try
                {
                    var sessionId = purchase.StripeSessionId;
                    var paymentIntentId = purchase.StripePaymentIntentId;
                    string paymentStatus = "";
                    string sessionStatus = "";
                    string? customerEmail = null;
                    string? customerName = null;
                    string? customerPhone = null;
                    string? customerAddress1 = null;
                    string? customerCity = null;
                    string? customerState = null;
                    string? customerPostal = null;
                    string? customerCountry = null;
                    int tokenGrant = purchase.TokensGranted ?? 0;

                    // Helper to parse customer details from JSON element
                    void ExtractCustomerDetails(System.Text.Json.JsonElement elem)
                    {
                        if (elem.ValueKind != System.Text.Json.JsonValueKind.Object) return;
                        if (elem.TryGetProperty("email", out var e)) customerEmail = e.GetString();
                        if (elem.TryGetProperty("name", out var n)) customerName = n.GetString();
                        if (elem.TryGetProperty("phone", out var ph)) customerPhone = ph.GetString();
                        if (elem.TryGetProperty("address", out var addr) && addr.ValueKind == System.Text.Json.JsonValueKind.Object)
                        {
                            if (addr.TryGetProperty("line1", out var line1)) customerAddress1 = line1.GetString();
                            if (addr.TryGetProperty("city", out var city)) customerCity = city.GetString();
                            if (addr.TryGetProperty("state", out var state)) customerState = state.GetString();
                            if (addr.TryGetProperty("postal_code", out var postal)) customerPostal = postal.GetString();
                            if (addr.TryGetProperty("country", out var country)) customerCountry = country.GetString();
                        }
                    }

                    // Prefer session lookup
                    if (!string.IsNullOrEmpty(sessionId))
                    {
                        var resp = await httpClient.GetAsync($"https://api.stripe.com/v1/checkout/sessions/{sessionId}");
                        if (resp.IsSuccessStatusCode)
                        {
                            var content = await resp.Content.ReadAsStringAsync();
                            var data = System.Text.Json.JsonDocument.Parse(content).RootElement;
                            if (data.TryGetProperty("payment_status", out var ps)) paymentStatus = ps.GetString() ?? "";
                            if (data.TryGetProperty("status", out var ss)) sessionStatus = ss.GetString() ?? "";
                            if (data.TryGetProperty("customer_details", out var cd)) ExtractCustomerDetails(cd);
                            if (data.TryGetProperty("customer", out var customerIdElem))
                            {
                                var customerId = customerIdElem.GetString();
                                if (!string.IsNullOrEmpty(customerId))
                                {
                                    var cResp = await httpClient.GetAsync($"https://api.stripe.com/v1/customers/{customerId}");
                                    if (cResp.IsSuccessStatusCode)
                                    {
                                        var cContent = await cResp.Content.ReadAsStringAsync();
                                        var cData = System.Text.Json.JsonDocument.Parse(cContent).RootElement;
                                        ExtractCustomerDetails(cData);
                                    }
                                }
                            }
                            if (data.TryGetProperty("metadata", out var meta) && meta.ValueKind == System.Text.Json.JsonValueKind.Object)
                            {
                                if (tokenGrant <= 0 && meta.TryGetProperty("tokenCount", out var tg) && tg.TryGetInt32(out var tgInt))
                                    tokenGrant = tgInt;
                                if (string.IsNullOrEmpty(purchase.PlanId) && meta.TryGetProperty("planId", out var pid))
                                    purchase.PlanId = pid.GetString();
                            }
                        }
                    }
                    else if (!string.IsNullOrEmpty(paymentIntentId))
                    {
                        var resp = await httpClient.GetAsync($"https://api.stripe.com/v1/payment_intents/{paymentIntentId}");
                        if (resp.IsSuccessStatusCode)
                        {
                            var content = await resp.Content.ReadAsStringAsync();
                            var data = System.Text.Json.JsonDocument.Parse(content).RootElement;
                            if (data.TryGetProperty("status", out var ps)) paymentStatus = ps.GetString() ?? "";
                            if (data.TryGetProperty("charges", out var charges) && charges.TryGetProperty("data", out var arr) && arr.ValueKind == System.Text.Json.JsonValueKind.Array && arr.GetArrayLength() > 0)
                            {
                                var charge = arr[0];
                                if (charge.TryGetProperty("billing_details", out var bd)) ExtractCustomerDetails(bd);
                            }
                            if (data.TryGetProperty("metadata", out var meta) && meta.ValueKind == System.Text.Json.JsonValueKind.Object)
                            {
                                if (tokenGrant <= 0 && meta.TryGetProperty("tokenCount", out var tg) && tg.TryGetInt32(out var tgInt))
                                    tokenGrant = tgInt;
                                if (string.IsNullOrEmpty(purchase.PlanId) && meta.TryGetProperty("planId", out var pid))
                                    purchase.PlanId = pid.GetString();
                            }
                        }
                    }

                    // Backfill token grant from plan if still missing
                    if (tokenGrant <= 0 && !string.IsNullOrEmpty(purchase.PlanId))
                    {
                        var plan = await GetPricingPlanAsync(purchase.PlanId);
                        if (plan?.TokenCount != null) tokenGrant = plan.TokenCount.Value;
                    }

                    // Restore a meaningful status for records that were previously clobbered to "reset"
                    if (string.Equals(purchase.Status, "reset", StringComparison.OrdinalIgnoreCase))
                    {
                        if (string.Equals(paymentStatus, "paid", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(paymentStatus, "succeeded", StringComparison.OrdinalIgnoreCase))
                        {
                            purchase.Status = "completed";
                        }
                        else if (string.Equals(sessionStatus, "expired", StringComparison.OrdinalIgnoreCase) ||
                                 string.Equals(paymentStatus, "canceled", StringComparison.OrdinalIgnoreCase) ||
                                 string.Equals(paymentStatus, "canceled", StringComparison.OrdinalIgnoreCase))
                        {
                            purchase.Status = "canceled";
                        }
                        else
                        {
                            purchase.Status = "pending";
                        }
                    }

                    purchase.CustomerEmail = customerEmail ?? purchase.CustomerEmail;
                    purchase.CustomerName = customerName ?? purchase.CustomerName;
                    purchase.CustomerPhone = customerPhone ?? purchase.CustomerPhone;
                    purchase.CustomerAddressLine1 = customerAddress1 ?? purchase.CustomerAddressLine1;
                    purchase.CustomerCity = customerCity ?? purchase.CustomerCity;
                    purchase.CustomerState = customerState ?? purchase.CustomerState;
                    purchase.CustomerPostalCode = customerPostal ?? purchase.CustomerPostalCode;
                    purchase.CustomerCountry = customerCountry ?? purchase.CustomerCountry;
                    if (tokenGrant > 0) purchase.TokensGranted = tokenGrant;

                    await SaveUserPurchaseAsync(purchase);
                }
                catch (Exception exInner)
                {
                    Console.WriteLine($"[DynamoDBService] Error enriching purchase {purchase.PurchaseId}: {exInner.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] EnrichPurchasesFromStripeAsync error: {ex.Message}");
        }
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

            // If the dedicated ContactMessages table exists but is empty (common when the table was created
            // after submissions already happened), fall back to activities so Admin UI shows history.
            if (messages.Count == 0)
            {
                var fromActivities = await GetContactMessagesFromActivitiesAsync(limit: 1000);
                if (fromActivities.Count > 0)
                {
                    Console.WriteLine($"[DynamoDBService] ContactMessages empty; returning {fromActivities.Count} contacts from activities");
                    return fromActivities;
                }
            }

            return messages.OrderByDescending(m => m.CreatedAt).ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] ContactMessages table does not exist; falling back to contact_submitted activities");
            return await GetContactMessagesFromActivitiesAsync(limit: 1000);
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
        try
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
            {
                // If table exists but item isn't present, fall back to activities (older submissions).
                return await GetContactMessageFromActivitiesAsync(messageId);
            }

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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            return await GetContactMessageFromActivitiesAsync(messageId);
        }
    }

    private async Task<List<ContactMessage>> GetContactMessagesFromActivitiesAsync(int limit = 1000)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var activitiesTable = $"{tablePrefix}-CustomerActivities";

        try
        {
            var resp = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = activitiesTable,
                FilterExpression = "ActivityType = :t",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":t", new AttributeValue { S = "contact_submitted" } }
                },
                Limit = Math.Max(10, limit)
            });

            var results = new List<ContactMessage>();
            foreach (var item in resp.Items)
            {
                var msg = MapContactMessageFromActivityItem(item);
                if (msg != null) results.Add(msg);
            }

            return results
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit)
                .ToList();
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            return new List<ContactMessage>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Fallback contact scan failed: {ex.Message}");
            return new List<ContactMessage>();
        }
    }

    private async Task<ContactMessage?> GetContactMessageFromActivitiesAsync(string messageId)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var activitiesTable = $"{tablePrefix}-CustomerActivities";

        try
        {
            var resp = await _dynamoDB.ScanAsync(new ScanRequest
            {
                TableName = activitiesTable,
                FilterExpression = "(ContactMessageId = :id OR ActivityId = :id) AND ActivityType = :t",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":id", new AttributeValue { S = messageId } },
                    { ":t", new AttributeValue { S = "contact_submitted" } }
                },
                Limit = 5
            });

            foreach (var item in resp.Items)
            {
                var msg = MapContactMessageFromActivityItem(item);
                if (msg != null) return msg;
            }
            return null;
        }
        catch
        {
            return null;
        }
    }

    private static ContactMessage? MapContactMessageFromActivityItem(Dictionary<string, AttributeValue> item)
    {
        try
        {
            var messageId = item.ContainsKey("ContactMessageId")
                ? item["ContactMessageId"].S
                : item.ContainsKey("ActivityId") ? item["ActivityId"].S : Guid.NewGuid().ToString();

            var email = item.ContainsKey("DeviceId") ? item["DeviceId"].S : "";
            var createdAt = item.ContainsKey("Timestamp") ? DateTime.Parse(item["Timestamp"].S) : DateTime.UtcNow;

            string name = "";
            string subject = "Contact Form Submission";
            string message = "(Message content unavailable — ContactMessages table was missing at submission time.)";

            if (item.ContainsKey("DetailsJson") && !string.IsNullOrWhiteSpace(item["DetailsJson"].S))
            {
                try
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(item["DetailsJson"].S);
                    if (dict != null)
                    {
                        if (dict.TryGetValue("email", out var e) && e.ValueKind == JsonValueKind.String) email = e.GetString() ?? email;
                        if (dict.TryGetValue("name", out var n) && n.ValueKind == JsonValueKind.String) name = n.GetString() ?? "";
                        if (dict.TryGetValue("subject", out var s) && s.ValueKind == JsonValueKind.String) subject = s.GetString() ?? subject;
                        if (dict.TryGetValue("message", out var m) && m.ValueKind == JsonValueKind.String) message = m.GetString() ?? message;
                    }
                }
                catch
                {
                    // ignore invalid JSON
                }
            }

            return new ContactMessage
            {
                MessageId = messageId,
                Email = email,
                Name = name,
                Subject = subject,
                Message = message,
                CreatedAt = createdAt
            };
        }
        catch
        {
            return null;
        }
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

        try
        {
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = repliesTable,
                Item = document.ToAttributeMap()
            });
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            await CreateTableIfMissingAsync(repliesTable, "ReplyId");
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = repliesTable,
                Item = document.ToAttributeMap()
            });
        }
    }

    public async Task<List<ContactReply>> GetContactRepliesAsync(string messageId)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var repliesTable = $"{tablePrefix}-ContactReplies";
        try
        {
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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            await CreateTableIfMissingAsync(repliesTable, "ReplyId");
            return new List<ContactReply>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error getting contact replies: {ex.Message}");
            return new List<ContactReply>();
        }
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

    private decimal InferPriceFromTokens(int tokens)
    {
        return tokens switch
        {
            10 => 1.99m,
            30 => 3.99m,
            70 => 5.99m,
            100 => 7.99m,
            25 => 3.99m,
            _ => 0m
        };
    }

    private List<UserPurchase> DedupCompletedPurchases(List<UserPurchase> purchases)
    {
        var completed = purchases.Where(p => string.Equals(p.Status, "completed", StringComparison.OrdinalIgnoreCase)).ToList();
        var distinct = new List<UserPurchase>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in completed.OrderBy(p => p.PurchasedAt))
        {
            var key = !string.IsNullOrEmpty(p.StripePaymentIntentId)
                ? $"pi:{p.StripePaymentIntentId}"
                : !string.IsNullOrEmpty(p.StripeSessionId)
                    ? $"cs:{p.StripeSessionId}"
                    : $"id:{p.PurchaseId}";
            if (seen.Add(key))
            {
                distinct.Add(p);
            }
        }
        return distinct;
    }

    public async Task<List<StripePurchase>> GetAllStripePurchasesAsync()
    {
        try
        {
            var userPurchases = await GetAllUserPurchasesAsync();
            var completed = DedupCompletedPurchases(userPurchases);

            var purchases = new List<StripePurchase>();
            foreach (var up in completed)
            {
                var plan = await GetPricingPlanAsync(up.PlanId);
                var amount = plan?.Price ?? InferPriceFromTokens(up.TokensGranted ?? 0);
                var currency = plan?.Currency ?? "USD";

                purchases.Add(new StripePurchase
                {
                    PurchaseId = up.PurchaseId,
                    DeviceId = up.DeviceId,
                    StripeCustomerId = "",
                    StripePaymentIntentId = up.StripePaymentIntentId,
                    StripeSessionId = up.StripeSessionId,
                    PackType = plan?.Name ?? up.PlanId,
                    Amount = amount,
                    Currency = currency,
                    TokensPurchased = up.TokensGranted ?? (up.IsUnlimited ? 999999 : 0),
                    Status = up.Status,
                    CreatedAt = up.PurchasedAt,
                    CompletedAt = up.PurchasedAt,
                    CustomerEmail = up.CustomerEmail,
                    CustomerName = up.CustomerName
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
            var completed = DedupCompletedPurchases(userPurchases);

            var purchases = new List<StripePurchase>();
            foreach (var up in completed)
            {
                var plan = await GetPricingPlanAsync(up.PlanId);
                var amount = plan?.Price ?? InferPriceFromTokens(up.TokensGranted ?? 0);
                var currency = plan?.Currency ?? "USD";
                
                purchases.Add(new StripePurchase
                {
                    PurchaseId = up.PurchaseId,
                    DeviceId = up.DeviceId,
                    StripeCustomerId = "",
                    StripePaymentIntentId = up.StripePaymentIntentId,
                    StripeSessionId = up.StripeSessionId,
                    PackType = plan?.Name ?? up.PlanId,
                    Amount = amount,
                    Currency = currency,
                    TokensPurchased = up.TokensGranted ?? (up.IsUnlimited ? 999999 : 0),
                    Status = up.Status,
                    CreatedAt = up.PurchasedAt,
                    CompletedAt = up.PurchasedAt,
                    CustomerEmail = up.CustomerEmail,
                    CustomerName = up.CustomerName
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
        if (activity.Details != null && activity.Details.Count > 0)
        {
            try
            {
                document["DetailsJson"] = JsonSerializer.Serialize(activity.Details);
            }
            catch
            {
                // best-effort; do not block request
            }
        }

        try
        {
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = activitiesTable,
                Item = document.ToAttributeMap()
            });
            
            Console.WriteLine($"[DynamoDBService] Saved activity: {activity.ActivityType} for {activity.DeviceId} at {activity.Timestamp}");
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine("[DynamoDBService] CustomerActivities table missing, creating and retrying save...");
            await CreateTableIfMissingAsync(activitiesTable, "ActivityId");
            try
            {
                await _dynamoDB.PutItemAsync(new PutItemRequest
                {
                    TableName = activitiesTable,
                    Item = document.ToAttributeMap()
                });
                Console.WriteLine($"[DynamoDBService] Saved activity after creating table: {activity.ActivityType} for {activity.DeviceId}");
            }
            catch (Exception retryEx)
            {
                Console.WriteLine($"[DynamoDBService] Retry save activity failed after table create: {retryEx.Message}");
            }
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
        
        try
        {
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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] {activitiesTable} not found, creating and returning empty list");
            await CreateTableIfMissingAsync(activitiesTable, "ActivityId");
            return new List<CustomerActivity>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error scanning {activitiesTable}: {ex.Message}");
            return new List<CustomerActivity>();
        }
    }

    public async Task<List<CustomerActivity>> GetAllActivitiesAsync(int limit = 100)
    {
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var activitiesTable = $"{tablePrefix}-CustomerActivities";
        try
        {
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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] {activitiesTable} not found in GetAllActivitiesAsync, returning empty list");
            return new List<CustomerActivity>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error scanning {activitiesTable}: {ex.Message}");
            return new List<CustomerActivity>();
        }
    }

    public async Task<List<AdminCustomerSummary>> GetAllCustomersAsync()
    {
        var deviceIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Collect device IDs from tokens
        try
        {
            var tokensResp = await _dynamoDB.ScanAsync(new ScanRequest { TableName = _userTokensTable, ProjectionExpression = "DeviceId" });
            foreach (var item in tokensResp.Items)
            {
                if (item.ContainsKey("DeviceId"))
                {
                    deviceIds.Add(item["DeviceId"].S);
                }
            }
        }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                // silent fallback
            }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error scanning UserTokens: {ex.Message}");
        }

        // Collect device IDs from purchases
        try
        {
            var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
            var purchasesTable = $"{tablePrefix}-UserPurchases";
            var resp = await _dynamoDB.ScanAsync(new ScanRequest { TableName = purchasesTable, ProjectionExpression = "DeviceId" });
            foreach (var item in resp.Items)
            {
                if (item.ContainsKey("DeviceId"))
                {
                    deviceIds.Add(item["DeviceId"].S);
                }
            }
        }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                // silent fallback
            }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error scanning purchases: {ex.Message}");
        }

        // Collect device IDs from free usage (if table exists)
        try
        {
            var freeResp = await _dynamoDB.ScanAsync(new ScanRequest { TableName = _anonymousUsageTable, ProjectionExpression = "DeviceId" });
            foreach (var item in freeResp.Items)
            {
                if (item.ContainsKey("DeviceId"))
                {
                    deviceIds.Add(item["DeviceId"].S);
                }
            }
        }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                // silent fallback
            }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error scanning AnonymousUsage: {ex.Message}");
        }

        var results = new List<AdminCustomerSummary>();
        foreach (var deviceId in deviceIds)
        {
            try
            {
                var bal = await GetBalanceAsync(deviceId);
                var isDeactivated = !bal.IsActive;
                var remainingTokens = isDeactivated ? 0 : bal.PaidWorkoutsRemaining;
                var remainingWorkouts = isDeactivated ? 0 : bal.RemainingWorkouts;
                var totalWorkouts = isDeactivated ? 0 : bal.TotalWorkouts;

                // Try to enrich with customer email/name from purchases
                string? customerEmail = null;
                string? customerName = null;
                try
                {
                    var purchases = await GetUserPurchasesByDeviceIdAsync(deviceId);
                    var withEmail = purchases.FirstOrDefault(p => !string.IsNullOrEmpty(p.CustomerEmail) || !string.IsNullOrEmpty(p.CustomerName));
                    if (withEmail != null)
                    {
                        customerEmail = withEmail.CustomerEmail;
                        customerName = withEmail.CustomerName;
                    }
                }
                catch (Exception exPurchases)
                {
                    Console.WriteLine($"[DynamoDBService] Error enriching customer info for {deviceId}: {exPurchases.Message}");
                }

                var status = isDeactivated
                    ? "Deactivated"
                    : ((remainingTokens > 0 || bal.PurchasesCount > 0) ? "Paid" : "Free");

                results.Add(new AdminCustomerSummary
                {
                    DeviceId = deviceId,
                    Email = customerEmail,
                    Name = customerName,
                    IsDeactivated = isDeactivated,
                    StatusLabel = status,
                    RemainingTokens = remainingTokens,
                    GeneratedWorkouts = bal.GeneratedWorkouts,
                    RemainingWorkouts = remainingWorkouts,
                    TotalWorkouts = totalWorkouts,
                    PurchasesCount = bal.PurchasesCount,
                    TotalSpentCents = bal.TotalSpentCents,
                    TotalSpentFormatted = $"${(bal.TotalSpentCents / 100.0m):0.00}",
                    LastActivityIso = bal.LastActivityIso
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DynamoDBService] Error building balance for {deviceId}: {ex.Message}");
            }
        }

        return results
            .OrderByDescending(c => c.LastActivityIso ?? string.Empty)
            .ToList();
    }

    public async Task<AdminCustomerDetails?> GetCustomerSummaryAsync(string deviceId)
    {
        try
        {
            var bal = await GetBalanceAsync(deviceId);
            if (bal == null) return null;

            var isDeactivated = !bal.IsActive;
            var remainingTokens = isDeactivated ? 0 : bal.PaidWorkoutsRemaining;
            var remainingWorkouts = isDeactivated ? 0 : bal.RemainingWorkouts;
            var totalWorkouts = isDeactivated ? 0 : bal.TotalWorkouts;

            // Enrich with customer email/name from purchases
            string? customerEmail = null;
            string? customerName = null;
            try
            {
                var purchasesWithEmail = await GetUserPurchasesByDeviceIdAsync(deviceId);
                var withEmail = purchasesWithEmail.FirstOrDefault(p => !string.IsNullOrEmpty(p.CustomerEmail) || !string.IsNullOrEmpty(p.CustomerName));
                if (withEmail != null)
                {
                    customerEmail = withEmail.CustomerEmail;
                    customerName = withEmail.CustomerName;
                }
            }
            catch (Exception exPurchases)
            {
                Console.WriteLine($"[DynamoDBService] Error enriching customer detail for {deviceId}: {exPurchases.Message}");
            }

            var details = new AdminCustomerDetails
            {
                DeviceId = deviceId,
                Email = customerEmail,
                Name = customerName,
                IsDeactivated = isDeactivated,
                StatusLabel = isDeactivated ? "Deactivated" : ((remainingTokens > 0 || bal.PurchasesCount > 0) ? "Paid" : "Free"),
                RemainingTokens = remainingTokens,
                GeneratedWorkouts = bal.GeneratedWorkouts,
                RemainingWorkouts = remainingWorkouts,
                TotalWorkouts = totalWorkouts,
                PurchasesCount = bal.PurchasesCount,
                TotalSpentCents = bal.TotalSpentCents,
                TotalSpentFormatted = $"${(bal.TotalSpentCents / 100.0m):0.00}",
                LastActivityIso = bal.LastActivityIso,
                FreeWorkoutsRemaining = bal.FreeWorkoutsRemaining,
                FreeWorkoutsUsed = Math.Max(0, 3 - bal.FreeWorkoutsRemaining)
            };

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
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Error building customer summary for {deviceId}: {ex.Message}");
            return null;
        }
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
                TotalWorkouts = newTokenCount,
                ExpiresAt = null, // No expiration for non-unlimited tokens
                IsActive = true
            };
        }
        else
        {
            tokens.TokensRemaining = newTokenCount;
            tokens.TotalWorkouts = newTokenCount;
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
                    var isActive = ReadBool(item, "IsActive", true);
                    if (!isActive) continue;

                    var plan = new PricingPlan
                    {
                        PlanId = item.ContainsKey("PlanId") ? item["PlanId"].S : Guid.NewGuid().ToString(),
                        Name = item.ContainsKey("Name") ? item["Name"].S : "Unknown",
                        Price = item.ContainsKey("Price") ? (item["Price"].N != null ? decimal.Parse(item["Price"].N) : decimal.Parse(item["Price"].S)) : 0,
                        Currency = item.ContainsKey("Currency") ? item["Currency"].S : "USD",
                        TokenCount = ReadInt(item, "TokenCount") ?? 0,
                        IsUnlimited = ReadBool(item, "IsUnlimited", false),
                        UnlimitedDays = ReadInt(item, "UnlimitedDays"),
                        DisplayOrder = item.ContainsKey("DisplayOrder") && item["DisplayOrder"].N != null ? int.Parse(item["DisplayOrder"].N) : 0,
                        IsRecommended = ReadBool(item, "IsRecommended", false),
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
            // Fast path: legacy/default plan IDs used historically by the frontend and Stripe.
            // Prevents noisy logs and wrong token inference (e.g., 100-pack defaulting to 10).
            var legacy = GetDefaultPricingPlans().FirstOrDefault(p => string.Equals(p.PlanId, planId, StringComparison.OrdinalIgnoreCase));
            if (legacy != null) return legacy;

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
            TokenCount = ReadInt(item, "TokenCount"),
            IsUnlimited = ReadBool(item, "IsUnlimited", false),
            UnlimitedDays = ReadInt(item, "UnlimitedDays"),
            DisplayOrder = int.Parse(item["DisplayOrder"].N),
            IsRecommended = ReadBool(item, "IsRecommended", false),
            BadgeText = item.ContainsKey("BadgeText") ? item["BadgeText"].S : null,
            MicroCopy = item.ContainsKey("MicroCopy") ? item["MicroCopy"].S : null,
            IsActive = ReadBool(item, "IsActive", true),
            StripePriceId = item.ContainsKey("StripePriceId") ? item["StripePriceId"].S : string.Empty,
            CreatedAt = DateTime.Parse(item["CreatedAt"].S),
                    UpdatedAt = item.ContainsKey("UpdatedAt") ? DateTime.Parse(item["UpdatedAt"].S) : null
                };
            }
            
            // Plan not found in DB, check default plans
            if (DebugPlansEnabled && _loggedMissingPlans.Add(planId))
                Console.WriteLine($"[DynamoDBService] DEBUG_PLANS: Plan {planId} not found in DB (caller may infer defaults)");
            return null;
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            if (DebugPlansEnabled && _loggedMissingPlans.Add(planId))
                Console.WriteLine($"[DynamoDBService] DEBUG_PLANS: PricingPlans table missing; returning inferred default for: {planId}");
            return GetDefaultPricingPlans().FirstOrDefault(p => string.Equals(p.PlanId, planId, StringComparison.OrdinalIgnoreCase));
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
        var tablePrefix = Environment.GetEnvironmentVariable("TABLE_PREFIX") ?? "AIWorkoutNow";
        var purchasesTable = $"{tablePrefix}-UserPurchases";

        var document = new Document
        {
            ["PurchaseId"] = purchase.PurchaseId,
            ["DeviceId"] = purchase.DeviceId,
            ["PlanId"] = purchase.PlanId,
            ["StripeSessionId"] = purchase.StripeSessionId,
            ["StripePaymentIntentId"] = purchase.StripePaymentIntentId,
            ["Status"] = purchase.Status,
            ["PurchasedAt"] = purchase.PurchasedAt.ToString("O"),
            ["IsUnlimited"] = purchase.IsUnlimited
        };
        if (purchase.ExpiresAt.HasValue)
            document["ExpiresAt"] = purchase.ExpiresAt.Value.ToString("O");
        if (purchase.TokensGranted.HasValue)
            document["TokensGranted"] = purchase.TokensGranted.Value;
        if (!string.IsNullOrEmpty(purchase.CustomerEmail))
            document["CustomerEmail"] = purchase.CustomerEmail;
        if (!string.IsNullOrEmpty(purchase.CustomerName))
            document["CustomerName"] = purchase.CustomerName;
        if (!string.IsNullOrEmpty(purchase.CustomerPhone))
            document["CustomerPhone"] = purchase.CustomerPhone;
        if (!string.IsNullOrEmpty(purchase.CustomerAddressLine1))
            document["CustomerAddressLine1"] = purchase.CustomerAddressLine1;
        if (!string.IsNullOrEmpty(purchase.CustomerCity))
            document["CustomerCity"] = purchase.CustomerCity;
        if (!string.IsNullOrEmpty(purchase.CustomerState))
            document["CustomerState"] = purchase.CustomerState;
        if (!string.IsNullOrEmpty(purchase.CustomerPostalCode))
            document["CustomerPostalCode"] = purchase.CustomerPostalCode;
        if (!string.IsNullOrEmpty(purchase.CustomerCountry))
            document["CustomerCountry"] = purchase.CustomerCountry;
        if (purchase.AdminNotifiedAt.HasValue)
            document["AdminNotifiedAt"] = purchase.AdminNotifiedAt.Value.ToString("O");

        try
        {
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = purchasesTable,
                Item = document.ToAttributeMap()
            });
        }
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] UserPurchases table missing, creating and retrying save...");
            await CreateTableIfMissingAsync(purchasesTable, "PurchaseId");
            try
            {
                await _dynamoDB.PutItemAsync(new PutItemRequest
                {
                    TableName = purchasesTable,
                    Item = document.ToAttributeMap()
                });
            }
            catch (Exception retryEx)
            {
                Console.WriteLine($"[DynamoDBService] Retry save purchase failed after table create: {retryEx.Message}");
            }
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
                CustomerName = item.ContainsKey("CustomerName") ? item["CustomerName"].S : null,
                AdminNotifiedAt = item.ContainsKey("AdminNotifiedAt") ? DateTime.Parse(item["AdminNotifiedAt"].S) : null
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
                        CustomerName = item.ContainsKey("CustomerName") ? item["CustomerName"].S : null,
                        AdminNotifiedAt = item.ContainsKey("AdminNotifiedAt") ? DateTime.Parse(item["AdminNotifiedAt"].S) : null
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
                    CustomerName = item.ContainsKey("CustomerName") ? item["CustomerName"].S : null,
                    CustomerPhone = item.ContainsKey("CustomerPhone") ? item["CustomerPhone"].S : null,
                    CustomerAddressLine1 = item.ContainsKey("CustomerAddressLine1") ? item["CustomerAddressLine1"].S : null,
                    CustomerCity = item.ContainsKey("CustomerCity") ? item["CustomerCity"].S : null,
                    CustomerState = item.ContainsKey("CustomerState") ? item["CustomerState"].S : null,
                    CustomerPostalCode = item.ContainsKey("CustomerPostalCode") ? item["CustomerPostalCode"].S : null,
                CustomerCountry = item.ContainsKey("CustomerCountry") ? item["CustomerCountry"].S : null,
                AdminNotifiedAt = item.ContainsKey("AdminNotifiedAt") ? DateTime.Parse(item["AdminNotifiedAt"].S) : null
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
        try
        {
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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] GetTotalFreeWorkoutsAsync error for {deviceId}: {ex.Message}");
            return 0;
        }
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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVerification table does not exist: {_emailVerificationTable}. Creating...");
            await CreateTableIfMissingAsync(_emailVerificationTable, "Email");
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = _emailVerificationTable,
                Item = new Document
                {
                    ["Email"] = code.Email.ToLowerInvariant(),
                    ["Code"] = code.Code,
                    ["ExpiresAt"] = code.ExpiresAt.ToString("O"),
                    ["Attempts"] = code.Attempts
                }.ToAttributeMap()
            });
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
        catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
        {
            Console.WriteLine($"[DynamoDBService] EmailVisitorMapping table does not exist: {_emailVisitorMappingTable}. Creating...");
            await CreateTableIfMissingAsync(_emailVisitorMappingTable, "Email");
            await _dynamoDB.PutItemAsync(new PutItemRequest
            {
                TableName = _emailVisitorMappingTable,
                Item = new Document
                {
                    ["Email"] = mapping.Email.ToLowerInvariant(),
                    ["VisitorIds"] = string.Join(",", mapping.VisitorIds),
                    ["CreatedAt"] = mapping.CreatedAt.ToString("O"),
                    ["UpdatedAt"] = mapping.UpdatedAt.ToString("O")
                }.ToAttributeMap()
            });
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
            TotalWorkouts = 0,
            ExpiresAt = null
        };
        var resetCutoff = targetTokens.LastResetAt;

        // Transfer semantics:
        // - Sum remaining balances across devices and move them to the target device.
        // - Zero source device balances to avoid double-spend.
        // - Preserve unlimited if any device is unlimited.
        int sumRemaining = targetTokens.TokensRemaining;
        int sumTotal = targetTokens.TotalWorkouts;
        DateTime? latestExpiration = targetTokens.ExpiresAt;
        bool anyUnlimited = targetTokens.TokensRemaining >= 999999;

        // Merge tokens from all source visitor IDs
        foreach (var visitorId in sourceVisitorIds)
        {
            if (visitorId == targetDeviceId) continue; // Skip self

            var sourceTokens = await GetUserTokensAsync(visitorId);
            if (sourceTokens != null && (sourceTokens.TokensRemaining > 0 || sourceTokens.TotalWorkouts > 0))
            {
                Console.WriteLine($"[DynamoDBService] Considering merge from {visitorId} with {sourceTokens.TokensRemaining} tokens");

                // GLOBAL RESET SAFETY:
                // If target device has LastResetAt, do not allow older (pre-reset) balances from other devices
                // to "come back" during restore. Instead, treat them as stale and zero them out.
                if (resetCutoff.HasValue &&
                    (!sourceTokens.LastResetAt.HasValue || sourceTokens.LastResetAt.Value < resetCutoff.Value))
                {
                    try
                    {
                        sourceTokens.TokensRemaining = 0;
                        sourceTokens.TotalWorkouts = 0;
                        sourceTokens.ExpiresAt = null;
                        sourceTokens.LastResetAt = resetCutoff;
                        await SaveUserTokensAsync(sourceTokens);
                        Console.WriteLine($"[DynamoDBService] Skipped merge from {visitorId} due to admin reset cutoff {resetCutoff.Value:o}; zeroed stale balance");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DynamoDBService] Failed to zero stale source device {visitorId}: {ex.Message}");
                    }
                    continue;
                }
                
                // If source has unlimited (999999), preserve unlimited status
                if (sourceTokens.TokensRemaining >= 999999)
                {
                    anyUnlimited = true;
                    // Use the latest expiration date
                    if (sourceTokens.ExpiresAt.HasValue && 
                        (!latestExpiration.HasValue || sourceTokens.ExpiresAt.Value > latestExpiration.Value))
                    {
                        latestExpiration = sourceTokens.ExpiresAt;
                    }
                }
                else if (!anyUnlimited)
                {
                    sumRemaining += Math.Max(0, sourceTokens.TokensRemaining);
                    sumTotal += Math.Max(0, sourceTokens.TotalWorkouts);
                    // Keep the latest expiration if any (for non-unlimited packs)
                    if (sourceTokens.ExpiresAt.HasValue &&
                        (!latestExpiration.HasValue || sourceTokens.ExpiresAt.Value > latestExpiration.Value))
                    {
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

                // Zero-out source device so balances are consolidated and not spendable twice.
                try
                {
                    sourceTokens.TokensRemaining = 0;
                    sourceTokens.TotalWorkouts = 0;
                    sourceTokens.ExpiresAt = null;
                    await SaveUserTokensAsync(sourceTokens);
                    Console.WriteLine($"[DynamoDBService] Zeroed source device tokens for {visitorId} after merge");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DynamoDBService] Failed to zero source device {visitorId}: {ex.Message}");
                }
            }
        }

        // Update target device tokens
        targetTokens.TokensRemaining = anyUnlimited ? 999999 : sumRemaining;
        targetTokens.TotalWorkouts = anyUnlimited ? 999999 : sumTotal;
        targetTokens.ExpiresAt = latestExpiration;
        await SaveUserTokensAsync(targetTokens);
        
        Console.WriteLine($"[DynamoDBService] Merged credits complete - Target device now has {targetTokens.TokensRemaining}/{targetTokens.TotalWorkouts} tokens, expires: {latestExpiration}");
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
            // Legacy IDs still referenced by older frontend deployments / Stripe purchases
            new PricingPlan
            {
                PlanId = "default-10-workouts",
                Name = "10 Workouts",
                Price = 1.99m,
                Currency = "USD",
                TokenCount = 10,
                IsUnlimited = false,
                DisplayOrder = 1,
                IsRecommended = false,
                IsActive = true,
                StripePriceId = string.Empty,
                CreatedAt = DateTime.UtcNow
            },
            new PricingPlan
            {
                PlanId = "default-30-workouts",
                Name = "30 Workouts",
                Price = 3.99m,
                Currency = "USD",
                TokenCount = 30,
                IsUnlimited = false,
                DisplayOrder = 2,
                IsRecommended = true,
                BadgeText = "⭐ Most Popular",
                IsActive = true,
                StripePriceId = string.Empty,
                CreatedAt = DateTime.UtcNow
            },
            new PricingPlan
            {
                PlanId = "default-100-workouts",
                Name = "100 Workouts",
                Price = 7.99m,
                Currency = "USD",
                TokenCount = 100,
                IsUnlimited = false,
                DisplayOrder = 3,
                IsRecommended = false,
                IsActive = true,
                StripePriceId = string.Empty,
                CreatedAt = DateTime.UtcNow
            },
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
                // Prefer the modern 100-pack; keep Power User as fallback if it's still in the DB.
                TokenCount = 100,
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

    private async Task CreateTableIfMissingAsync(string tableName, string hashKeyName)
    {
        try
        {
            // First try describe (avoids ListTables permission)
            try
            {
                await _dynamoDB.DescribeTableAsync(tableName);
                return; // table exists
            }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                // proceed to create
            }

            await _dynamoDB.CreateTableAsync(new CreateTableRequest
            {
                TableName = tableName,
                AttributeDefinitions = new List<AttributeDefinition>
                {
                    new AttributeDefinition(hashKeyName, ScalarAttributeType.S)
                },
                KeySchema = new List<KeySchemaElement>
                {
                    new KeySchemaElement(hashKeyName, KeyType.HASH)
                },
                BillingMode = BillingMode.PAY_PER_REQUEST
            });

            await WaitForActiveTableAsync(tableName);
            Console.WriteLine($"[DynamoDBService] Created table {tableName} with hash key {hashKeyName}");
        }
        catch (Amazon.DynamoDBv2.Model.ResourceInUseException)
        {
            // Table already exists or being created; safe to ignore
        }
        catch (Amazon.Runtime.AmazonServiceException ex) when (string.Equals(ex.ErrorCode, "AccessDeniedException", StringComparison.OrdinalIgnoreCase))
        {
            // Assume the table exists but IAM blocks Describe/Create. Be quiet to avoid noisy logs.
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Failed to create table {tableName}: {ex.Message}");
        }
    }

    private async Task CreateTableIfMissingAsync(string tableName, string hashKeyName, string rangeKeyName)
    {
        try
        {
            // First try describe (avoids ListTables permission)
            try
            {
                await _dynamoDB.DescribeTableAsync(tableName);
                return; // table exists
            }
            catch (Amazon.DynamoDBv2.Model.ResourceNotFoundException)
            {
                // proceed to create
            }

            await _dynamoDB.CreateTableAsync(new CreateTableRequest
            {
                TableName = tableName,
                AttributeDefinitions = new List<AttributeDefinition>
                {
                    new AttributeDefinition(hashKeyName, ScalarAttributeType.S),
                    new AttributeDefinition(rangeKeyName, ScalarAttributeType.S)
                },
                KeySchema = new List<KeySchemaElement>
                {
                    new KeySchemaElement(hashKeyName, KeyType.HASH),
                    new KeySchemaElement(rangeKeyName, KeyType.RANGE)
                },
                BillingMode = BillingMode.PAY_PER_REQUEST
            });

            await WaitForActiveTableAsync(tableName);
            Console.WriteLine($"[DynamoDBService] Created table {tableName} with hash key {hashKeyName} and range key {rangeKeyName}");
        }
        catch (Amazon.DynamoDBv2.Model.ResourceInUseException)
        {
            // Table already exists or being created; safe to ignore
        }
        catch (Amazon.Runtime.AmazonServiceException ex) when (string.Equals(ex.ErrorCode, "AccessDeniedException", StringComparison.OrdinalIgnoreCase))
        {
            // Assume the table exists but IAM blocks Describe/Create. Be quiet to avoid noisy logs.
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DynamoDBService] Failed to create table {tableName}: {ex.Message}");
        }
    }

    private async Task WaitForActiveTableAsync(string tableName)
    {
        for (int i = 0; i < 5; i++)
        {
            try
            {
                var status = (await _dynamoDB.DescribeTableAsync(tableName)).Table.TableStatus;
                if (string.Equals(status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }
            }
            catch
            {
                // ignore and retry
            }

            await Task.Delay(1000);
        }
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

