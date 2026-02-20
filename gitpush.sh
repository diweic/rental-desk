#!/bin/zsh
# Usage: ./gitpush.sh "Your commit message"
# Description: Adds all changes, commits with message, and pushes to main branch.

if [ -z "$1" ]; then
  echo "You forget your commit message! Usage: ./gitpush.sh \"your commit message\""
  exit 1
fi

git add .
git commit -m "$1"
git push origin main
