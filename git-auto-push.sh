#!/bin/bash

# Helper script to commit and push changes
# Usage: ./git-auto-push.sh "commit message"

set -e

COMMIT_MSG=${1:-"Auto-commit: $(date +'%Y-%m-%d %H:%M:%S')"}

echo "📝 Staging all changes..."
git add -A

echo "💾 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" || {
    echo "⚠️  No changes to commit"
    exit 0
}

echo "🚀 Pushing to remote..."
BRANCH=$(git symbolic-ref --short HEAD)
git push origin "$BRANCH"

echo "✅ Changes committed and pushed!"

