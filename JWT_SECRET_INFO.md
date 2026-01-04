# JWT Secret Information

## What is the JWT Secret?

The JWT secret is used to:
- **Sign** JWT tokens when admins log in
- **Verify** JWT tokens for protected admin endpoints
- Ensure only valid admin sessions can access admin features

## How to Generate a JWT Secret

### Option 1: Using the Script (Recommended)

```bash
./generate-jwt-secret.sh
```

This will:
- Generate a secure 64-character random secret
- Save it to SSM Parameter Store at `/aiworkoutnow/jwt-secret`
- Display it so you can save it securely

### Option 2: Manual Generation

```bash
# Generate secret
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64

# Save to SSM
aws ssm put-parameter \
  --name /aiworkoutnow/jwt-secret \
  --value "your-generated-secret" \
  --type SecureString \
  --overwrite
```

### Option 3: Online Generator

You can also use any secure random string generator, but make sure it's:
- At least 32 characters long (64+ recommended)
- Cryptographically random
- Saved securely

## Security Best Practices

1. **Never commit** the JWT secret to Git
2. **Store securely** - Use SSM Parameter Store (SecureString) ✅
3. **Rotate periodically** - Change it if compromised
4. **Use different secrets** for different environments (dev/staging/prod)

## Current Secret Location

- **SSM Parameter**: `/aiworkoutnow/jwt-secret`
- **Type**: SecureString (encrypted)
- **Access**: Lambda function can read it automatically

## How Lambda Uses It

The Lambda function reads the JWT secret from SSM Parameter Store on startup:
- No need to set it as environment variable
- Automatically decrypted by AWS
- Secure and managed by AWS

## If You Need to Rotate the Secret

1. Generate new secret: `./generate-jwt-secret.sh`
2. Update SSM parameter (script does this automatically)
3. Restart Lambda function (or wait for next cold start)
4. All existing admin sessions will be invalidated (they'll need to log in again)

## Testing

After setting the secret, test admin login:
```bash
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your-password"}'
```

This should return a JWT token if credentials are correct.

