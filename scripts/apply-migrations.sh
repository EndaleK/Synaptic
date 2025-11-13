#!/bin/bash

# Apply Database Migrations Script
# This script applies necessary migrations to your Supabase database

set -e  # Exit on any error

echo "========================================"
echo "Applying Database Migrations"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "To install:"
    echo "  npm install -g supabase"
    echo "  # OR"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI is installed"
echo ""

# List of critical migrations
MIGRATIONS=(
    "009_add_needs_ocr_status.sql"
    "20251110_add_rag_columns.sql"
    "20251112_add_processing_progress.sql"
)

echo "Critical migrations to apply:"
for migration in "${MIGRATIONS[@]}"; do
    echo "  - $migration"
done
echo ""

# Check if Supabase is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Supabase project not linked locally"
    echo ""
    echo "To link your project:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Find your project ref in Supabase Dashboard → Project Settings"
    exit 1
fi

echo "Choose migration method:"
echo "  1) Apply via Supabase CLI (local development)"
echo "  2) Show SQL to run manually (production/remote)"
echo "  3) Cancel"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Applying migrations via Supabase CLI..."
        echo ""

        # Apply each migration
        for migration in "${MIGRATIONS[@]}"; do
            if [ -f "supabase/migrations/$migration" ]; then
                echo "Applying: $migration"
                supabase db push
                echo "✅ Migration applied: $migration"
                echo ""
            else
                echo "⚠️  Migration file not found: $migration"
            fi
        done

        echo "✅ All migrations applied successfully!"
        ;;

    2)
        echo ""
        echo "========================================"
        echo "SQL to run manually in Supabase Dashboard:"
        echo "========================================"
        echo ""

        for migration in "${MIGRATIONS[@]}"; do
            if [ -f "supabase/migrations/$migration" ]; then
                echo "-- Migration: $migration"
                echo "--"
                cat "supabase/migrations/$migration"
                echo ""
                echo "-- =========================================="
                echo ""
            fi
        done

        echo "To apply these migrations:"
        echo "1. Go to your Supabase Dashboard"
        echo "2. Navigate to SQL Editor"
        echo "3. Copy and paste each migration above"
        echo "4. Run each migration one at a time"
        ;;

    3)
        echo ""
        echo "Migration cancelled"
        exit 0
        ;;

    *)
        echo ""
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "Next Steps:"
echo "========================================"
echo ""
echo "1. Restart your Next.js dev server:"
echo "   npm run dev"
echo ""
echo "2. Ensure Inngest is running:"
echo "   npx inngest-cli@latest dev"
echo ""
echo "3. Test with a 19MB PDF upload"
echo ""
