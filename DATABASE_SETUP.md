# Database Setup Guide

This guide explains how to set up the database for the Writing Assistant and Video Learning features.

## Prerequisites

- Supabase account with project created
- Environment variables configured in `.env.local`
- Access to Supabase SQL Editor

## Required Migrations

The following migrations need to be applied to enable the new features:

### 1. Essays Table (Writing Assistant)
**File:** `supabase/migrations/003_add_essays_table.sql`

This migration creates the `essays` table for storing user-created writing projects with:
- AI-generated suggestions
- Citation management (APA, MLA, Chicago, Harvard, IEEE, Vancouver)
- Version history tracking
- Word count automation
- Row-Level Security (RLS) policies

### 2. Videos Table (Video Learning)
**File:** `supabase/migrations/004_add_videos_table.sql`

This migration creates the `videos` table for YouTube video processing with:
- Transcript storage with timestamps
- AI-generated summaries
- Key learning points extraction
- Flashcard generation tracking
- Processing status management
- Row-Level Security (RLS) policies

## How to Apply Migrations

### Option 1: Supabase SQL Editor (Recommended)

1. **Open the Supabase SQL Editor:**
   - Go to https://app.supabase.com/project/npwtmibmwvwhqcqhmbcf/editor/sql
   - Or navigate to your project → SQL Editor

2. **Run Migration 003 (Essays Table):**
   - Open `supabase/migrations/003_add_essays_table.sql`
   - Copy the entire SQL content
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Run Migration 004 (Videos Table):**
   - Open `supabase/migrations/004_add_videos_table.sql`
   - Copy the entire SQL content
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify the migrations:**
   ```sql
   -- Check that essays table exists
   SELECT * FROM essays LIMIT 1;

   -- Check that videos table exists
   SELECT * FROM videos LIMIT 1;
   ```

### Option 2: Using Supabase CLI

If you have Supabase CLI installed and authenticated:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref npwtmibmwvwhqcqhmbcf

# Run migrations
supabase db push
```

### Option 3: Using psql (Direct Database Connection)

If you have the database password:

```bash
# Get connection string from Supabase Dashboard
# Settings → Database → Connection string

# Run migrations
psql "postgresql://postgres:[YOUR-PASSWORD]@db.npwtmibmwvwhqcqhmbcf.supabase.co:5432/postgres" \
  -f supabase/migrations/003_add_essays_table.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.npwtmibmwvwhqcqhmbcf.supabase.co:5432/postgres" \
  -f supabase/migrations/004_add_videos_table.sql
```

## Verification

After running the migrations, verify the setup:

### Check Tables Exist

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see `essays` and `videos` in the list.

### Check RLS Policies

```sql
-- Check essays policies
SELECT policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'essays';

-- Check videos policies
SELECT policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'videos';
```

You should see 4 policies for each table (SELECT, INSERT, UPDATE, DELETE).

### Test Basic Operations

```sql
-- Try selecting from essays (should return empty result, not error)
SELECT * FROM essays;

-- Try selecting from videos (should return empty result, not error)
SELECT * FROM videos;
```

## Environment Configuration

Make sure your `.env.local` file has the following configured:

```bash
# YouTube Data API (for Video Learning)
YOUTUBE_API_KEY=AIzaSyCgvBE_48kXyInvQ4guNkiwijLBhGvQz70

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://npwtmibmwvwhqcqhmbcf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_key_here
```

## Troubleshooting

### Error: "relation does not exist"
- The migrations haven't been run yet
- Run the migrations using one of the methods above

### Error: "permission denied"
- RLS policies may not be configured correctly
- Ensure you're authenticated via Clerk
- Check that the user profile exists in `user_profiles` table

### Error: "schema cache not found"
- This is normal when using Supabase client SDK before migrations
- Run the migrations and restart your Next.js dev server

### Error: "duplicate key value"
- The migrations have already been run
- No action needed - tables are already set up

## Next Steps

Once migrations are complete:

1. **Restart your Next.js development server:**
   ```bash
   npm run dev
   ```

2. **Test the Writer mode:**
   - Navigate to the dashboard
   - Click on the "Writer" tile
   - Start a new essay or writing project

3. **Test the Video mode:**
   - Navigate to the dashboard
   - Click on the "Video" tile
   - Search for a YouTube video
   - Process and analyze it

## Support

If you encounter issues:

1. Check the Supabase logs in Dashboard → Logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure you're on the latest code version

## Migration SQL Preview

For reference, here's what each migration does:

**003_add_essays_table.sql:**
- Creates `essays` table with comprehensive schema
- Adds indexes for performance
- Configures RLS policies for data security
- Sets up triggers for automatic word count and timestamp updates

**004_add_videos_table.sql:**
- Creates `videos` table for YouTube content
- Adds indexes for efficient querying
- Configures RLS policies
- Sets up unique constraint to prevent duplicate video processing
- Implements automatic timestamp updates
