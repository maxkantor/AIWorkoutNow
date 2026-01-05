# Stripe Integration Setup

## Key Storage

Stripe keys are stored in **AWS Systems Manager (SSM) Parameter Store** with the following paths:

### SSM Parameter Paths (using TABLE_PREFIX)

- **Secret Key**: `/{TABLE_PREFIX}/stripe-secret-key` (SecureString)
- **Webhook Secret**: `/{TABLE_PREFIX}/stripe-webhook-secret` (SecureString)  
- **Publishable Key**: `/{TABLE_PREFIX}/stripe-publishable-key` (String)

Default TABLE_PREFIX is `AIWorkoutNow`, so paths are:
- `/AIWorkoutNow/stripe-secret-key`
- `/AIWorkoutNow/stripe-webhook-secret`
- `/AIWorkoutNow/stripe-publishable-key`

### Fallback

If SSM parameters don't exist, the system falls back to environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY`

## Setup Instructions

### 1. Create Stripe Account & Get Keys

1. Go to https://dashboard.stripe.com
2. Get your **Secret Key** (starts with `sk_test_` for test, `sk_live_` for production)
3. Get your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

### 2. Store Keys in AWS SSM Parameter Store

```bash
# Secret Key (SecureString - encrypted)
aws ssm put-parameter \
  --name "/AIWorkoutNow/stripe-secret-key" \
  --value "sk_test_..." \
  --type "SecureString" \
  --region us-east-1

# Webhook Secret (SecureString - encrypted)
aws ssm put-parameter \
  --name "/AIWorkoutNow/stripe-webhook-secret" \
  --value "whsec_..." \
  --type "SecureString" \
  --region us-east-1

# Publishable Key (String - not encrypted, safe to expose)
aws ssm put-parameter \
  --name "/AIWorkoutNow/stripe-publishable-key" \
  --value "pk_test_..." \
  --type "String" \
  --region us-east-1
```

### 3. Create Stripe Products & Prices

For each pricing plan in your Admin CRM:

1. Go to Stripe Dashboard → Products
2. Create a product for each plan (e.g., "Starter Boost", "Regular Trainer")
3. Create a **Price** for each product:
   - Type: **One-time**
   - Amount: Set the price (e.g., $1.99 = 199 cents)
   - Currency: USD
4. Copy the **Price ID** (starts with `price_`)
5. In Admin CRM, set the `StripePriceId` for each pricing plan

### 4. Configure Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-api-gateway-url/stripe-webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)
6. Store it in SSM as shown above

### 5. Lambda IAM Permissions

Ensure your Lambda execution role has permission to read SSM parameters:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:*:parameter/AIWorkoutNow/*"
      ]
    }
  ]
}
```

## Testing

### Test Mode

Use Stripe test keys:
- Test Secret Key: `sk_test_...`
- Test Publishable Key: `pk_test_...`
- Test card: `4242 4242 4242 4242`

### Production

Switch to live keys when ready:
- Live Secret Key: `sk_live_...`
- Live Publishable Key: `pk_live_...`

## Security Best Practices

✅ **DO:**
- Store secret keys in SSM Parameter Store as SecureString
- Use IAM roles to restrict access
- Rotate keys periodically
- Use different keys for test/production

❌ **DON'T:**
- Commit keys to Git
- Hardcode keys in code
- Store keys in environment variables (use SSM)
- Share keys between environments

## Troubleshooting

### "Stripe not configured" error
- Check SSM parameters exist: `aws ssm get-parameter --name "/AIWorkoutNow/stripe-secret-key"`
- Verify Lambda IAM role has SSM permissions
- Check CloudWatch logs for SSM errors

### Webhook not working
- Verify webhook URL is accessible
- Check webhook secret matches SSM parameter
- View webhook events in Stripe Dashboard

### Checkout session fails
- Verify StripePriceId is set correctly in pricing plans
- Check Price ID exists in Stripe Dashboard
- Ensure Price is active and in correct currency
