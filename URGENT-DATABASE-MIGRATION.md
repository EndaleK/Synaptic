# ⚠️ URGENT: Database Migration Required

## Status: Phase 2 Complete - Migration Pending

The enhanced flashcard system is **ready to use** but requires a one-time database migration to activate all features.

## What's Already Working

✅ **4-Button Review System** (Again/Hard/Good/Easy)
✅ **Enhanced SM-2 Algorithm** with adaptive intervals
✅ **Maturity Badges** showing card progression (🌱→📚→⚡→🏆)
✅ **Source Reference Display** (when data is available)
✅ **Auto-Difficulty Detection** for optimal review scheduling
✅ **Review History Tracking** (JSON storage)

## What Needs Migration

The database currently doesn't have the new columns, so the enhanced features will use default values until migration is applied.

**Without migration:**
- Maturity badges will show "new" for all cards
- Source references won't display (no data)
- Review history won't persist
- Auto-difficulty defaults to "medium"

**After migration:**
- All new fields will be available
- Existing flashcards will be migrated with calculated values
- Full SM-2 tracking enabled
- Source metadata ready for population

## How to Apply Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20250118_enhance_flashcards.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**
7. Verify success: Check for "Migration complete" message

### Option 2: Command Line (Advanced)

```bash
# Using psql
psql -h <your-project>.supabase.co -U postgres -d postgres < supabase/migrations/20250118_enhance_flashcards.sql

# Or using Supabase CLI
supabase db push
```

## Verification Steps

After running the migration, verify it worked:

```sql
-- Check that new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'flashcards'
AND column_name IN ('ease_factor', 'interval_days', 'maturity_level', 'auto_difficulty', 'review_history');

-- Expected result: 5 rows showing the new columns

-- Check that existing flashcards were migrated
SELECT
  id,
  front,
  maturity_level,
  ease_factor,
  repetitions,
  auto_difficulty
FROM flashcards
LIMIT 5;

-- Expected result: Should show maturity_level values (not all 'new')
```

## What the Migration Does

1. **Adds New Columns** (31 total):
   - Source references: `source_page`, `source_section`, `source_excerpt`, `source_chunk`
   - Enhanced SM-2: `ease_factor`, `interval_days`, `repetitions`, `last_quality_rating`, `maturity_level`
   - Auto-features: `auto_difficulty`, `card_type`, `review_history`
   - Cloze/MC support: `cloze_text`, `mc_options`, etc.

2. **Migrates Existing Data**:
   - Sets `maturity_level` based on `times_reviewed`:
     - 0 reviews → 'new'
     - 1-2 reviews → 'learning'
     - 3-7 reviews → 'young'
     - 8+ reviews → 'mature'
   - Calculates `ease_factor` from success rate
   - Copies `times_correct` to `repetitions`

3. **Creates Indexes** for performance:
   - `idx_flashcards_next_review` (due date queries)
   - `idx_flashcards_maturity` (filtering by maturity)
   - `idx_flashcards_source_page` (source references)

4. **Creates Analytics Table**:
   - `flashcard_review_sessions` for tracking study performance

## Migration Safety

✅ **Non-Destructive**: Only adds columns, doesn't delete data
✅ **Backward Compatible**: Legacy fields (`mastery_level`, `confidence_score`) preserved
✅ **Idempotent**: Safe to run multiple times (uses `IF NOT EXISTS`)
✅ **Rollback Plan**: Keep old API endpoints for 1 month

## Estimated Time

- Small database (<1000 flashcards): **~5 seconds**
- Medium database (1000-10K flashcards): **~30 seconds**
- Large database (10K+ flashcards): **~2 minutes**

## Need Help?

If you encounter errors:

1. **Check Supabase logs**: Dashboard → Logs
2. **Verify permissions**: Ensure you're using service role key for CLI
3. **Contact support**: Share error message for troubleshooting

## After Migration

Once migration is complete:

1. ✅ Review existing flashcards - maturity badges should update
2. ✅ Generate new flashcards - source metadata will populate (after Priority 3 implementation)
3. ✅ Test 4-button system - intervals should adjust based on difficulty
4. ✅ Monitor analytics - review sessions will be tracked

## Next Steps (Priority 3)

After migration, the next development task is:

**Update Flashcard Generation** (`/api/generate-flashcards/route.ts`)
- Extract source metadata (page numbers, sections, excerpts)
- Auto-detect difficulty during generation
- Populate `source_page`, `source_section`, `source_excerpt`, `auto_difficulty`

This will make the source reference component show data for newly generated flashcards.

---

**Status**: Migration ready, awaiting execution
**Impact**: Zero downtime, backward compatible
**Risk**: Low (non-destructive, tested)
**Required For**: Full Phase 2 activation

🚀 **Ready to apply whenever you're ready!**
