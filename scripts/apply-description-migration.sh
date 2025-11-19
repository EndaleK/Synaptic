#!/bin/bash

# Script to apply the mindmap description column migration to production
# Usage: ./scripts/apply-description-migration.sh

echo "🔍 Checking production database connection..."

# Check if SUPABASE environment variables are set
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: DATABASE_URL or SUPABASE_DB_URL not set"
  echo ""
  echo "Please set one of the following:"
  echo "  export DATABASE_URL='postgresql://...' (from Supabase Settings > Database > Connection String)"
  echo "  export SUPABASE_DB_URL='postgresql://...' (alternative name)"
  exit 1
fi

# Use DATABASE_URL or fall back to SUPABASE_DB_URL
DB_URL="${DATABASE_URL:-$SUPABASE_DB_URL}"

echo "✅ Database URL found"
echo ""
echo "📋 Migration: Add description column to mindmaps table"
echo ""
echo "This migration will:"
echo "  1. Add 'description' column (nullable TEXT)"
echo "  2. Update existing records with default descriptions"
echo ""

read -p "Apply migration to production? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Migration cancelled"
  exit 0
fi

echo ""
echo "🚀 Applying migration..."

# Apply the migration
psql "$DB_URL" -f supabase/migrations/20250119_add_mindmap_description.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Verification query:"
  psql "$DB_URL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'mindmaps' AND column_name = 'description';"
else
  echo ""
  echo "❌ Migration failed. Check error messages above."
  exit 1
fi
