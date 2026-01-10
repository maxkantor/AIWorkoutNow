#!/bin/bash

# Simple script to create admin user - uses Python bcrypt
set -e

EMAIL=${1:-"admin@aiworkoutnow.com"}
PASSWORD=${2:-"Maxang11@@"}
ADMIN_ID="admin-$(date +%s)"
TABLE_NAME="AIWorkoutNow-AdminUsers"
REGION="us-east-1"

echo "🔐 Creating admin user..."
echo "Email: $EMAIL"
echo ""

# Check if Python bcrypt is available
if ! python3 -c "import bcrypt" 2>/dev/null; then
    echo "Installing bcrypt..."
    pip3 install bcrypt --quiet 2>/dev/null || {
        echo "❌ Please install bcrypt: pip3 install bcrypt"
        exit 1
    }
fi

# Hash password
echo "Hashing password..."
HASHED_PASSWORD=$(python3 << EOF
import bcrypt
password = "$PASSWORD"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
print(hashed.decode('utf-8'))
EOF
)

if [ -z "$HASHED_PASSWORD" ]; then
    echo "❌ Failed to hash password"
    exit 1
fi

echo "✅ Password hashed"
echo ""

# Create admin user
CREATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "📝 Creating admin user in DynamoDB..."
aws dynamodb put-item \
    --table-name "$TABLE_NAME" \
    --item "{
        \"AdminId\": {\"S\": \"$ADMIN_ID\"},
        \"Email\": {\"S\": \"$EMAIL\"},
        \"PasswordHash\": {\"S\": \"$HASHED_PASSWORD\"},
        \"Role\": {\"S\": \"admin\"},
        \"CreatedAt\": {\"S\": \"$CREATED_AT\"}
    }" \
    --region "$REGION" > /dev/null

echo "✅ Admin user created successfully!"
echo ""
echo "📋 Login Credentials:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
echo "🔗 Access admin dashboard at: /admin/login (once frontend is deployed)"


