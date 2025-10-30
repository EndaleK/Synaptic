# 🗄️ Database Migration Instructions

## Required Migration for Mastery Tracking

The mastery tracking feature requires new database columns. You need to apply this migration to your Supabase database.

### Migration File
`supabase/migrations/20250130_add_mastery_tracking.sql`

## Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL below:

```sql
-- Add mastery tracking fields to flashcards table
-- This migration adds spaced repetition and mastery tracking capabilities

-- Add new columns for mastery tracking
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS mastery_level TEXT DEFAULT 'learning' CHECK (mastery_level IN ('learning', 'reviewing', 'mastered')),
ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100);

-- Create index for filtering by mastery level
CREATE INDEX IF NOT EXISTS idx_flashcards_mastery_level ON flashcards(mastery_level);

-- Create composite index for user + mastery queries
CREATE INDEX IF NOT EXISTS idx_flashcards_user_mastery ON flashcards(user_id, mastery_level);

-- Add comment explaining the mastery levels
COMMENT ON COLUMN flashcards.mastery_level IS 'Learning: New or struggling cards, Reviewing: Cards being practiced, Mastered: Well-known cards';
COMMENT ON COLUMN flashcards.confidence_score IS 'Score 0-100 representing user confidence, updated based on green (increase) and red (decrease) button presses';

-- Update existing flashcards to have default values
UPDATE flashcards
SET mastery_level = 'learning',
    confidence_score = 0
WHERE mastery_level IS NULL OR confidence_score IS NULL;
```

5. Click **Run** or press `Cmd/Ctrl + Enter`
6. Verify you see "Success. No rows returned"

## Option 2: Apply via Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're in the project directory
cd /path/to/flashcard-generator

# Login to Supabase (if not already)
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

## Option 3: Manual SQL Execution

1. Connect to your Supabase database using any PostgreSQL client
2. Run the SQL from the migration file

## Verification

After running the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'flashcards'
AND column_name IN ('mastery_level', 'confidence_score');

-- Should return 2 rows showing the new columns
```

## What This Migration Does

✅ Adds `mastery_level` column (learning/reviewing/mastered)
✅ Adds `confidence_score` column (0-100)
✅ Creates indexes for better query performance
✅ Sets default values for existing flashcards
✅ Adds helpful comments for future reference

## After Migration

Once the migration is applied:
1. Refresh your app
2. Generate new flashcards or use existing ones
3. Click the green/red mastery buttons
4. Progress will be saved to the database!

## Troubleshooting

**Error: column "mastery_level" already exists**
- Migration was already applied. No action needed!

**Error: relation "flashcards" does not exist**
- Your database schema may not be set up. Check if the main schema.sql was applied first.

**Error: permission denied**
- Make sure you're using a user with sufficient privileges (service role key)

## Need Help?

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify your database connection
3. Ensure you're connected to the correct project
4. Try running the migration in smaller chunks (one ALTER statement at a time)
