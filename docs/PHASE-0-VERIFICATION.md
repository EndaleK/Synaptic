# Phase 0 Verification Checklist

**Purpose**: Verify all Phase 0 prerequisites are configured correctly before proceeding to Phase 1

**Phase**: 0 - Prerequisites & Setup
**Duration**: 30 minutes
**Last Updated**: November 17, 2025

---

## Overview

Phase 0 establishes the foundation for the Admin Dashboard with:
- ✅ Enhanced Sentry monitoring
- ✅ Clerk admin role configuration
- ✅ Admin feature flags

**Completion Criteria**: All checklist items below marked as complete.

---

## 1. Sentry Configuration

### 1.1 Sentry Account Setup

- [ ] **Sentry account created** at [sentry.io](https://sentry.io)
- [ ] **Project created** for Synaptic
  - Recommended name: `synaptic-production`
  - Platform: Next.js
- [ ] **Team tier subscription** (optional but recommended)
  - Cost: $26/month
  - Benefit: 50,000 events/month (vs 5,000 on free tier)

### 1.2 Get Sentry Credentials

Required values from Sentry Dashboard:

- [ ] **DSN** copied
  - Location: Settings → Projects → synaptic-production → Client Keys (DSN)
  - Format: `https://xxxxx@sentry.io/xxxxx`

- [ ] **Organization Slug** copied
  - Location: Settings → General Settings
  - Format: lowercase, hyphenated (e.g., `my-company`)

- [ ] **Project Name** copied
  - Should be: `synaptic` or `synaptic-production`

- [ ] **Auth Token** created
  - Location: Settings → Account → API → Auth Tokens
  - Permissions required: `project:releases`, `org:read`
  - Save this securely (shown only once)

### 1.3 Update Environment Variables

**Development** (`.env.local`):

- [ ] Add `NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id`
- [ ] Add `SENTRY_DSN=https://your-dsn@sentry.io/project-id`
- [ ] Add `SENTRY_ORG=your-org-slug`
- [ ] Add `SENTRY_PROJECT=synaptic`
- [ ] Add `SENTRY_AUTH_TOKEN=your-auth-token`

**Production** (Vercel Environment Variables):

- [ ] Navigate to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` - Select **Production** environment only
- [ ] Add `SENTRY_DSN` - Select **Production** environment only
- [ ] Add `SENTRY_ORG` - Select **Production** environment only
- [ ] Add `SENTRY_PROJECT` - Select **Production** environment only
- [ ] Add `SENTRY_AUTH_TOKEN` - Select **Production** environment only

### 1.4 Verify Sentry Configuration Files

- [ ] **sentry.server.config.ts** enhanced
  - Check for: `profilesSampleRate: 0.1`
  - Check for: `release: process.env.VERCEL_GIT_COMMIT_SHA`
  - Check for: `integrations: [new Sentry.Integrations.Http({ tracing: true })]`

- [ ] **sentry.client.config.ts** - No changes needed (already configured)

- [ ] **sentry.edge.config.ts** - No changes needed (already configured)

### 1.5 Test Sentry Error Reporting

**Test 1: Trigger a test error** (Development)

1. Create a test API route:

```typescript
// app/api/test-sentry/route.ts
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  try {
    throw new Error('Test error from Sentry verification')
  } catch (error) {
    Sentry.captureException(error, {
      tags: { test: 'phase-0-verification' },
      level: 'warning',
    })
    return NextResponse.json({ error: 'Test error triggered' }, { status: 500 })
  }
}
```

2. Visit: `http://localhost:3000/api/test-sentry`

3. Check Sentry Dashboard → Issues
   - ✅ Should see: "Test error from Sentry verification"
   - ✅ Tagged with: `test: phase-0-verification`
   - ✅ Environment: `development`

**Test 2: Test performance monitoring**

1. Add test route with delay:

```typescript
// app/api/test-sentry-performance/route.ts
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  const transaction = Sentry.startTransaction({
    op: 'test',
    name: 'Phase 0 Performance Test',
  })

  // Simulate slow operation
  await new Promise(resolve => setTimeout(resolve, 2000))

  Sentry.setMeasurement('test.duration', 2000, 'millisecond')
  transaction.finish()

  return NextResponse.json({ message: 'Performance test complete' })
}
```

2. Visit: `http://localhost:3000/api/test-sentry-performance`

3. Check Sentry Dashboard → Performance
   - ✅ Should see: Transaction "Phase 0 Performance Test"
   - ✅ Duration: ~2000ms

**Test 3: Verify release tracking** (Production only)

1. Deploy to Vercel
2. Check Sentry → Releases
   - ✅ Should see: Release tagged with Vercel git commit SHA

---

## 2. Clerk Admin Roles

### 2.1 Create Admin Role

- [ ] **Navigate to Clerk Dashboard** → [dashboard.clerk.com](https://dashboard.clerk.com)
- [ ] Select **Synaptic** application
- [ ] Go to **Configure** → **Roles**
- [ ] Click **+ Create Role**
- [ ] Set **Name**: `admin`
- [ ] Set **Description**: `Administrator with access to admin dashboard`
- [ ] Click **Create Role**

**Screenshot for verification**:
- ✅ Role "admin" appears in roles list

### 2.2 Assign Admin Role to Your Account

**Method**: Via Clerk Dashboard (Recommended)

- [ ] Go to **Users** in Clerk Dashboard
- [ ] Click on **your user account**
- [ ] Scroll to **Public Metadata** section
- [ ] Click **Edit**
- [ ] Add the following JSON:

```json
{
  "role": "admin",
  "adminRole": "superadmin"
}
```

- [ ] Click **Save**

**Verification**:
- ✅ Metadata visible in user details
- ✅ No JSON syntax errors

### 2.3 Test Admin Role Assignment

1. **Sign out** completely from your app
2. **Clear cookies** for localhost:3000 (or your domain)
3. **Sign back in** with the admin account
4. Open browser console and run:

```javascript
fetch('/api/user/profile')
  .then(r => r.json())
  .then(console.log)
```

5. **Verify response** contains:
   ```json
   {
     "role": "admin",
     "adminRole": "superadmin"
   }
   ```

- [ ] Admin role visible in user profile API response

---

## 3. Admin Feature Flags

### 3.1 Update .env.local

Add the following to `.env.local`:

```bash
# Admin Dashboard Configuration
NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD=true

# Optional: Email whitelist (leave empty to skip)
ADMIN_EMAIL_WHITELIST=

# Optional: Admin session timeout (default: 60 minutes)
ADMIN_SESSION_TIMEOUT=60
```

- [ ] `.env.local` updated with admin configuration
- [ ] **Restart dev server**: `npm run dev`

### 3.2 Verify Feature Flag

Check that environment variables are loaded:

1. Open browser console
2. Run: `console.log(process.env.NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD)`
3. Should output: `"true"`

- [ ] Feature flag accessible in browser

### 3.3 Update .env.example

- [ ] `.env.example` contains admin configuration section
- [ ] Comments explain each variable
- [ ] Default values documented

---

## 4. Documentation

### 4.1 Verify Documentation Files

- [ ] `ADMIN-DASHBOARD-IMPLEMENTATION-PLAN.md` exists (93 pages)
- [ ] `docs/CLERK-ADMIN-SETUP.md` exists (comprehensive guide)
- [ ] `docs/PHASE-0-VERIFICATION.md` exists (this file)

### 4.2 Review Documentation

- [ ] Implementation plan reviewed and approved
- [ ] Clerk setup guide clear and actionable
- [ ] Verification checklist (this file) complete

---

## 5. Git Commit & Deployment

### 5.1 Commit Phase 0 Changes

Review changes before committing:

```bash
git status
```

**Expected files changed**:
- `sentry.server.config.ts` (enhanced)
- `.env.example` (admin config added)
- `docs/CLERK-ADMIN-SETUP.md` (new)
- `docs/PHASE-0-VERIFICATION.md` (new)
- `ADMIN-DASHBOARD-IMPLEMENTATION-PLAN.md` (new)

**Files NOT changed** (should remain unchanged):
- All user-facing components
- All API routes (except test routes)
- Database schema
- Middleware

- [ ] Review changes: `git diff`
- [ ] No unintended changes to production code

### 5.2 Create Commit

```bash
git add .
git commit -m "feat: Phase 0 - Admin dashboard prerequisites and Sentry enhancements

- Enhanced Sentry configuration with profiling and release tracking
- Added admin role documentation for Clerk
- Created admin feature flags in environment config
- Added comprehensive verification checklist
- Updated .env.example with admin configuration

Phase: 0 - Prerequisites & Setup
Risk: None (configuration only)
Breaking Changes: None"
```

- [ ] Commit created with descriptive message
- [ ] Commit includes all Phase 0 files

### 5.3 Push and Deploy

```bash
git push origin main
```

- [ ] Changes pushed to GitHub
- [ ] Vercel deployment triggered
- [ ] Deployment successful (check Vercel dashboard)

**Post-deployment verification**:
- [ ] Sentry receiving errors from production
- [ ] No new errors introduced by Phase 0 changes

---

## 6. Production Environment Setup

### 6.1 Set Production Environment Variables

**In Vercel Dashboard** → Settings → Environment Variables:

**Sentry Variables** (if not already set):
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Production environment only
- [ ] `SENTRY_DSN` - Production environment only
- [ ] `SENTRY_ORG` - Production environment only
- [ ] `SENTRY_PROJECT` - Production environment only
- [ ] `SENTRY_AUTH_TOKEN` - Production environment only

**Admin Variables** (new):
- [ ] `NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD=false` - Keep disabled until Phase 2
- [ ] `ADMIN_EMAIL_WHITELIST` - Optional, add your email

**IMPORTANT**: Keep `NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD=false` in production until Phase 2 is complete.

### 6.2 Redeploy Production

After setting environment variables:

- [ ] Trigger redeploy in Vercel (or push new commit)
- [ ] Verify deployment successful
- [ ] No errors in Vercel logs

---

## 7. Final Verification

### 7.1 Sentry Dashboard Check

Log in to Sentry and verify:

- [ ] **Project exists**: synaptic-production
- [ ] **Errors visible**: Can see test errors from earlier
- [ ] **Performance data**: Can see transaction data
- [ ] **Alerts configured** (optional for Phase 0):
  - Alert rule: Error rate >10/minute
  - Alert rule: API p95 latency >5s

### 7.2 Clerk Dashboard Check

- [ ] **Admin role created**: Visible in Configure → Roles
- [ ] **Your account has admin role**: Check Users → Your User → Public Metadata
- [ ] **Test account created** (optional): Create a non-admin user for testing access restrictions

### 7.3 Local Development Check

- [ ] Dev server running: `npm run dev`
- [ ] No console errors on startup
- [ ] Sentry test routes return expected errors
- [ ] Environment variables loaded correctly

### 7.4 Production Check

- [ ] Production deployment successful
- [ ] No new errors in Sentry production project
- [ ] Admin routes return 404 (expected, not built yet)
- [ ] Regular user routes working normally

---

## Phase 0 Completion Criteria

**All of the following must be true**:

- ✅ Sentry account created and configured
- ✅ Sentry DSN and credentials added to environment
- ✅ Sentry enhanced configuration deployed
- ✅ Test errors successfully captured in Sentry
- ✅ Clerk admin role created
- ✅ Your account assigned superadmin role
- ✅ Admin feature flags added to environment
- ✅ All documentation created and reviewed
- ✅ Changes committed and deployed
- ✅ No breaking changes to existing functionality

**Success Metrics**:
- 🎯 Sentry capturing errors from development
- 🎯 Sentry capturing errors from production (after deploy)
- 🎯 Admin role visible in Clerk user metadata
- 🎯 Zero impact on existing user functionality

---

## Troubleshooting

### Issue: Sentry not receiving errors

**Solutions**:
1. Check DSN is correct in `.env.local`
2. Restart dev server after adding environment variables
3. Verify error is thrown (check browser console)
4. Check Sentry project is not paused
5. Wait 1-2 minutes (Sentry has slight delay)

### Issue: Clerk admin role not visible

**Solutions**:
1. Verify JSON syntax in Public Metadata (use [jsonlint.com](https://jsonlint.com))
2. Sign out and sign back in (refresh session)
3. Clear browser cookies
4. Check you're editing the correct user account

### Issue: Feature flag not working

**Solutions**:
1. Ensure `NEXT_PUBLIC_` prefix is included
2. Restart dev server after adding to `.env.local`
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console: `console.log(process.env.NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD)`

---

## Next Steps

Once Phase 0 verification is complete:

**✅ Phase 0 Complete** → Proceed to **Phase 1: Observability Stack Enhancement**

**Phase 1 will include**:
- API monitoring wrapper
- Supabase query performance tracking
- Custom Sentry dashboards
- Alert rules and notifications

**Estimated Duration**: 2-3 days

**Risk Level**: Low (additive changes only)

---

## Checklist Summary

**Quick overview** - Check if ready to proceed to Phase 1:

- [ ] ✅ Sentry configured and tested
- [ ] ✅ Clerk admin roles set up
- [ ] ✅ Feature flags added
- [ ] ✅ Documentation complete
- [ ] ✅ Changes committed and deployed
- [ ] ✅ No breaking changes

**Ready for Phase 1?** If all boxes above are checked, you're ready! 🎉

---

**Phase**: 0 - Prerequisites & Setup
**Status**: ✅ Verification Complete
**Last Updated**: November 17, 2025
