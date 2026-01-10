#!/bin/bash

# Script to create a private GitHub repository and push code
# Usage: ./create-github-repo.sh <repo-name> [github-token]
# If token is not provided, it will prompt you or you can set GITHUB_TOKEN env var

set -e

REPO_NAME=${1:-"AIWorkoutNow"}
GITHUB_TOKEN=${2:-$GITHUB_TOKEN}
GITHUB_USER=${GITHUB_USER:-$(git config user.name)}

if [ -z "$GITHUB_TOKEN" ]; then
    echo "GitHub token not found. Please either:"
    echo "  1. Set GITHUB_TOKEN environment variable"
    echo "  2. Pass token as second argument: ./create-github-repo.sh $REPO_NAME <token>"
    echo "  3. Create repo manually at https://github.com/new"
    echo ""
    echo "To get a token:"
    echo "  1. Go to https://github.com/settings/tokens"
    echo "  2. Generate new token (classic) with 'repo' scope"
    echo ""
    read -p "Enter your GitHub token (or press Enter to create repo manually): " GITHUB_TOKEN
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo ""
    echo "Creating repo manually..."
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: $REPO_NAME"
    echo "3. Set to Private"
    echo "4. DO NOT initialize with README, .gitignore, or license"
    echo "5. Click 'Create repository'"
    echo ""
    read -p "Enter the repository URL (e.g., https://github.com/username/$REPO_NAME.git): " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        echo "No URL provided. Exiting."
        exit 1
    fi
    
    git remote add origin "$REPO_URL"
    git push -u origin main
    echo "✅ Code pushed to $REPO_URL"
    exit 0
fi

# Get GitHub username from API
if [ -z "$GITHUB_USER" ]; then
    GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -o '"login":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$GITHUB_USER" ]; then
    echo "Failed to get GitHub username. Please set GITHUB_USER environment variable."
    exit 1
fi

echo "Creating private repository: $GITHUB_USER/$REPO_NAME"

# Create repository via GitHub API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$REPO_NAME\",\"private\":true,\"description\":\"AI-powered workout generator SaaS - React frontend, .NET 8 Lambda backend\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$REPO_NAME" | head -n -1)

if [ "$HTTP_CODE" != "201" ]; then
    echo "Failed to create repository. HTTP code: $HTTP_CODE"
    echo "Response: $BODY"
    exit 1
fi

REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "✅ Repository created: $REPO_URL"

# Add remote and push
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
git push -u origin main

echo "✅ Code pushed successfully!"
echo "Repository URL: https://github.com/$GITHUB_USER/$REPO_NAME"


