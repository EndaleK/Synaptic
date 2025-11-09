# Debugging 401 Unauthorized Errors on Production

## Current Situation

- Upload works locally ✅
- Upload fails on production (synaptic.study) with 401 Unauthorized ❌
- Code already has `credentials: 'include'` ✅
- Chunks retry 3 times but all fail with 401 ❌

## Root Cause Analysis

The 401 error means Clerk authentication is failing. Since code is correct, the issue is environmental:

### Possible Causes:

1. **Clerk Session Expired** (Most likely)
   - User logged in days ago
   - Session cookie expired or invalid
   - Need to sign out and sign back in

2. **Wrong Clerk Keys on Production**
   - Using test keys (`pk_test_`, `sk_test_`) instead of live keys
   - Keys not set in Vercel Production environment
   - Keys set for Preview but not Production

3. **Browser Cache Issue**
   - Old JavaScript cached
   - Clerk session cookie corrupted
   - Need hard refresh

4. **CORS/Cookie Blocking**
   - Third-party cookies blocked by browser
   - Browser security settings preventing cookie transmission
   - Need to check browser console for cookie warnings

## Step-by-Step Fix

### Step 1: Sign Out and Sign Back In

**This fixes 90% of 401 errors**

1. Click profile icon → Sign Out
2. Clear browser cookies for `synaptic.study`
3. Sign back in
4. Try upload again

### Step 2: Hard Refresh Browser

1. **Windows:** `Ctrl + Shift + R` or `Ctrl + F5`
2. **Mac:** `Cmd + Shift + R`
3. This clears JavaScript cache and forces new download

### Step 3: Check Clerk Keys in Vercel

1. Go to https://vercel.com → Your Project → Settings → Environment Variables
2. Filter by **"Production"** environment
3. Verify these are set:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_... (NOT pk_test_!)
CLERK_SECRET_KEY = sk_live_... (NOT sk_test_!)
```

4. If you see `pk_test_` or `sk_test_`, you're using test keys in production!
5. Get production keys from https://dashboard.clerk.com
6. Update Vercel environment variables
7. Redeploy

### Step 4: Check Browser Console for Cookie Errors

Open DevTools (F12) → Console tab

Look for warnings like:
- "Cookie was blocked by user preferences"
- "Third-party cookie will be blocked"
- "SameSite attribute missing"

If you see these, enable cookies in browser settings.

### Step 5: Test Authentication Directly

Run this in browser console on synaptic.study:

```javascript
fetch('/api/user/profile', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('Auth test:', d))
  .catch(e => console.error('Auth failed:', e))
```

**Expected Results:**
- ✅ If you see user data → Auth works, upload issue is elsewhere
- ❌ If you see `{ error: 'Unauthorized' }` → Auth broken, sign out/in

### Step 6: Check Network Tab for Cookie Headers

1. Open DevTools (F12) → Network tab
2. Try uploading a file
3. Click on one of the failed `/api/upload-large-document` requests
4. Check **Request Headers** section
5. Look for `Cookie:` header

**If Cookie header is missing:**
- Session expired or not sent
- Sign out and sign back in

**If Cookie header exists but 401 still happens:**
- Clerk keys might be wrong on server
- Check Vercel environment variables

## Quick Fix Checklist

Try these in order:

- [ ] Sign out and sign back in
- [ ] Hard refresh browser (`Ctrl+Shift+R`)
- [ ] Clear cookies for synaptic.study
- [ ] Check Clerk keys in Vercel (must be `pk_live_` and `sk_live_`)
- [ ] Try in incognito/private window
- [ ] Try different browser
- [ ] Check browser console for cookie/CORS errors
- [ ] Run auth test in console (Step 5 above)

## If Still Not Working

Share these details:

1. **Vercel Environment Variables screenshot** (Settings → Environment Variables, filter by Production)
   - Blur out the actual keys, just show:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_test_xxx` or `pk_live_xxx`
     - `CLERK_SECRET_KEY = sk_test_xxx` or `sk_live_xxx`

2. **Browser Console output** during upload attempt
   - Full error messages
   - Cookie warnings (if any)

3. **Network Tab** for one failed chunk request
   - Request Headers (especially Cookie header)
   - Response body

4. **Result of auth test** (Step 5)
   - What did the console show?

## Expected Outcome

After fixing:
- ✅ No 401 errors
- ✅ Chunks upload successfully
- ✅ Progress bar reaches 100%
- ✅ "Upload Complete" message appears
