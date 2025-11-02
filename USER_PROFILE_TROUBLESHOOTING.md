# User Profile Troubleshooting Guide

## Issue: "Failed to create user profile" Error

This error occurs when the Writer or Video features can't find your user profile in the database.

---

## Root Cause

The middleware (middleware.ts:29-61) is supposed to auto-create user profiles when you visit `/dashboard`, but this might fail due to:

1. **RLS Policy Issues**: Row Level Security policies block client-side inserts
2. **Missing Columns**: Database schema mismatch
3. **Clerk User ID Mismatch**: The Clerk user ID doesn't match what's expected
4. **Race Condition**: Component loads before middleware completes

---

## Quick Fix: Manually Create Your Profile

### Step 1: Find Your Clerk User ID

Open your browser console (F12) and run:
```javascript
console.log(window.Clerk?.user?.id)
```

Or check the error message - it usually shows the `clerk_user_id` being queried.

### Step 2: Run This SQL in Supabase

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Replace `YOUR_CLERK_USER_ID` and `YOUR_EMAIL` below
3. Click "Run"

```sql
-- Create your user profile manually
INSERT INTO user_profiles (
  clerk_user_id,
  email,
  full_name,
  subscription_tier,
  subscription_status,
  documents_used_this_month,
  created_at,
  updated_at
)
VALUES (
  'YOUR_CLERK_USER_ID',  -- e.g., 'user_2abc123xyz'
  'YOUR_EMAIL',
  'Your Name',
  'free',
  'inactive',
  0,
  NOW(),
  NOW()
)
ON CONFLICT (clerk_user_id) DO NOTHING;

-- Verify it was created
SELECT * FROM user_profiles WHERE clerk_user_id = 'YOUR_CLERK_USER_ID';
```

### Step 3: Refresh Your Dashboard

Go to http://localhost:3010/dashboard and refresh the page. The Writer and Video features should now work!

---

## Long-term Fix: Debug Middleware

If the manual fix works but you want to understand why the middleware isn't creating profiles automatically:

### Check Server Logs

Look for middleware errors in your terminal where `npm run dev` is running. You should see:
```
Failed to auto-create user profile: [error details]
Error details: [JSON error object]
```

### Common Middleware Issues

1. **Supabase Service Role Key Missing**
   - Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
   - Verify it's the correct service role key (not anon key)

2. **Database Schema Mismatch**
   - Run migrations 003 and 004 if you haven't already
   - Check that `user_profiles.id` is BIGINT (not UUID)

3. **RLS Policy Blocking Server**
   - Server-side inserts should bypass RLS, but verify policies are correct
   - Check `supabase/migrations/000_create_user_profiles.sql`

---

## Verify Database Schema

Run this in Supabase SQL Editor to check your schema:

```sql
-- Check user_profiles structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Check existing profiles
SELECT
  id,
  clerk_user_id,
  email,
  created_at
FROM user_profiles
ORDER BY created_at DESC;
```

Expected schema:
- `id`: BIGINT (or UUID - both should work)
- `clerk_user_id`: TEXT, UNIQUE, NOT NULL
- `email`: TEXT, NOT NULL
- `full_name`: TEXT (nullable)
- `subscription_tier`: TEXT, DEFAULT 'free'
- `subscription_status`: TEXT, DEFAULT 'inactive'
- `created_at`: TIMESTAMP WITH TIME ZONE
- `updated_at`: TIMESTAMP WITH TIME ZONE

---

## Alternative: Use Service Role Key for Client

**⚠️ WARNING: This is a temporary workaround and less secure!**

If you need Writer/Video features working immediately and can't wait for the middleware fix:

1. Create an API route to handle profile creation server-side
2. Call that API route from the components instead of direct Supabase insert
3. The API route uses the service role key, bypassing RLS

Example API route (`app/api/user/ensure-profile/route.ts`):

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if profile exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (existing) {
    return NextResponse.json({ profile: existing })
  }

  // Create profile
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      clerk_user_id: userId,
      email: 'unknown@example.com', // You'd get this from Clerk
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
```

---

## Need More Help?

1. Check Supabase logs: https://supabase.com/dashboard/project/YOUR_PROJECT/logs
2. Check Clerk logs: https://dashboard.clerk.com/apps/YOUR_APP/logs
3. Look for middleware errors in your terminal
4. Verify environment variables are loaded: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`

---

## Summary

**Immediate fix**: Manually create profile via SQL (Step 2 above)
**Long-term fix**: Debug why middleware isn't creating profiles automatically
**Current status**: Components now refresh page if profile missing (triggers middleware again)
