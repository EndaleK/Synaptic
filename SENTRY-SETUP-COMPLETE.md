# Sentry Setup - Completion Summary

**Date**: November 9, 2025
**Status**: ✅ COMPLETE - Ready for Production

---

## ✅ What Was Done

### 1. Configuration Files Created

All 5 required configuration files have been created:

#### ✅ `sentry.client.config.ts`
- Client-side error tracking
- Performance monitoring (10% sample rate in production)
- Session replay enabled (10% of sessions, 100% on errors)
- Sensitive data filtering (cookies, API keys)
- Development mode disabled (no errors sent during dev)

#### ✅ `sentry.server.config.ts`
- Server-side error tracking
- Performance monitoring (10% sample rate in production)
- Enhanced sensitive data filtering (headers, tokens, secrets)
- API key redaction from error messages
- Development mode disabled

#### ✅ `sentry.edge.config.ts`
- Edge runtime error tracking
- Lower sample rate (10%) to reduce Edge costs
- Basic sensitive data filtering

#### ✅ `instrumentation.ts`
- Auto-instrument server and edge runtimes
- Loads appropriate Sentry config based on runtime

#### ✅ `app/global-error.tsx`
- Global error boundary for React rendering errors
- Automatically reports errors to Sentry
- User-friendly error page with "Try again" button

### 2. Next.js Configuration Updated

#### ✅ `next.config.ts`
- Wrapped with `withSentryConfig` for production builds
- Only activates when `NODE_ENV=production` AND `SENTRY_AUTH_TOKEN` is set
- Source maps upload enabled for debugging
- Automatic Vercel monitoring integration
- Removed deprecated `experimental.instrumentationHook`

### 3. Environment Variables Template Updated

#### ✅ `.env.example`
- Uncommented all Sentry variables
- Added clear instructions
- Marked as "RECOMMENDED for production"
- Added reference to `SENTRY-SETUP.md`

**Required Environment Variables:**
```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

---

## 📋 What You Need to Do

### Step 1: Create Sentry Project (5 minutes)

1. Go to https://sentry.io
2. Sign up or log in
3. Create a new project:
   - **Platform**: Next.js
   - **Project name**: synaptic-production (or your preferred name)
4. Copy the DSN (looks like: `https://[KEY]@o[ORG].ingest.sentry.io/[PROJECT]`)

### Step 2: Get Auth Token (2 minutes)

1. In Sentry, go to **Settings** → **Auth Tokens**
2. Click **Create New Token**
3. Give it these scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
4. Copy the token

### Step 3: Add to Environment Variables (3 minutes)

**For Local Development:**
Add to `.env.local`:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://[YOUR_KEY]@o[YOUR_ORG].ingest.sentry.io/[YOUR_PROJECT]
SENTRY_DSN=https://[YOUR_KEY]@o[YOUR_ORG].ingest.sentry.io/[YOUR_PROJECT]
SENTRY_ORG=your-org-name-here
SENTRY_PROJECT=synaptic-production
SENTRY_AUTH_TOKEN=your_auth_token_here
```

**For Production (Vercel):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all 5 Sentry variables above
3. Set them for **Production** environment

### Step 4: Test It Works (2 minutes)

**Test Client-Side Error Capture:**
1. Add a test button somewhere (e.g., dashboard):
   ```typescript
   import * as Sentry from "@sentry/nextjs";

   <button onClick={() => Sentry.captureException(new Error("Test error"))}>
     Test Sentry
   </button>
   ```
2. Click the button
3. Check https://sentry.io/organizations/[your-org]/issues/
4. You should see the error appear within 1-2 minutes

**Test Server-Side Error Capture:**
1. Add to any API route:
   ```typescript
   import * as Sentry from "@sentry/nextjs";

   Sentry.captureException(new Error("Test server error"));
   ```
2. Call the API endpoint
3. Check Sentry dashboard for the error

---

## 🎯 What Sentry Will Track

### Automatic Error Tracking:
- ✅ Unhandled client-side errors
- ✅ Unhandled server-side errors
- ✅ API route errors
- ✅ React rendering errors (global error boundary)
- ✅ Edge runtime errors

### Performance Monitoring:
- ✅ Page load times
- ✅ API response times
- ✅ Server-side rendering performance
- ✅ Transaction traces (10% sample rate to save costs)

### User Context:
- ✅ Automatically captures browser info
- ✅ Automatically captures URL and navigation
- ⏳ Add user ID after authentication (see below)

### Session Replay (Optional):
- ✅ Records 10% of all sessions
- ✅ Records 100% of sessions with errors
- Helps debug visual issues and user flows

---

## 🔧 Optional Enhancements

### 1. Add User Context After Authentication

Add this after Clerk authentication:

```typescript
// In a client component after user is loaded
import { useUser } from '@clerk/nextjs';
import * as Sentry from '@sentry/nextjs';

const { user } = useUser();

if (user) {
  Sentry.setUser({
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    username: user.username || user.firstName,
  });
}

// On logout
Sentry.setUser(null);
```

### 2. Add Breadcrumbs for Better Debugging

```typescript
// Track important actions
Sentry.addBreadcrumb({
  category: 'flashcards',
  message: 'User generated flashcards',
  level: 'info',
  data: {
    documentId: doc.id,
    cardCount: flashcards.length,
  },
});
```

### 3. Set Up Slack/Email Alerts

1. Go to Sentry → Alerts → Create Alert Rule
2. **When**: An event is seen
3. **If**: All events (or filter by specific errors)
4. **Then**: Send notification to Slack or email

**Recommended Alerts:**
- New issue created (immediate notification)
- Issue seen >100 times in 1 hour
- Error rate spike (>10% increase)

### 4. Create Performance Budgets

1. Go to Sentry → Performance → Settings
2. Set thresholds:
   - Page load: < 3 seconds
   - API response: < 1 second
   - Database query: < 500ms

---

## 💰 Cost Management

### Free Tier (Current):
- **5,000 errors/month**
- **10,000 transactions/month**
- **50 GB source map storage**
- **90 days data retention**

### How to Stay Within Free Tier:

1. **Sample Rate is 10% in Production**
   - Only 1 in 10 transactions tracked
   - Errors ALWAYS captured (100%)

2. **Development Errors Not Sent**
   - `beforeSend` filters out all dev errors
   - Only production errors count toward quota

3. **Ignored Errors List**
   - Common browser errors filtered out
   - Network errors filtered out
   - See `ignoreErrors` in config files

4. **Monitor Usage**
   - Check Sentry dashboard weekly
   - Set up quota alerts at 80%

### When to Upgrade:
- Consistently hitting 5K errors/month
- Need longer retention (>90 days)
- Want advanced features (profiling, custom dashboards)

**Cost**: Starts at $26/month for 50K errors

---

## 🐛 Troubleshooting

### Issue: "Sentry not capturing errors"

**Check:**
1. Environment variables set correctly?
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
2. Is `NODE_ENV=production`?
   - Dev errors are filtered out by design
3. Check browser console for Sentry errors
4. Verify DSN is correct in Sentry project settings

### Issue: "Source maps not uploading"

**Check:**
1. `SENTRY_AUTH_TOKEN` is set and valid
2. `SENTRY_ORG` matches your Sentry organization name
3. `SENTRY_PROJECT` matches your project name
4. Auth token has `project:releases` scope

**Fix:**
- Regenerate auth token with correct scopes
- Ensure organization name matches token's organization

### Issue: "Organization mismatch error"

**Error:**
```
Using organization `synaptic-a2` (embedded in token) rather than manually-configured organization `synaptic`
```

**Fix:**
Update `.env.local`:
```bash
SENTRY_ORG=synaptic-a2  # Use the org from the token
```

### Issue: "Build fails with Sentry errors"

**Temporary Fix:**
```bash
# Disable Sentry upload for build
unset SENTRY_AUTH_TOKEN
npm run build
```

**Permanent Fix:**
- Fix organization/project mismatch
- OR: Set `silent: true` in `next.config.ts` (already done)

---

## 📊 Monitoring Checklist

After enabling Sentry, monitor these:

**Week 1:**
- [ ] Error rate < 1% of requests
- [ ] No critical unhandled errors
- [ ] Source maps uploading correctly
- [ ] User context being set

**Ongoing:**
- [ ] Weekly error rate review
- [ ] Investigate errors with >10 occurrences
- [ ] Fix critical bugs within 24 hours
- [ ] Monitor quota usage (stay under 80%)

---

## 🎉 Summary

### What's Working:
✅ Sentry SDK installed (`@sentry/nextjs` v10.20.0)
✅ All 5 configuration files created
✅ Next.js config updated with production-only Sentry
✅ Global error boundary added
✅ Environment variables template updated
✅ Sensitive data filtering enabled
✅ Development errors filtered out
✅ Free tier optimizations applied

### What's Needed:
⏳ Create Sentry project at sentry.io
⏳ Copy DSN and auth token
⏳ Add environment variables to `.env.local` and Vercel
⏳ Test error capture works
⏳ Set up alert rules

### Estimated Setup Time:
**12 minutes total** (if you already have a Sentry account)
- Create project: 5 min
- Get auth token: 2 min
- Add env variables: 3 min
- Test: 2 min

---

## 📚 Resources

- **Sentry Dashboard**: https://sentry.io
- **Next.js Integration Guide**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Error Filtering**: https://docs.sentry.io/platforms/javascript/configuration/filtering/
- **Performance Monitoring**: https://docs.sentry.io/platforms/javascript/performance/
- **Alert Rules**: https://docs.sentry.io/product/alerts/

---

**Setup Status**: ✅ **COMPLETE** - Ready for production deployment
**Next Step**: Create Sentry project and add environment variables
**Questions?**: See `SENTRY-SETUP.md` for full documentation

---

**Last Updated**: November 9, 2025
**Version**: 1.0
