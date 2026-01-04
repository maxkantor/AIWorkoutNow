#!/bin/bash

# Script to create an admin user in DynamoDB
# Usage: ./create-admin-user.sh <email> <password>

set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <email> <password>"
    exit 1
fi

EMAIL=$1
PASSWORD=$2
ADMIN_ID="admin-$(date +%s)"
TABLE_NAME="AIWorkoutNow-AdminUsers"

echo "Creating admin user..."
echo "Email: $EMAIL"
echo "Admin ID: $ADMIN_ID"

# Note: You'll need to hash the password using bcrypt
# This script assumes you have a .NET tool or script to hash passwords
# For now, you can use the .NET code:
# var hash = BCrypt.Net.BCrypt.HashPassword("your-password");

echo ""
echo "To hash the password, use this C# code:"
echo "  var hash = BCrypt.Net.BCrypt.HashPassword(\"$PASSWORD\");"
echo ""
echo "Then run:"
echo "aws dynamodb put-item --table-name $TABLE_NAME --item '{\"AdminId\":{\"S\":\"$ADMIN_ID\"},\"Email\":{\"S\":\"$EMAIL\"},\"PasswordHash\":{\"S\":\"<hashed-password>\"},\"Role\":{\"S\":\"admin\"},\"CreatedAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}'"

