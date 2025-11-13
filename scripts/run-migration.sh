#!/bin/bash

# =====================================================
# Apply Missing Columns Migration
# =====================================================
# This script applies the missing columns SQL file to your Supabase database
# =====================================================

set -e  # Exit on error

echo "🚀 Starting database migration..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Check for required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
    exit 1
fi

# Extract database connection details from Supabase URL
# Format: https://xxxxx.supabase.co
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "📊 Connection Details:"
echo "  Project: $PROJECT_REF"
echo "  Host: db.${PROJECT_REF}.supabase.co"
echo ""

# Build connection string
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "🔐 Note: You'll be prompted for your Supabase database password"
echo "   (This is your project's database password, not the service role key)"
echo ""
echo "💡 To find your password:"
echo "   1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "   2. Look for 'Database Password' or reset it if needed"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Apply the migration
echo "📄 Applying migration: scripts/add-missing-columns.sql"
echo ""

psql "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" \
    -f scripts/add-missing-columns.sql \
    --echo-errors \
    --quiet

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "💡 Next steps:"
    echo "  1. Restart your dev server (if running)"
    echo "  2. Refresh your documents page"
    echo "  3. All columns should now be available"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    exit 1
fi
