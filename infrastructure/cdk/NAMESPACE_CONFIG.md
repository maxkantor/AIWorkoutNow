# DynamoDB Table Naming with Namespace

The DynamoDB tables are now configured to use a namespace-based naming convention to ensure uniqueness across different deployments.

## Table Naming Convention

Tables are named using the pattern: `{namespace}-{environment}-{table-name}`

### Default Values
- **Namespace**: `aiworkoutnow` (configurable via `NAMESPACE` environment variable)
- **Environment**: `production` (configurable via `ENVIRONMENT` environment variable)

### Example Table Names
With default values (`namespace=aiworkoutnow`, `environment=production`):
- `aiworkoutnow-production-workouts`
- `aiworkoutnow-production-anonymous-usage`
- `aiworkoutnow-production-user-tokens`
- `aiworkoutnow-production-progress-logs`
- `aiworkoutnow-production-admin-users`
- `aiworkoutnow-production-contact-messages`

## Configuration

### CDK Deployment

Set namespace and environment when deploying:

```bash
export NAMESPACE=mycompany
export ENVIRONMENT=production
cd infrastructure/cdk
npx cdk deploy
```

Or in the CDK code (`bin/cdk.ts`):
```typescript
new AIWorkoutNowStack(app, 'AIWorkoutNowStack', {
  namespace: 'mycompany',
  environment: 'production',
  // ...
});
```

### Lambda Environment Variables

The Lambda function automatically detects table names from environment variables:

**Option 1: Use namespace and environment (recommended)**
```bash
DYNAMODB_NAMESPACE=mycompany
ENVIRONMENT=production
```

**Option 2: Set individual table names**
```bash
WORKOUTS_TABLE=mycompany-production-workouts
ANONYMOUS_USAGE_TABLE=mycompany-production-anonymous-usage
USER_TOKENS_TABLE=mycompany-production-user-tokens
PROGRESS_LOGS_TABLE=mycompany-production-progress-logs
ADMIN_USERS_TABLE=mycompany-production-admin-users
CONTACT_MESSAGES_TABLE=mycompany-production-contact-messages
```

## Benefits

1. **Uniqueness**: Prevents table name conflicts across different deployments
2. **Multi-tenant**: Support multiple environments (dev, staging, production)
3. **Organization**: Clear namespace for your organization/company
4. **Flexibility**: Override individual table names if needed

## Migration

If you have existing tables with the old naming (`AIWorkoutNow-*`), you can:

1. **Option A**: Keep using old names by setting environment variables:
   ```bash
   WORKOUTS_TABLE=AIWorkoutNow-Workouts
   # ... etc
   ```

2. **Option B**: Migrate data to new tables (recommended for new deployments)

## CDK Outputs

After deployment, the CDK stack outputs:
- `Namespace`: The namespace used
- `TablePrefix`: The prefix used for all tables (`{namespace}-{environment}`)

Use these outputs to configure your Lambda function environment variables.

