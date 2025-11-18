# Sentry Setup Guide for Synaptic

**Purpose**: Complete guide to setting up Sentry error monitoring and performance tracking

**Time Required**: 20-30 minutes

**Cost**: Free tier (5K events/month) or Team tier $26/month (recommended, 50K events)

---

## Why Sentry?

Sentry provides:
- ✅ **Real-time error tracking** - Know immediately when something breaks
- ✅ **Performance monitoring** - Track API latency and slow queries
- ✅ **Release tracking** - Link errors to specific deployments
- ✅ **User context** - See which users are affected
- ✅ **Stack traces** - Debug with source maps
- ✅ **Alerts** - Slack/email notifications for critical issues

**Already installed**: Sentry is pre-configured in this codebase, just needs credentials.

---

## Step 1: Create Sentry Account

### 1.1 Sign Up

1. Go to [sentry.io](https://sentry.io)
2. Click **Get Started**
3. Sign up with:
   - **GitHub** (recommended - auto-links commits)
   - Email/password
   - Google

### 1.2 Choose Plan

**For Development/Testing**:
- Select **Free** plan
- 5,000 events/month
- 1 project
- 1 GB attachments

**For Production** (Recommended):
- Select **Team** plan ($26/month)
- 50,000 events/month
- Unlimited projects
- 50 GB attachments
- 7-day data retention → 90 days
- **14-day free trial** - Start free, upgrade later

**Our recommendation**: Start with **Free**, upgrade to **Team** when you hit 5K events/month.

### 1.3 Create Organization

- **Organization Name**: Your company name (e.g., "Synaptic")
- **Organization Slug**: `synaptic` (used in URLs)

---

## Step 2: Create Project

### 2.1 Select Platform

1. After creating organization, click **Create Project**
2. **Select Platform**: `Next.js`
3. **Alert frequency**: Default (Alert on every new issue)
4. **Project name**: `synaptic-production`
5. Click **Create Project**

### 2.2 Get DSN

After creating project, you'll see:

```
Client Keys (DSN)
https://xxxxx@o123456.ingest.sentry.io/123456
```

**Copy this DSN** - you'll need it for environment variables.

### 2.3 Skip Setup Wizard

Click **Skip this onboarding** (we've already configured Sentry in code)

---

## Step 3: Get Credentials

### 3.1 Get Organization Slug

1. Click **Settings** (gear icon) → **General Settings**
2. Find **Organization Slug**: `synaptic` (or whatever you chose)
3. Copy this value

### 3.2 Get Project Name

1. Go to **Settings** → **Projects**
2. Find your project: `synaptic-production`
3. Copy the exact name (used in environment variables)

### 3.3 Create Auth Token

**Purpose**: Allows automatic upload of source maps for better stack traces

1. Go to **Settings** → **Account** → **API** → **Auth Tokens**
2. Click **Create New Token**
3. **Name**: `Vercel Source Maps Upload`
4. **Scopes**: Select:
   - ✅ `project:releases` (for uploading source maps)
   - ✅ `org:read` (for reading project info)
5. Click **Create Token**
6. **Copy the token immediately** (shown only once!)
   - Format: `sntrys_xxxxx`

**Store securely**: Save in password manager or `.env.local` immediately.

---

## Step 4: Configure Environment Variables

### 4.1 Development Setup

Create/edit `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456
SENTRY_ORG=synaptic
SENTRY_PROJECT=synaptic-production
SENTRY_AUTH_TOKEN=sntrys_xxxxx
```

**Replace**:
- `xxxxx@o123456.ingest.sentry.io/123456` with your actual DSN
- `synaptic` with your organization slug
- `synaptic-production` with your project name
- `sntrys_xxxxx` with your auth token

### 4.2 Production Setup (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project: **Synaptic**
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

**Add: NEXT_PUBLIC_SENTRY_DSN**
- Name: `NEXT_PUBLIC_SENTRY_DSN`
- Value: `https://xxxxx@o123456.ingest.sentry.io/123456`
- Environment: **Production** ✅ (uncheck Preview and Development)
- Click **Save**

**Add: SENTRY_DSN**
- Name: `SENTRY_DSN`
- Value: `https://xxxxx@o123456.ingest.sentry.io/123456`
- Environment: **Production** ✅
- Click **Save**

**Add: SENTRY_ORG**
- Name: `SENTRY_ORG`
- Value: `synaptic` (your org slug)
- Environment: **Production** ✅
- Click **Save**

**Add: SENTRY_PROJECT**
- Name: `SENTRY_PROJECT`
- Value: `synaptic-production`
- Environment: **Production** ✅
- Click **Save**

**Add: SENTRY_AUTH_TOKEN**
- Name: `SENTRY_AUTH_TOKEN`
- Value: `sntrys_xxxxx` (your auth token)
- Environment: **Production** ✅
- Click **Save**

**Important**: Only select **Production** environment for now. Preview/Development can use the free tier or different project.

---

## Step 5: Test Sentry

### 5.1 Restart Development Server

```bash
# Stop dev server (Ctrl+C)
npm run dev
```

### 5.2 Create Test Error Route

Create file: `app/api/test-sentry/route.ts`

```typescript
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  try {
    // Trigger a test error
    throw new Error('🧪 Sentry test error - This is expected!')
  } catch (error) {
    // Capture in Sentry
    Sentry.captureException(error, {
      tags: {
        test: 'sentry-setup',
        environment: 'development',
      },
      level: 'info', // Use 'info' level so it doesn't spam your error dashboard
    })

    return NextResponse.json({
      message: 'Test error sent to Sentry',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 })
  }
}
```

### 5.3 Trigger Test Error

1. Open browser: `http://localhost:3000/api/test-sentry`
2. Should see JSON response:
   ```json
   {
     "message": "Test error sent to Sentry",
     "error": "🧪 Sentry test error - This is expected!"
   }
   ```

### 5.4 Verify in Sentry Dashboard

1. Go to [sentry.io](https://sentry.io)
2. Select your organization: **Synaptic**
3. Select your project: **synaptic-production**
4. Click **Issues** in sidebar
5. Should see issue: **"🧪 Sentry test error - This is expected!"**
6. Click on the issue to see details:
   - ✅ Stack trace visible
   - ✅ Tagged with `test: sentry-setup`
   - ✅ Environment: `development`

**If you don't see the error**:
- Wait 30-60 seconds (Sentry has slight delay)
- Check browser console for errors
- Verify `.env.local` has correct DSN
- Restart dev server

---

## Step 6: Test Performance Monitoring

### 6.1 Create Performance Test Route

Create file: `app/api/test-sentry-performance/route.ts`

```typescript
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  // Start a transaction
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'Sentry Performance Test',
  })

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Add custom measurement
  Sentry.setMeasurement('test.duration', 1500, 'millisecond')

  // Finish transaction
  transaction.finish()

  return NextResponse.json({
    message: 'Performance test complete',
    duration: 1500
  })
}
```

### 6.2 Trigger Performance Test

1. Open browser: `http://localhost:3000/api/test-sentry-performance`
2. Should see JSON response after ~1.5 seconds

### 6.3 Verify in Sentry Dashboard

1. Go to Sentry Dashboard
2. Click **Performance** in sidebar
3. Should see transaction: **"Sentry Performance Test"**
4. Click on transaction to see:
   - ✅ Duration: ~1500ms
   - ✅ Custom measurement: `test.duration`

**Note**: Performance data may take 2-3 minutes to appear in dashboard.

---

## Step 7: Configure Alerts (Optional)

### 7.1 Create Error Alert

1. In Sentry Dashboard, click **Alerts** → **Create Alert**
2. **Alert type**: Issues
3. **Conditions**:
   - When: `An event is seen`
   - Environment: `production` (only alert on prod errors)
   - Level: `error` or higher
4. **Filters**: None (alert on all errors)
5. **Actions**:
   - Send notification to: **Email** (your email)
   - Optional: Add **Slack** webhook
6. **Name**: Production Error Alert
7. Click **Save Rule**

### 7.2 Create Performance Alert

1. Click **Alerts** → **Create Alert**
2. **Alert type**: Metric
3. **Metric**: `avg(transaction.duration)`
4. **Conditions**:
   - When: `Average value`
   - Is above: `5000` (5 seconds)
   - In: `1 hour`
   - Environment: `production`
5. **Filters**:
   - Transaction: `*` (all routes)
6. **Actions**:
   - Send notification to: **Email**
7. **Name**: Slow API Alert (>5s average)
8. Click **Save Rule**

---

## Step 8: Deploy to Production

### 8.1 Commit Changes

```bash
git add .
git commit -m "feat: Sentry test routes for verification"
git push origin main
```

### 8.2 Verify Production Deployment

After Vercel deploys:

1. **Trigger production test error**:
   ```
   https://your-domain.com/api/test-sentry
   ```

2. **Check Sentry Dashboard**:
   - Should see error from production
   - Environment: `production`
   - Release: Tagged with Vercel git commit SHA

3. **Verify source maps**:
   - Click on error → Stack trace
   - Should show original TypeScript code (not minified)
   - Source maps uploaded automatically by Vercel

---

## Step 9: Remove Test Routes (Optional)

After verifying Sentry works:

```bash
# Remove test files
rm app/api/test-sentry/route.ts
rm app/api/test-sentry-performance/route.ts

git add .
git commit -m "chore: Remove Sentry test routes"
git push origin main
```

**Or keep them**: Test routes are harmless and useful for future testing.

---

## Sentry Dashboard Tour

### Issues Tab
- **All Issues**: Every error captured
- **Unresolved**: Errors not marked as resolved
- **For Review**: Errors needing triage
- **Ignored**: Errors you've chosen to ignore

**Useful filters**:
- Environment: `production` (only show prod errors)
- Level: `error` (hide warnings/info)
- Status: `unresolved` (active errors)

### Performance Tab
- **Transactions**: API routes and page loads
- **Slow endpoints**: Sorted by p95 latency
- **Trends**: Performance over time

**Metrics to watch**:
- **p50**: Median response time
- **p95**: 95th percentile (what slow requests experience)
- **p99**: 99th percentile (worst case)

### Releases Tab
- Links errors to specific deployments
- Shows error trends per release
- Helps identify which deploy broke something

### Alerts Tab
- Configure email/Slack notifications
- Set thresholds for errors and performance

---

## Best Practices

### Development
- ✅ Use `level: 'info'` for test errors (don't spam error dashboard)
- ✅ Tag errors with context: `{ tags: { feature: 'auth' } }`
- ✅ Use `Sentry.setUser()` to track which user hit the error
- ✅ Use `Sentry.setContext()` to add custom data

### Production
- ✅ Monitor Sentry daily (first week)
- ✅ Set up Slack alerts for critical errors
- ✅ Resolve errors as you fix them (keeps dashboard clean)
- ✅ Use releases to track which deploy caused issues
- ✅ Review performance trends weekly

### Cost Optimization
- ✅ Use `tracesSampleRate: 0.1` (only track 10% of requests)
- ✅ Filter out known errors with `ignoreErrors` config
- ✅ Use `beforeSend` to redact sensitive data
- ✅ Set up quotas to prevent billing surprises

---

## Troubleshooting

### Error: "DSN not configured"

**Solution**:
1. Check `.env.local` has `NEXT_PUBLIC_SENTRY_DSN`
2. Restart dev server after adding
3. Hard refresh browser (Ctrl+Shift+R)

### Error: "Invalid DSN"

**Solution**:
1. Verify DSN format: `https://xxxxx@sentry.io/xxxxx`
2. Copy DSN directly from Sentry dashboard (don't type manually)
3. Check for extra spaces or quotes

### Errors not appearing in Sentry

**Solutions**:
1. **Wait 1-2 minutes** (Sentry has slight delay)
2. Check environment: Development errors won't send if `beforeSend` returns `null`
3. Check browser console for Sentry SDK errors
4. Verify project is not paused (Settings → General)

### Source maps not uploading

**Solutions**:
1. Check `SENTRY_AUTH_TOKEN` is set in Vercel
2. Verify token has `project:releases` permission
3. Check Vercel build logs for source map upload errors
4. Make sure `SENTRY_ORG` and `SENTRY_PROJECT` match exactly

### Performance data not showing

**Solutions**:
1. Wait 3-5 minutes (performance data slower than errors)
2. Check `tracesSampleRate` is >0 (set to 0.1 by default)
3. Verify transaction was started and finished correctly

---

## Next Steps

✅ **Sentry configured and tested**

**Now you can**:
1. Proceed to Phase 1 (API monitoring wrappers)
2. Set up custom Sentry dashboards
3. Configure team access (invite developers)

---

## Quick Reference

**Environment Variables**:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=sntrys_xxxxx
```

**Capture Error**:
```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'checkout' },
    level: 'error',
  })
}
```

**Track Performance**:
```typescript
import * as Sentry from '@sentry/nextjs'

const transaction = Sentry.startTransaction({
  op: 'http.server',
  name: 'My API Route',
})

// Your code

Sentry.setMeasurement('api.duration', duration, 'millisecond')
transaction.finish()
```

**Add User Context**:
```typescript
Sentry.setUser({
  id: userId,
  email: userEmail,
  subscription: 'premium',
})
```

---

**Last Updated**: November 17, 2025
**Phase**: 0 - Prerequisites & Setup
**Status**: ✅ Complete
