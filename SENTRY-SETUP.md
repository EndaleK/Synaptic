# Sentry Error Monitoring Setup Guide

## Current Status
- ✅ @sentry/nextjs package installed (v10.20.0)
- ⏳ Configuration files need to be created
- ⏳ Environment variables need to be set

---

## Why Sentry?

**Benefits:**
- Real-time error tracking across client, server, and edge
- Performance monitoring (transaction tracing)
- Release tracking and source maps for debugging
- User feedback collection
- Alert notifications (Slack, email)
- Free tier: 5,000 events/month (sufficient for MVP)

---

## Step 1: Create Sentry Project

1. Go to https://sentry.io
2. Sign up or log in
3. Create a new project:
   - **Platform**: Next.js
   - **Project name**: synaptic-production (or your preferred name)
4. Copy the DSN (Data Source Name) - looks like:
   ```
   https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
   ```

---

## Step 2: Add Environment Variables

Add these to `.env.local` (development) and Vercel environment variables (production):

```bash
# Sentry Configuration
SENTRY_DSN=https://[YOUR_KEY]@o[YOUR_ORG].ingest.sentry.io/[YOUR_PROJECT]
SENTRY_ORG=your-org-name
SENTRY_PROJECT=synaptic-production
SENTRY_AUTH_TOKEN=your_auth_token_here  # Get from Sentry Settings → Auth Tokens
```

**To get Auth Token:**
1. Go to Sentry → Settings → Auth Tokens
2. Create new token with scopes: `project:read`, `project:releases`, `org:read`
3. Copy token to environment variables

---

## Step 3: Create Sentry Configuration Files

Sentry for Next.js 15 requires 3 configuration files:

### 3.1 Create `sentry.client.config.ts` (Client-side error tracking)

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 1.0, // 100% of transactions for development
  // In production: 0.1 (10%) to reduce costs

  // Session replay (optional - records user sessions for debugging)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filtering
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry error (not sent in dev):', hint.originalException || hint.syntheticException);
      return null;
    }

    return event;
  },

  // Ignore common browser errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'Load failed',
  ],
});
```

### 3.2 Create `sentry.server.config.ts` (Server-side error tracking)

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 1.0, // 100% for development
  // In production: 0.1 (10%)

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filtering
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry server error (not sent in dev):', hint.originalException || hint.syntheticException);
      return null;
    }

    return event;
  },

  // Ignore common server errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],
});
```

### 3.3 Create `sentry.edge.config.ts` (Edge runtime error tracking)

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring (lower rate for edge)
  tracesSampleRate: 0.1, // 10% to reduce Edge costs

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filtering
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    return event;
  },
});
```

### 3.4 Create `instrumentation.ts` (Auto-instrument server)

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

---

## Step 4: Update `next.config.ts`

Wrap Next.js config with Sentry:

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // ... your existing config
};

// Wrap with Sentry
export default withSentryConfig(nextConfig, {
  // Sentry Webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps
  silent: false, // Show upload progress

  // Hide source maps from public
  hideSourceMaps: true,

  // Disable in development
  disableLogger: process.env.NODE_ENV === 'development',

  // Automatically instrument Server Components
  automaticVercelMonitors: true,
});
```

**IMPORTANT:** Make sure Sentry config is the LAST export wrapper.

---

## Step 5: Add Sentry to `.env.example`

Update `.env.example` to un-comment Sentry variables:

```bash
# ============================================================================
# Sentry Error Monitoring (Recommended for production)
# ============================================================================
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

---

## Step 6: Test Sentry Integration

### Test Client-Side Error:

Create a test page or add a button:

```typescript
'use client'

import * as Sentry from "@sentry/nextjs";

export function SentryTestButton() {
  const testError = () => {
    Sentry.captureException(new Error("Test client-side error"));
    throw new Error("Test client-side error");
  };

  return (
    <button onClick={testError}>
      Test Sentry (Client)
    </button>
  );
}
```

### Test Server-Side Error:

Add to any API route:

```typescript
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  Sentry.captureException(new Error("Test server-side error"));
  throw new Error("Test server-side error");
}
```

### Verify in Sentry Dashboard:
1. Trigger the test errors
2. Wait 1-2 minutes
3. Check https://sentry.io/organizations/[your-org]/issues/
4. You should see the errors appear

---

## Step 7: Configure Alerts

1. Go to Sentry project → Alerts
2. Create alert rule:
   - **When**: An event is seen
   - **If**: All events
   - **Then**: Send notification to email or Slack
3. Recommended alerts:
   - New issue created (immediate notification)
   - Issue seen >100 times in 1 hour
   - Error rate spike (>10% increase)

---

## Step 8: Set Up Source Maps (Production)

Source maps help debug minified production code.

**Vercel Integration (Recommended):**

1. Install Vercel Sentry integration:
   ```bash
   npm install @sentry/vercel-edge-plugin
   ```

2. Add to `next.config.ts`:
   ```typescript
   {
     experimental: {
       instrumentationHook: true,
     },
   }
   ```

3. Deploy to Vercel - source maps upload automatically

**Manual Upload:**
Sentry webpack plugin (already configured in Step 4) uploads source maps on build.

---

## Performance Monitoring

### Adjust Sample Rates for Production:

```typescript
// sentry.client.config.ts & sentry.server.config.ts
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
```

**Why 10% in production?**
- Reduces Sentry quota usage
- Still provides good performance insights
- Saves costs (Sentry charges per transaction)

---

## Best Practices

### 1. Tag Errors with Context

```typescript
Sentry.setTag('feature', 'flashcards');
Sentry.setContext('document', {
  id: documentId,
  fileName: document.file_name,
});
Sentry.captureException(error);
```

### 2. Set User Context

```typescript
// After user authentication
import { useUser } from '@clerk/nextjs';

const { user } = useUser();

Sentry.setUser({
  id: user.id,
  email: user.emailAddresses[0]?.emailAddress,
  username: user.username,
});
```

### 3. Breadcrumbs for Debugging

```typescript
Sentry.addBreadcrumb({
  category: 'exam',
  message: 'User started exam',
  level: 'info',
  data: {
    examId: exam.id,
    questionCount: exam.question_count,
  },
});
```

### 4. Filter Sensitive Data

```typescript
// sentry.client.config.ts
beforeSend(event, hint) {
  // Remove sensitive data
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
  }

  // Remove API keys from error messages
  if (event.message) {
    event.message = event.message.replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]');
  }

  return event;
},
```

---

## Monitoring Checklist

After enabling Sentry, monitor these metrics:

- [ ] Error rate (should be < 1% of requests)
- [ ] Unhandled errors (should be 0 in critical paths)
- [ ] Performance bottlenecks (>2s server response)
- [ ] Failed API calls
- [ ] Database query performance

---

## Cost Management

**Free Tier Limits:**
- 5,000 errors/month
- 10,000 transactions/month
- 50 GB source map storage

**To Stay Within Limits:**
- Use `beforeSend` to filter non-critical errors
- Lower `tracesSampleRate` in production (10%)
- Don't send errors in development
- Set up rate limiting per error type

**Upgrade When:**
- Consistently hitting limits
- Need longer data retention (>90 days)
- Want advanced features (performance monitoring, profiling)

---

## Troubleshooting

### "Sentry not capturing errors"
1. Check DSN is set correctly in env variables
2. Verify environment is not 'development' (errors filtered out)
3. Check beforeSend filter isn't blocking errors
4. Look for errors in browser/server console

### "Source maps not uploading"
1. Verify `SENTRY_AUTH_TOKEN` is set and valid
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` match Sentry dashboard
3. Run build with `--debug` flag to see Sentry logs
4. Ensure auth token has `project:releases` scope

### "Too many errors"
1. Add specific errors to `ignoreErrors` list
2. Increase `beforeSend` filtering
3. Fix root cause of repeated errors
4. Set up error grouping rules

---

## Files to Create

**Summary of all files needed:**

```
/
├── sentry.client.config.ts     ← Client-side Sentry config
├── sentry.server.config.ts     ← Server-side Sentry config
├── sentry.edge.config.ts       ← Edge runtime Sentry config
├── instrumentation.ts          ← Auto-instrument server
├── next.config.ts              ← Update to wrap with withSentryConfig
└── .env.local                  ← Add SENTRY_* variables
```

---

## Quick Setup Commands

```bash
# 1. Create config files (manually create the files above)

# 2. Add to .env.local
echo "SENTRY_DSN=your_dsn_here" >> .env.local
echo "SENTRY_ORG=your_org" >> .env.local
echo "SENTRY_PROJECT=your_project" >> .env.local
echo "SENTRY_AUTH_TOKEN=your_token" >> .env.local

# 3. Test build
npm run build

# 4. Deploy
vercel --prod

# 5. Trigger test error and check Sentry dashboard
```

---

## Next Steps After Setup

1. Create Sentry alert rules
2. Integrate with Slack/Discord for notifications
3. Set up error ownership (assign errors to team members)
4. Create custom dashboards for key metrics
5. Enable Session Replay for visual debugging
6. Set up release tracking for better debugging

---

**Last Updated**: November 9, 2025
**Sentry Version**: @sentry/nextjs v10.20.0
