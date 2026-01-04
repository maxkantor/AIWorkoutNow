#!/bin/bash

# Complete script to create admin user with password hashing
set -e

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <email> [password]"
    echo "Example: $0 admin@aiworkoutnow.com Maxang11@@"
    exit 1
fi

EMAIL=$1
PASSWORD=${2:-"Maxang11@@"}
ADMIN_ID="admin-$(date +%s)"
TABLE_NAME="AIWorkoutNow-AdminUsers"
REGION="us-east-1"

echo "🔐 Creating admin user..."
echo "Email: $EMAIL"
echo "Admin ID: $ADMIN_ID"
echo ""

# Hash password using .NET
echo "Hashing password..."
cd "$(dirname "$0")/../backend/AIWorkoutNow.Api"

# Create a temporary C# script to hash the password
cat > /tmp/hash-password-temp.cs << 'EOF'
using System;
using BCrypt.Net;

class Program {
    static void Main(string[] args) {
        if (args.Length < 1) {
            Console.Error.WriteLine("Usage: hash-password <password>");
            Environment.Exit(1);
        }
        string password = args[0];
        string hash = BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt());
        Console.WriteLine(hash);
    }
}
EOF

# Try to compile and run the hash script
HASHED_PASSWORD=$(dotnet run --no-build --project . -- hash "$PASSWORD" 2>/dev/null || \
    dotnet script /tmp/hash-password-temp.cs -- "$PASSWORD" 2>/dev/null || \
    echo "")

# If dotnet script doesn't work, use Python or Node.js as fallback
if [ -z "$HASHED_PASSWORD" ]; then
    echo "Using Python to hash password..."
    HASHED_PASSWORD=$(python3 << EOF
import bcrypt
password = "$PASSWORD"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
print(hashed.decode('utf-8'))
EOF
)
fi

if [ -z "$HASHED_PASSWORD" ]; then
    echo "❌ Failed to hash password. Please install bcrypt tools."
    echo ""
    echo "Alternative: Use this online tool or .NET code:"
    echo "  var hash = BCrypt.Net.BCrypt.HashPassword(\"$PASSWORD\");"
    exit 1
fi

echo "✅ Password hashed"
echo ""

# Create admin user in DynamoDB
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
echo "📋 Admin Details:"
echo "   Email: $EMAIL"
echo "   Admin ID: $ADMIN_ID"
echo "   Role: admin"
echo ""
echo "🔗 Login at:"
echo "   https://your-amplify-url.com/admin/login"
echo ""
echo "💡 You can now log in with:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"

