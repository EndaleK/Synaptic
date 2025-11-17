# Study Statistics Troubleshooting Guide

This guide helps diagnose and fix issues with study progress and statistics tracking in Synaptic.

---

## Quick Diagnosis Checklist

Run through this checklist to quickly identify the issue:

- [ ] **Database migration applied?** Verify `study_sessions` table accepts all 9 session types
- [ ] **Console shows session start?** Look for "📊 Study session started successfully" in browser console
- [ ] **Session lasting 1+ minute?** Sessions under 1 minute are not recorded
- [ ] **Data in database?** Check `study_sessions` table has rows with your `user_id`
- [ ] **Timezone correct?** Statistics API receives correct `timezoneOffset` parameter
- [ ] **RLS policies working?** User can INSERT and SELECT from `study_sessions` table

---

## Common Issues & Solutions

### Issue 1: Statistics Show All Zeros

**Symptoms:**
- All statistics return 0 values
- Current streak: 0
- Total sessions: 0
- Total minutes: 0
- Mode breakdown empty

**Diagnosis Steps:**

1. **Check browser console** (Open DevTools → Console tab):
   - Use any learning mode (Chat, Flashcards, Mind Map, etc.) for 2+ minutes
   - Look for: `📊 [ComponentName] Study session started successfully`
   - If you see `❌ Failed to start study session` → Database constraint issue

2. **Verify database constraint** (Supabase SQL Editor):
   ```sql
   -- Should show constraint with 9 session types
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'study_sessions'::regclass
   AND conname LIKE '%session_type%';
   ```

   Expected result:
   ```
   CHECK (session_type IN ('pomodoro', 'custom', 'review', 'chat',
                           'podcast', 'mindmap', 'video', 'writing', 'exam'))
   ```

3. **Check for sessions in database**:
   ```sql
   -- Replace with your Clerk user ID
   SELECT ss.*, up.email
   FROM study_sessions ss
   JOIN user_profiles up ON ss.user_id = up.id
   WHERE up.clerk_user_id = 'user_YOUR_CLERK_ID'
   ORDER BY ss.created_at DESC
   LIMIT 10;
   ```

**Solutions:**

- **If constraint only has 3 types** → Apply migration:
  ```sql
  -- Run in Supabase SQL Editor
  ALTER TABLE study_sessions DROP CONSTRAINT IF EXISTS study_sessions_session_type_check;
  ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_session_type_check
    CHECK (session_type IN ('pomodoro', 'custom', 'review', 'chat',
                             'podcast', 'mindmap', 'video', 'writing', 'exam'));
  ```

- **If no sessions in database** → Check console errors, verify authentication

- **If sessions exist but statistics still 0** → Check timezone offset in API calls

---

### Issue 2: Console Shows "Failed to start study session"

**Symptoms:**
- Browser console: `❌ [ChatInterface] Failed to start study session`
- Error details show constraint violation or 500 status

**Diagnosis:**

Check the error details in console:
```javascript
// Example error:
{
  status: 500,
  error: "Failed to start session",
  details: "new row for relation \"study_sessions\" violates check constraint"
}
```

**Solution:**

This indicates the database constraint issue. Apply the migration (see Issue 1 solution above).

---

### Issue 3: Sessions Not Completing

**Symptoms:**
- Sessions appear with `completed = false` in database
- `end_time` and `duration_minutes` are NULL
- Console shows session start but no completion message

**Diagnosis:**

1. **Check if you stayed in the mode for 1+ minute:**
   - Sessions under 1 minute are intentionally not recorded
   - Wait at least 60 seconds before switching modes

2. **Check console for completion errors:**
   - Look for: `❌ [ComponentName] Failed to complete study session`
   - Note the error details

3. **Verify session completion in database:**
   ```sql
   SELECT id, session_type, start_time, end_time, duration_minutes, completed
   FROM study_sessions
   WHERE user_id = (
     SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID'
   )
   ORDER BY start_time DESC
   LIMIT 10;
   ```

**Solution:**

- **If `completed = false` for all sessions** → RLS policy issue or API error
- **If only some sessions incomplete** → User switching modes too quickly
- **If console shows keepalive error** → Browser blocking request during page unload (normal, not critical)

---

### Issue 4: Incorrect Timezone or Streak Calculation

**Symptoms:**
- Streak resets unexpectedly
- Today's activity not showing
- Date boundaries seem wrong

**Diagnosis:**

1. **Check timezone offset being sent:**
   ```javascript
   // In browser console:
   const offset = new Date().getTimezoneOffset()
   console.log('Timezone offset:', offset, 'minutes')
   console.log('Should send:', -offset, 'to API')
   ```

2. **Verify API receives offset:**
   - Open Network tab → Find request to `/api/study-statistics`
   - Check URL includes: `?range=week&timezoneOffset=-300` (or your offset)

**Solution:**

Ensure `StudyProgressWidget.tsx` and `StudyStatistics.tsx` pass timezone offset:
```typescript
const timezoneOffset = new Date().getTimezoneOffset()
const response = await fetch(`/api/study-statistics?range=week&timezoneOffset=${-timezoneOffset}`)
```

---

### Issue 5: Mode Breakdown Shows Wrong Values

**Symptoms:**
- Mode breakdown shows unrealistic percentages
- All modes show equal time despite using one mode more
- Total time doesn't match sum of individual modes

**Diagnosis:**

Check if statistics API is using actual session data:
```sql
-- Check actual time spent per mode
SELECT
  session_type,
  COUNT(*) as session_count,
  SUM(duration_minutes) as total_minutes,
  AVG(duration_minutes) as avg_minutes
FROM study_sessions
WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
  AND completed = true
GROUP BY session_type
ORDER BY total_minutes DESC;
```

**Solution:**

If database shows correct data but API returns wrong values:
1. Check server logs for API errors
2. Verify statistics API is deployed with latest changes
3. Clear browser cache and hard refresh (Cmd/Ctrl + Shift + R)

---

## Verification After Fixes

Run these tests to confirm everything works:

### Test 1: Create a Chat Session

1. Navigate to Dashboard → Chat mode
2. Open browser console (Cmd/Ctrl + Option/Alt + J)
3. Wait 2 minutes
4. Look for: `📊 [ChatInterface] Study session started successfully`
5. Switch to a different mode
6. Look for: `✅ [ChatInterface] Study session completed successfully`
7. Check database:
   ```sql
   SELECT * FROM study_sessions
   WHERE session_type = 'chat'
   ORDER BY created_at DESC LIMIT 1;
   ```

**Expected:** Row exists with `session_type = 'chat'`, `completed = true`, `duration_minutes >= 2`

### Test 2: Verify Statistics Update

1. After completing Test 1, navigate to Dashboard home
2. Check StudyProgressWidget:
   - Total sessions should be ≥ 1
   - Total minutes should match session durations
   - Current streak should be ≥ 1 (if today is first day)
3. Open `/api/study-statistics?range=week` in new tab
4. Verify JSON response shows:
   ```json
   {
     "totalSessions": 1,
     "totalMinutes": 2,
     "currentStreak": 1,
     "modeBreakdown": {
       "chat": 2
     }
   }
   ```

### Test 3: Test Multiple Modes

1. Use each learning mode for 2+ minutes:
   - Chat
   - Flashcards
   - Mind Map
   - Podcast
   - Video
   - Writing
   - Exam

2. Check database has sessions for each type:
   ```sql
   SELECT session_type, COUNT(*) as count, SUM(duration_minutes) as total_minutes
   FROM study_sessions
   WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
   GROUP BY session_type;
   ```

3. Verify statistics show correct breakdown with all mode types

---

## Diagnostic SQL Queries

### Check Database Schema

```sql
-- Verify study_sessions table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'study_sessions'
ORDER BY ordinal_position;

-- Check all constraints on study_sessions
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'study_sessions'::regclass;
```

### Check User Data

```sql
-- Get your user profile ID
SELECT id, email, clerk_user_id, created_at
FROM user_profiles
WHERE clerk_user_id = 'user_YOUR_CLERK_ID';

-- Get all study sessions for user
SELECT
  id,
  session_type,
  start_time,
  end_time,
  duration_minutes,
  completed,
  created_at
FROM study_sessions
WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
ORDER BY start_time DESC;

-- Calculate statistics manually
SELECT
  COUNT(*) as total_sessions,
  COUNT(DISTINCT DATE(start_time)) as unique_days,
  SUM(duration_minutes) as total_minutes,
  AVG(duration_minutes) as avg_session_minutes
FROM study_sessions
WHERE user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = 'user_YOUR_CLERK_ID')
  AND completed = true;
```

### Check RLS Policies

```sql
-- Verify RLS policies allow INSERT and SELECT
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'study_sessions';

-- Test if current user can insert (run as authenticated user)
INSERT INTO study_sessions (user_id, session_type, start_time, planned_duration_minutes)
VALUES (
  (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'),
  'chat',
  NOW(),
  30
);

-- Delete test session
DELETE FROM study_sessions WHERE id = (SELECT id FROM study_sessions ORDER BY created_at DESC LIMIT 1);
```

---

## Logging and Monitoring

### Server-Side Logs (Vercel)

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by: `/api/study-sessions/start` or `/api/study-sessions/complete`
3. Look for:
   - `✅ Study session started` (success)
   - `Failed to create study session` (error)
   - Constraint violation errors
   - Authentication errors

### Client-Side Logs (Browser Console)

1. Open DevTools → Console
2. Filter by: `ChatInterface` or `FlashcardDisplay` or other component names
3. Look for:
   - `📊 Study session started successfully` (success)
   - `✅ Study session completed successfully` (success)
   - `❌ Failed to start study session` (error)
   - Error details with status codes

### Sentry (If Configured)

1. Open Sentry Dashboard
2. Filter by: `study-sessions` or `statistics`
3. Check for:
   - Database constraint violations
   - Unhandled exceptions in session tracking
   - API timeout errors

---

## Still Having Issues?

If you've gone through this guide and statistics still aren't working:

1. **Collect diagnostic information:**
   - Browser console logs (full output)
   - Result of diagnostic SQL queries above
   - Vercel server logs for session API routes
   - Screenshot of statistics showing wrong values

2. **Check recent deployments:**
   - Verify latest code is deployed to production
   - Check if database migrations were applied to production database
   - Confirm environment variables are set correctly

3. **Test in development:**
   - Run `npm run dev` locally
   - Set up local PostgreSQL or connect to Supabase
   - Test session tracking with detailed console logging
   - Compare behavior between development and production

4. **Review implementation:**
   - Verify all 7 components have session tracking (see `STUDY-STATISTICS-FIX-SUMMARY.md`)
   - Confirm API routes are deployed with latest changes
   - Check that statistics API uses actual session data (not estimates)

---

## Technical Details

### Session Tracking Flow

1. **Component Mounts** → Calls `/api/study-sessions/start`
2. **API Validates** → Checks auth, validates session type
3. **Database Insert** → Creates row in `study_sessions` with `completed = false`
4. **API Returns** → Sends `sessionId` back to component
5. **Component Stores** → Saves `sessionId` in state, `startTime` in ref
6. **Component Unmounts** → Calculates duration (now - startTime)
7. **Calls Complete** → Uses `fetch()` with `keepalive: true`
8. **API Updates** → Sets `end_time`, `duration_minutes`, `completed = true`
9. **Statistics Calculates** → Queries completed sessions, calculates metrics

### Why Sessions Might Not Record

- **Duration < 1 minute** → Intentionally filtered out (too short to be meaningful)
- **No sessionId** → Start API failed (check console for error)
- **keepalive blocked** → Browser security settings (rare, not critical if session >1min)
- **Page crashed** → Complete API never called (acceptable loss, rare case)
- **RLS blocked** → User doesn't have permission to write to table
- **Database constraint** → Session type not in allowed list (fixed by migration)

---

## Migration Reference

If you need to reapply the migration:

```sql
-- Add new session types to study_sessions table
ALTER TABLE study_sessions
  DROP CONSTRAINT IF EXISTS study_sessions_session_type_check;

ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_session_type_check
  CHECK (session_type IN (
    'pomodoro',    -- Pomodoro timer sessions
    'custom',      -- Custom study sessions
    'review',      -- Flashcard review sessions
    'chat',        -- Document chat sessions
    'podcast',     -- Podcast listening/generation sessions
    'mindmap',     -- Mind map viewing/creation sessions
    'video',       -- Video learning sessions
    'writing',     -- Essay writing sessions
    'exam'         -- Exam practice sessions
  ));
```

Applied from: `supabase/migrations/20251116_add_session_types.sql`

---

**Last Updated:** 2025-11-17
**Related Docs:** `STUDY-STATISTICS-FIX-SUMMARY.md`, `scripts/diagnose-statistics.sql`
