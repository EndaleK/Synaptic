#!/bin/bash

# Run SQL migrations via Supabase Management API
# This script requires the Supabase service role key

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi

# Check for required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing Supabase credentials in .env.local${NC}"
    exit 1
fi

# Extract project reference
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\///' | cut -d'.' -f1)

echo -e "${GREEN}🚀 Running database migrations...${NC}\n"

# Function to run SQL via psql using connection pooler
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")

    echo -e "${YELLOW}📄 Running: $migration_name${NC}"

    # Read the SQL file
    SQL_CONTENT=$(cat "$migration_file")

    # Try to execute via Supabase SQL endpoint
    # Note: This requires the database password, which we don't have
    # So we'll print instructions instead

    echo -e "${YELLOW}   Please run this migration manually in Supabase SQL Editor${NC}"
    echo -e "   ${GREEN}https://app.supabase.com/project/$PROJECT_REF/editor/sql${NC}\n"
}

# Run migrations in order
echo -e "${GREEN}Migrations to apply:${NC}"
echo "1. supabase/migrations/003_add_essays_table.sql"
echo "2. supabase/migrations/004_add_videos_table.sql"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 COPY THE SQL BELOW AND PASTE INTO SUPABASE SQL EDITOR${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}🔗 SQL Editor URL:${NC}"
echo -e "   https://app.supabase.com/project/$PROJECT_REF/editor/sql\n"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}SQL for Migration 003 (Essays Table):${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cat supabase/migrations/003_add_essays_table.sql

echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}SQL for Migration 004 (Videos Table):${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cat supabase/migrations/004_add_videos_table.sql

echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Next Steps:${NC}"
echo -e "   1. Copy all the SQL above"
echo -e "   2. Open: https://app.supabase.com/project/$PROJECT_REF/editor/sql"
echo -e "   3. Paste the SQL"
echo -e "   4. Click 'Run' or press Cmd+Enter"
echo -e "   5. Verify with: SELECT * FROM essays LIMIT 1; SELECT * FROM videos LIMIT 1;"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
