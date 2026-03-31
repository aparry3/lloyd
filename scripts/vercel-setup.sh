#!/bin/bash
# Vercel deployment setup for Lloyd
# Usage: VERCEL_TOKEN=<token> ./scripts/vercel-setup.sh
#   or:  ./scripts/vercel-setup.sh <token>

set -euo pipefail

TOKEN="${1:-${VERCEL_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "Error: Vercel token required. Pass as argument or set VERCEL_TOKEN env var."
  echo "Get it from 1Password: op read 'op://Personal/Vercel Token/password'"
  exit 1
fi

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

echo "==> Setting up Vercel project for Lloyd..."

# Link project (create if doesn't exist)
echo "==> Linking project..."
vercel link --yes --token "$TOKEN" --project lloyd 2>&1 || \
  vercel link --yes --token "$TOKEN" 2>&1

# Set environment variables for all environments (production, preview, development)
echo "==> Setting environment variables..."

# DATABASE_URL from .env
DB_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
if [ -n "$DB_URL" ]; then
  echo "$DB_URL" | vercel env add DATABASE_URL production --token "$TOKEN" --force 2>&1 || true
  echo "$DB_URL" | vercel env add DATABASE_URL preview --token "$TOKEN" --force 2>&1 || true
fi

# Twilio
TWILIO_SID=$(grep '^TWILIO_ACCOUNT_SID=' .env | cut -d= -f2-)
TWILIO_TOKEN=$(grep '^TWILIO_AUTH_TOKEN=' .env | cut -d= -f2-)
TWILIO_PHONE=$(grep '^TWILIO_PHONE_NUMBER=' .env | cut -d= -f2-)
[ -n "$TWILIO_SID" ] && echo "$TWILIO_SID" | vercel env add TWILIO_ACCOUNT_SID production preview --token "$TOKEN" --force 2>&1 || true
[ -n "$TWILIO_TOKEN" ] && echo "$TWILIO_TOKEN" | vercel env add TWILIO_AUTH_TOKEN production preview --token "$TOKEN" --force 2>&1 || true
[ -n "$TWILIO_PHONE" ] && echo "$TWILIO_PHONE" | vercel env add TWILIO_PHONE_NUMBER production preview --token "$TOKEN" --force 2>&1 || true

# SendGrid
SG_KEY=$(grep '^SENDGRID_API_KEY=' .env | cut -d= -f2-)
SG_EMAIL=$(grep '^SENDGRID_FROM_EMAIL=' .env | cut -d= -f2-)
SG_DOMAIN=$(grep '^SENDGRID_INBOUND_DOMAIN=' .env | cut -d= -f2-)
[ -n "$SG_KEY" ] && echo "$SG_KEY" | vercel env add SENDGRID_API_KEY production preview --token "$TOKEN" --force 2>&1 || true
[ -n "$SG_EMAIL" ] && echo "$SG_EMAIL" | vercel env add SENDGRID_FROM_EMAIL production preview --token "$TOKEN" --force 2>&1 || true
[ -n "$SG_DOMAIN" ] && echo "$SG_DOMAIN" | vercel env add SENDGRID_INBOUND_DOMAIN production preview --token "$TOKEN" --force 2>&1 || true

# OpenAI
OAI_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)
[ -n "$OAI_KEY" ] && echo "$OAI_KEY" | vercel env add OPENAI_API_KEY production preview --token "$TOKEN" --force 2>&1 || true

# App URLs
echo "https://heylloyd.co" | vercel env add BASE_URL production --token "$TOKEN" --force 2>&1 || true
echo "https://heylloyd.co" | vercel env add NEXT_PUBLIC_BASE_URL production --token "$TOKEN" --force 2>&1 || true

echo "==> Deploying to production..."
vercel deploy --prod --token "$TOKEN" 2>&1

echo "==> Done! Check https://heylloyd.co"
