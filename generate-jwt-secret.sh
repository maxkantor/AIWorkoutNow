#!/bin/bash

# Generate and save JWT secret to SSM Parameter Store

echo "🔐 Generating JWT Secret..."

# Generate a secure random 64-character secret
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)

echo "Generated secret (64 characters):"
echo "$JWT_SECRET"
echo ""

# Save to SSM
echo "Saving to SSM Parameter Store..."
aws ssm put-parameter \
  --name /aiworkoutnow/jwt-secret \
  --value "$JWT_SECRET" \
  --type SecureString \
  --overwrite \
  --region us-east-1 > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ JWT secret saved to: /aiworkoutnow/jwt-secret"
    echo ""
    echo "⚠️  Save this secret securely:"
    echo "   $JWT_SECRET"
    echo ""
    echo "This secret is used for:"
    echo "  - Signing JWT tokens for admin authentication"
    echo "  - Verifying admin login tokens"
else
    echo "❌ Failed to save secret"
    exit 1
fi

