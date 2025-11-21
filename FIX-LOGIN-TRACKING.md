# Fix Login Tracking - Missing Database Columns

## 🚨 Issue

Your login streak tracking is not working because the database columns are missing:
- `last_login_date`
- `current_streak`
- `longest_streak`

**Error:** `column user_profiles.last_login_date does not exist`

---

## ✅ Solution: Run Migration in Supabase

### Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `npwtmibmwvwhqcqhmbcf`
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query**

### Step 2: Copy and Run This SQL

```sql
-- Migration: Add streak tracking to user_profiles
-- This migration adds fields to track daily login streaks for gamification

-- Add streak tracking columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login_date DATE,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Create index for efficient streak queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login
ON user_profiles(last_login_date);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.last_login_date IS 'Date of last login (used for streak calculation)';
COMMENT ON COLUMN user_profiles.current_streak IS 'Current consecutive days logged in';
COMMENT ON COLUMN user_profiles.longest_streak IS 'Longest streak ever achieved';
```

### Step 3: Execute

1. Paste the SQL above into the editor
2. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)
3. You should see: `Success. No rows returned`

### Step 4: Verify

Run this query to check if columns exist:

```sql
SELECT
  id,
  email,
  last_login_date,
  current_streak,
  longest_streak
FROM user_profiles
LIMIT 5;
```

You should see the new columns (they'll be `null` initially).

---

## 🔄 How Login Tracking Works

Once the migration is run:

1. **User visits dashboard** → `DashboardHome` component loads
2. **Streak API called** → `/api/streak/update` (POST request)
3. **Database updated**:
   - `last_login_date` → Today's date
   - `current_streak` → Incremented if consecutive day
   - `longest_streak` → Updated if current exceeds it

4. **Streak displayed** → Dashboard shows 🔥 X-day streak

---

## 📊 What Happens After Migration

### First Login (You):
```
last_login_date: 2025-11-20
current_streak: 1
longest_streak: 1
```

### Tomorrow (Consecutive):
```
last_login_date: 2025-11-21
current_streak: 2  ← Incremented
longest_streak: 2  ← Incremented
```

### Miss a Day (Broken):
```
last_login_date: 2025-11-23
current_streak: 1  ← Reset
longest_streak: 2  ← Keeps highest
```

---

## 🧪 Test After Migration

### Method 1: Visit Dashboard
1. Go to `http://localhost:3002/dashboard`
2. Look for "🔥 X-day login streak!" message
3. Should show "🔥 1-day login streak!"

### Method 2: Check Database
```sql
SELECT
  email,
  last_login_date,
  current_streak,
  longest_streak
FROM user_profiles
WHERE last_login_date IS NOT NULL
ORDER BY last_login_date DESC;
```

### Method 3: Run Check Script
```bash
npx tsx scripts/check-login-tracking.ts
```

Should output:
```
✅ Logged in today
Current Streak: 🔥 1 days
```

---

## 🐛 Why This Happened

The migration file exists (`supabase/migrations/003_add_streak_tracking.sql`) but was never applied to your production database.

**Possible reasons:**
1. Migration was created after database was set up
2. Supabase migrations not auto-synced
3. Local dev vs production schema drift

---

## 🚀 Quick Fix Summary

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/npwtmibmwvwhqcqhmbcf/sql/new)
2. Paste the SQL from Step 2 above
3. Click **Run**
4. Refresh your dashboard
5. See your streak appear! 🔥

---

## ✨ Benefits After Fix

Once working, users will see:
- 🔥 Daily streak counter on dashboard
- 🏆 Longest streak achievement
- ⏰ Streak reminders (don't break it!)
- 📊 Gamification and engagement

Perfect for student retention! 🎓
