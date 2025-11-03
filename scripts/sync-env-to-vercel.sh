#!/bin/bash

# Sync environment variables from .env.local to Vercel
# This script reads your local .env.local file and adds the API keys to Vercel

echo "🔧 Syncing environment variables to Vercel..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI not installed!"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

# Extract and add each API key to Vercel
echo "Adding API keys to Vercel..."
echo ""

# Read each key from .env.local and add to Vercel
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # Only process API keys we need for features
    if [[ "$key" == "OPENAI_API_KEY" ]] || \
       [[ "$key" == "LEMONFOX_API_KEY" ]] || \
       [[ "$key" == "DEEPSEEK_API_KEY" ]] || \
       [[ "$key" == "ANTHROPIC_API_KEY" ]]; then

        echo "Adding $key to Vercel..."
        # Add to production, preview, and development environments
        vercel env add "$key" production <<< "$value" 2>/dev/null || echo "  (already exists in production)"
        vercel env add "$key" preview <<< "$value" 2>/dev/null || echo "  (already exists in preview)"
        vercel env add "$key" development <<< "$value" 2>/dev/null || echo "  (already exists in development)"
        echo "✓ $key added"
        echo ""
    fi
done < .env.local

echo ""
echo "✅ Environment variables synced to Vercel!"
echo ""
echo "Next steps:"
echo "1. Redeploy your application: vercel --prod"
echo "   OR go to Vercel dashboard and trigger a redeploy"
echo "2. Test podcast generation and mind map node expansion"
