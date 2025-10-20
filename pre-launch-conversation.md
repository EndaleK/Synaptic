# Pre-Launch Preparation Conversation - Synaptic AI Learning Platform

**Date**: January 19, 2025
**Project**: Synaptic - AI-Powered Personalized Learning Platform
**Goal**: Prepare application for MVP launch in 2-3 weeks

---

## Table of Contents
1. [Initial Assessment](#initial-assessment)
2. [User Requirements](#user-requirements)
3. [Implementation Plan](#implementation-plan)
4. [Completed Work](#completed-work)
5. [Remaining Tasks](#remaining-tasks)
6. [Key Decisions](#key-decisions)

---

## Initial Assessment

### User's Question
"What should I consider and what features need to be added or what changes need to be made before publishing this application?"

### Context Analysis
- **Application**: Next.js 15 TypeScript app with AI learning features
- **Tech Stack**: Clerk auth, Supabase database, OpenAI API, Stripe payments
- **Current Features**: Flashcards, Chat, Podcast Generation, Mind Maps, URL Import
- **Current State**: Development phase, not production-ready

### Critical Issues Identified

#### 🔴 CRITICAL (Must Fix Before Launch)

1. **Database Schema Mismatch**
   - Schema references `user_profiles.clerk_user_id` but documents table uses `user_id` directly
   - Missing foreign key relationships causing RLS policy failures
   - Missing `sections` column migration not applied to production

2. **Security & Privacy**
   - 243 console.log statements in production code (potential data leaks)
   - No rate limiting on API endpoints (OpenAI costs could explode)
   - Missing input validation on file uploads (security risk)
   - No CORS configuration for API routes

3. **Missing Core Features**
   - No Stripe webhook implementation (subscriptions won't work)
   - No usage tracking implementation (free tier limits not enforced)
   - Podcast/MindMap features partially implemented but not tested
   - No email verification flow

4. **Production Readiness**
   - No error monitoring (Sentry, LogRocket, etc.)
   - No analytics tracking (user behavior, feature usage)
   - No performance monitoring
   - Missing robots.txt and sitemap.xml (SEO)

5. **Documentation & Legal**
   - README.md is generic template
   - No Terms of Service
   - No Privacy Policy
   - No Cookie Consent banner (GDPR/CCPA compliance)

#### ⚠️ IMPORTANT CONSIDERATIONS

6. **Testing**
   - Zero test coverage (no .test.ts files in your code)
   - No E2E tests
   - Untested error scenarios

7. **Cost Management**
   - No OpenAI cost estimation/budgeting
   - No file size limits enforced
   - No document count limits enforced
   - Unlimited document processing could bankrupt you

8. **User Experience**
   - No loading states in several components
   - No offline support
   - No progressive web app features
   - Missing meta tags for social sharing

---

## User Requirements

### Launch Timeline & Scope
- **Timeline**: MVP Launch (2-3 weeks) - Core features only
- **Approach**: Fix critical bugs, basic security, minimal viable product

### Budget
- **Budget Range**: Small budget ($50-200/month)
- **Strategy**: Use free tiers only, implement cost controls strictly, minimize external services

### Feature Priority (All Selected)
1. ✅ Flashcards + Chat (Core MVP)
2. ✅ Podcast Generation
3. ✅ Mind Maps
4. ✅ URL Import (arXiv, web articles)

### Compliance Requirements
1. ✅ Educational compliance (FERPA/COPPA)
2. ✅ General business (ToS + Privacy Policy only)

---

## Implementation Plan

### 📅 WEEK 1: CRITICAL FIXES & SECURITY (Days 1-7)

#### Phase 1A: Database & Authentication (Days 1-2)
1. **Fix Database Schema Issues**
   - Apply missing sections migration to Supabase production
   - Fix user_profiles foreign key relationships
   - Test and verify all RLS policies work correctly
   - Add indexes for performance optimization

2. **Implement Usage Tracking & Limits**
   - Create usage tracking middleware for API routes
   - Enforce free tier limits (10 documents/month)
   - Add document count validation before upload
   - Add file size limits (50MB max for free tier)

#### Phase 1B: Security Hardening (Days 3-4)
3. **Remove Console Logs & Add Proper Logging**
   - Replace all 243 console.log statements with structured logging
   - Implement server-side only logging utility
   - Add error logging without exposing sensitive data

4. **Add Rate Limiting**
   - Install @upstash/ratelimit or similar lightweight solution
   - Add rate limits: 10 req/min for OpenAI endpoints, 60 req/min general
   - Add rate limit headers and user feedback

5. **Input Validation & Sanitization**
   - Add file type validation (whitelist: PDF, DOCX, TXT only)
   - Add content length validation for all API inputs
   - Sanitize user inputs before OpenAI calls

6. **API Security**
   - Add CORS configuration for production domain
   - Verify all API routes have proper auth checks
   - Add request size limits in next.config.ts

#### Phase 1C: Cost Controls (Days 5)
7. **OpenAI Cost Management**
   - Add token counting before API calls
   - Set max tokens per request (conservative limits)
   - Add cost estimation display for users
   - Implement monthly spending cap alerts
   - Add prompt optimization to reduce token usage

---

### 📅 WEEK 2: FEATURES & COMPLIANCE (Days 8-14)

#### Phase 2A: Feature Completion (Days 8-10)
8. **Test & Fix All Features**
   - Flashcards: Test generation, review, export
   - Chat: Test Socratic mode, document context
   - Podcast: Complete TTS integration, test audio generation
   - Mind Maps: Test generation, layout, export
   - URL Import: Test arXiv, web articles, error handling

9. **Add Loading States & Error Handling**
   - Add loading skeletons for all async operations
   - Add user-friendly error messages
   - Add retry mechanisms for failed operations
   - Add offline detection and messaging

#### Phase 2B: Legal & Compliance (Days 11-12)
10. **Create Legal Documents**
    - Write Terms of Service (education-focused)
    - Write Privacy Policy (FERPA/COPPA compliant)
    - Add Cookie Consent banner (for analytics)
    - Create data retention and deletion policies

11. **Implement COPPA Compliance**
    - Add age verification on signup (13+ requirement)
    - Add parental consent flow for under-13 users
    - Implement data export feature
    - Implement account deletion feature

#### Phase 2C: Production Setup (Days 13-14)
12. **Setup Error Monitoring (Free Tier)**
    - Install Sentry (free tier: 5K events/month)
    - Add error boundaries to React components
    - Configure source maps for better debugging

13. **Add Basic Analytics (Free Tier)**
    - Setup Vercel Analytics (included free with Vercel)
    - Track key events: signups, document uploads, feature usage
    - Add simple custom event tracking

14. **SEO & Discoverability**
    - Create robots.txt (allow all for public pages)
    - Generate sitemap.xml for marketing pages
    - Add meta tags for social sharing (og:image, twitter:card)
    - Add proper page titles and descriptions

---

### 📅 WEEK 3: POLISH & LAUNCH PREP (Days 15-21)

#### Phase 3A: Documentation (Days 15-16)
15. **Update README.md**
    - Clear project description
    - Setup instructions for contributors
    - Environment variables guide
    - Deployment instructions

16. **Create User Documentation**
    - Getting started guide
    - Feature tutorials (embedded in app)
    - FAQ page
    - Troubleshooting guide

#### Phase 3B: Performance & Testing (Days 17-18)
17. **Performance Optimization**
    - Add image optimization (use next/image)
    - Implement code splitting for large components
    - Add caching headers for static assets
    - Test Lighthouse scores (aim for 90+ on all metrics)

18. **Manual Testing Checklist**
    - Test all features end-to-end
    - Test on mobile devices (responsive design)
    - Test with slow network (3G throttling)
    - Test error scenarios (API failures, network errors)
    - Test accessibility (keyboard navigation, screen readers)

#### Phase 3C: Deployment (Days 19-20)
19. **Production Environment Setup**
    - Setup Vercel production deployment
    - Configure environment variables in Vercel
    - Setup custom domain (if ready)
    - Configure Supabase production database
    - Test production build locally first

20. **Stripe Integration (If Monetizing)**
    - Create Stripe products (Free, Premium tiers)
    - Implement webhook handler for subscription events
    - Test payment flow in Stripe test mode
    - Add billing page in dashboard

#### Phase 3D: Launch Day (Day 21)
21. **Pre-Launch Checklist**
    - Verify all environment variables set
    - Test signup/login flow
    - Test all four learning modes
    - Verify rate limits working
    - Verify usage tracking working
    - Deploy to production
    - Monitor error logs for first 24 hours

---

## Completed Work

### ✅ Package Installation
**File**: `package.json` (modified)

Installed packages:
```json
{
  "@upstash/ratelimit": "^latest",
  "@upstash/redis": "^latest",
  "zod": "^latest",
  "@sentry/nextjs": "^latest"
}
```

**Purpose**: Enable rate limiting, input validation, and error monitoring

---

### ✅ Production-Safe Logging Utility
**File**: `lib/logger.ts` (created)

**Features**:
- Automatic sensitive data redaction (passwords, tokens, API keys)
- Server-side only logging (never logs on client)
- Structured logging with timestamps
- Log levels: debug, info, warn, error
- Special methods:
  - `logger.api()` - Structured API request logging
  - `logger.cost()` - OpenAI cost tracking
  - `withTiming()` - Async operation timing

**Usage Example**:
```typescript
import { logger } from '@/lib/logger'

// Safe logging - automatically redacts sensitive data
logger.info('User action', { userId, apiKey: 'secret' })
// Output: [2025-01-19] [INFO] User action {"userId":"123","apiKey":"[REDACTED]"}

// API logging
logger.api('POST', '/api/generate-flashcards', 200, 1234)

// Cost tracking
logger.cost('gpt-3.5-turbo', 1500, 0.0015, { userId: '123' })
```

**Security Features**:
- Redacts: password, token, apiKey, secret, authorization, cookie, jwt
- Production mode: No debug/info logs
- No stack traces in production (only error messages)

---

### ✅ Rate Limiting Middleware
**File**: `lib/rate-limit.ts` (created)

**Features**:
- In-memory rate limiting (MVP-ready, no Redis required)
- Automatic cleanup of expired entries
- Rate limit headers in responses
- Multiple preset configurations
- User-based or IP-based limiting

**Preset Configurations**:
```typescript
RateLimits.standard    // 60 req/min - General API
RateLimits.ai          // 10 req/min - OpenAI endpoints
RateLimits.auth        // 5 req/15min - Authentication
RateLimits.upload      // 20 req/hour - Document uploads
```

**Usage Example**:
```typescript
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await applyRateLimit(
    req,
    RateLimits.ai,
    userId
  )

  if (rateLimitResponse) {
    return rateLimitResponse // 429 Too Many Requests
  }

  // Proceed with request...
}
```

**Response Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: When the limit resets (ISO 8601)
- `Retry-After`: Seconds until retry (on 429 response)

---

### ✅ OpenAI Cost Estimator
**File**: `lib/cost-estimator.ts` (created)

**Features**:
- Token estimation and cost calculation
- Usage tracking per user
- Budget alerts and warnings
- Cost display formatting

**Pricing Data** (as of Jan 2025):
```typescript
PRICING = {
  'gpt-4o-mini': { input: $0.15/1M, output: $0.60/1M },
  'gpt-3.5-turbo': { input: $0.50/1M, output: $1.50/1M },
  'gpt-4-turbo': { input: $10/1M, output: $30/1M },
  'tts-1': { input: $15/1M chars, output: $0 },
  'tts-1-hd': { input: $30/1M chars, output: $0 },
}
```

**Usage Limits**:
```typescript
FREE_TIER: {
  maxDocuments: 10,
  maxCostPerMonth: $10,  // Hard limit
  warningCostPerMonth: $5, // Warning threshold
}

PREMIUM_TIER: {
  maxDocuments: unlimited,
  maxCostPerMonth: $100,  // Soft limit for alerting
  warningCostPerMonth: $75,
}
```

**Usage Example**:
```typescript
import { estimateRequestCost, trackUsage, shouldWarnUser } from '@/lib/cost-estimator'

// Before API call - estimate cost
const estimate = estimateRequestCost('gpt-3.5-turbo', prompt, 1000)
console.log(`Estimated cost: ${estimate.estimatedCost}`)

// After API call - track actual usage
trackUsage(userId, 'gpt-3.5-turbo', inputTokens, outputTokens)

// Check if user needs warning
const { warn, message } = shouldWarnUser(userId)
if (warn) {
  // Show warning to user
}
```

**Key Functions**:
- `estimateTokens(text)` - Rough token count (1 token ≈ 4 chars)
- `calculateCost(model, inputTokens, outputTokens)` - Exact cost
- `trackUsage(userId, model, inputTokens, outputTokens)` - Log usage
- `getUserUsage(userId, 'month')` - Get usage stats
- `shouldWarnUser(userId)` - Check if over budget

---

### ✅ Input Validation Schemas
**File**: `lib/validation.ts` (created)

**Features**:
- Zod schemas for type-safe validation
- File upload security checks
- URL validation (prevents SSRF attacks)
- Content safety validation (XSS prevention)
- COPPA age verification helpers

**Available Schemas**:
```typescript
// File uploads
FileUploadSchema.parse({
  name: "document.pdf",
  size: 1024 * 1024, // 1MB
  type: "application/pdf"
})

// URL imports
URLImportSchema.parse({
  url: "https://arxiv.org/abs/2301.12345"
})

// Chat messages
ChatMessageSchema.parse({
  message: "Explain this concept",
  documentId: "uuid-here",
  mode: "socratic"
})

// Flashcard generation
FlashcardGenerationSchema.parse({
  documentId: "uuid-here",
  count: 10
})

// Age verification (COPPA)
AgeVerificationSchema.parse({
  birthDate: "2010-05-15",
  parentalConsent: false
})
```

**Security Functions**:
```typescript
// Sanitize file names (prevent directory traversal)
sanitizeFileName("../../etc/passwd.pdf") // → "____etc_passwd.pdf"

// Validate file extension matches MIME type
validateFileExtension("doc.pdf", "application/pdf") // → true

// Check document length limits
validateDocumentLength(content) // → { valid: true }

// Content safety (XSS prevention)
validateContentSafety("<script>alert(1)</script>")
// → { safe: false, reason: "Contains malicious script tags" }

// URL validation (SSRF prevention)
validateImportURL("http://localhost/admin")
// → { valid: false, reason: "Local URLs not allowed" }

// Age validation (COPPA)
validateAge("2010-05-15")
// → { valid: true, age: 14, requiresParentalConsent: false }
```

**Validation Rules**:
- **File Size**: Max 50MB
- **File Types**: PDF, DOCX, DOC, TXT, JSON only
- **Document Length**: 10 - 500,000 characters
- **URL Protocols**: HTTP/HTTPS only
- **Blocked URLs**: localhost, 127.x, 192.168.x, 10.x (SSRF prevention)
- **Age Requirement**: 13+ (COPPA compliance)

---

### ✅ Security Headers Configuration
**File**: `next.config.ts` (modified)

**Added Headers**:
```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN' // Prevents clickjacking
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff' // Prevents MIME sniffing
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block' // XSS protection
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        }
      ]
    },
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, max-age=0' // Never cache API responses
        }
      ]
    }
  ]
}
```

**Production Optimizations**:
```typescript
poweredByHeader: false,  // Don't expose "X-Powered-By: Next.js"
compress: true,          // Enable gzip compression
```

**Security Benefits**:
- **HSTS**: Forces HTTPS connections (2 years)
- **X-Frame-Options**: Prevents embedding in iframes (clickjacking protection)
- **X-Content-Type-Options**: Prevents MIME-type confusion attacks
- **X-XSS-Protection**: Legacy XSS filter (still useful for older browsers)
- **Referrer-Policy**: Controls referrer information sent
- **Permissions-Policy**: Blocks camera, microphone, geolocation access

---

### ✅ SEO Files
**Files**: `public/robots.txt` and `public/sitemap.xml` (created)

#### robots.txt
```txt
User-agent: *
Allow: /
Allow: /pricing
Allow: /about

# Disallow private pages
Disallow: /dashboard/
Disallow: /api/
Disallow: /sign-in
Disallow: /sign-up

Sitemap: https://synaptic.ai/sitemap.xml
```

#### sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://synaptic.ai/</loc>
    <lastmod>2025-01-19</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://synaptic.ai/pricing</loc>
    <lastmod>2025-01-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://synaptic.ai/about</loc>
    <lastmod>2025-01-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

**Benefits**:
- Guides search engine crawlers
- Improves SEO discoverability
- Protects private routes from indexing
- Provides clear sitemap for Google/Bing

---

## Remaining Tasks

### 🔄 Week 1 Remaining (Days 4-7)

#### 1. Replace Console Logs with Proper Logging
**Priority**: High
**Effort**: Medium (243 occurrences)

**Action Items**:
- Replace all `console.log` with `logger.debug()` or `logger.info()`
- Replace all `console.error` with `logger.error()`
- Replace all `console.warn` with `logger.warn()`

**Files Affected** (45 files total):
- All API routes in `app/api/*`
- All components using console statements
- All library utilities

**Example Replacements**:
```typescript
// Before
console.log('Generating flashcards', { documentId })

// After
logger.debug('Generating flashcards', { documentId })

// Before
console.error('Failed to generate:', error)

// After
logger.error('Failed to generate flashcards', error, { documentId })
```

---

#### 2. Add Usage Tracking and Limits Enforcement
**Priority**: Critical
**Effort**: High

**Action Items**:
- Create database migration for usage_tracking table
- Implement usage tracking middleware
- Add document count check before upload
- Add monthly reset cron job
- Display usage stats in dashboard

**Database Schema** (already in `supabase/schema.sql`):
```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  action_type TEXT NOT NULL,
  tokens_used INTEGER,
  credits_used INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation**:
```typescript
// lib/usage-tracker.ts
export async function trackAction(
  userId: string,
  actionType: 'flashcard_generation' | 'podcast_generation' | 'chat_message' | 'mindmap_generation',
  tokensUsed?: number,
  metadata?: Record<string, any>
) {
  await supabase.from('usage_tracking').insert({
    user_id: userId,
    action_type: actionType,
    tokens_used: tokensUsed,
    credits_used: 1,
    metadata
  })
}

export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean
  documentsUsed: number
  limit: number
}> {
  // Get user's subscription tier
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, documents_used_this_month')
    .eq('clerk_user_id', userId)
    .single()

  const limit = profile?.subscription_tier === 'premium' ? -1 : 10
  const used = profile?.documents_used_this_month || 0

  return {
    allowed: limit === -1 || used < limit,
    documentsUsed: used,
    limit
  }
}
```

**Where to Apply**:
- Document upload API route
- URL import API route
- Flashcard generation API route
- Podcast generation API route
- Mind map generation API route

---

#### 3. Apply Rate Limiting to API Routes
**Priority**: High
**Effort**: Medium

**Action Items**:
- Add rate limiting to all OpenAI endpoints
- Add rate limiting to upload endpoints
- Add rate limiting to auth endpoints
- Test rate limits don't block legitimate users

**API Routes to Update**:

1. **`app/api/generate-flashcards/route.ts`**
```typescript
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  // Apply rate limit
  const rateLimitResponse = await applyRateLimit(req, RateLimits.ai, userId)
  if (rateLimitResponse) return rateLimitResponse

  // Rest of implementation...
}
```

2. **`app/api/chat-with-document/route.ts`**
```typescript
// Add RateLimits.ai
```

3. **`app/api/generate-podcast/route.ts`**
```typescript
// Add RateLimits.ai
```

4. **`app/api/generate-mindmap/route.ts`**
```typescript
// Add RateLimits.ai
```

5. **`app/api/documents/route.ts`** (POST)
```typescript
// Add RateLimits.upload
```

6. **`app/api/import-from-url/route.ts`**
```typescript
// Add RateLimits.upload
```

---

#### 4. Setup Sentry Error Monitoring
**Priority**: High
**Effort**: Low

**Action Items**:
- Create Sentry account (free tier)
- Initialize Sentry in project
- Configure source maps
- Test error reporting

**Setup Steps**:
```bash
# 1. Run Sentry wizard
npx @sentry/wizard@latest -i nextjs

# 2. Follow prompts to create Sentry project
# 3. Add SENTRY_DSN to .env.local
```

**Configuration Files** (auto-generated):
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

**Error Boundaries** (add to layout):
```typescript
// app/error.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

---

#### 5. Update .env.example
**Priority**: Medium
**Effort**: Low

**Action Items**:
- Add documentation for all environment variables
- Add comments explaining each variable
- Update with new Sentry variables

**Updated .env.example**:
```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Stripe Configuration (for monetization)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Sentry Error Monitoring
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: Upstash Redis (for distributed rate limiting)
# UPSTASH_REDIS_REST_URL=your_upstash_redis_url
# UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

---

### 🔄 Week 2: Legal & Compliance (Days 8-14)

#### 6. Create Legal Documents

**Terms of Service** (app/(legal)/terms/page.tsx):
- Service description
- User responsibilities
- Educational use disclaimer
- Content ownership
- Limitation of liability
- Termination policy

**Privacy Policy** (app/(legal)/privacy/page.tsx):
- Data collection practices
- How data is used
- Third-party services (OpenAI, Clerk, Supabase)
- FERPA compliance for educational institutions
- COPPA compliance for users under 13
- Data retention and deletion
- User rights (access, export, deletion)
- Cookie usage

**Cookie Consent Banner** (components/CookieConsent.tsx):
- Inform users about cookie usage
- Get consent for analytics
- Provide opt-out option
- Link to Privacy Policy

---

#### 7. COPPA Compliance Implementation

**Age Verification** (components/AgeVerification.tsx):
- Collect birth date during signup
- Calculate age using `validateAge()` from validation.ts
- Block users under 13 without parental consent
- Show parental consent form for under-13

**Parental Consent Flow**:
```typescript
// app/api/parental-consent/route.ts
export async function POST(req: NextRequest) {
  const { childUserId, parentEmail } = await req.json()

  // Send consent email to parent
  // Store consent request in database
  // Create unique consent link
  // Track consent status
}
```

**Data Export Feature** (app/api/user/export-data/route.ts):
```typescript
export async function GET(req: NextRequest) {
  const { userId } = await auth()

  // Gather all user data
  const documents = await getUserDocuments(userId)
  const flashcards = await getUserFlashcards(userId)
  const chats = await getUserChats(userId)

  // Return as downloadable JSON
  return new NextResponse(JSON.stringify({
    profile,
    documents,
    flashcards,
    chats
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="synaptic-data.json"'
    }
  })
}
```

**Account Deletion** (app/api/user/delete-account/route.ts):
```typescript
export async function DELETE(req: NextRequest) {
  const { userId } = await auth()

  // Delete all user data
  await supabase.from('user_profiles').delete().eq('clerk_user_id', userId)
  // Cascade deletes documents, flashcards, chats, etc.

  // Delete Clerk account
  await clerkClient.users.deleteUser(userId)

  return NextResponse.json({ success: true })
}
```

---

### 🔄 Week 3: Testing & Launch (Days 15-21)

#### 8. Update README.md

**Structure**:
```markdown
# Synaptic - AI-Powered Personalized Learning

## Overview
Transform documents into flashcards, podcasts, and mind maps. AI adapts to your unique learning style.

## Features
- 📚 Flashcard Generation
- 💬 AI Chat with Socratic Teaching
- 🎙️ Podcast Generation (TTS)
- 🗺️ Mind Map Visualization
- 🌐 URL Import (arXiv, web articles)

## Tech Stack
- Next.js 15, TypeScript, Tailwind CSS
- Clerk (auth), Supabase (database), OpenAI (AI), Stripe (payments)

## Setup Instructions
1. Clone repository
2. Copy .env.example to .env.local
3. Fill in environment variables
4. Run npm install
5. Run npm run dev

## Environment Variables
[Link to detailed guide]

## Deployment
[Vercel deployment instructions]

## Contributing
[Guidelines for contributors]

## License
[MIT or appropriate license]
```

---

#### 9. Performance Optimization Checklist

**Lighthouse Audit Targets**:
- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

**Optimizations**:
- Use next/image for all images
- Implement dynamic imports for heavy components
- Add loading skeletons
- Optimize bundle size
- Enable font optimization
- Add caching headers for static assets

---

#### 10. Manual Testing Checklist

**Authentication Flow**:
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Password reset (if applicable)
- [ ] Age verification works
- [ ] Under-13 parental consent flow

**Document Upload**:
- [ ] Upload PDF
- [ ] Upload DOCX
- [ ] Upload TXT
- [ ] File size validation (reject >50MB)
- [ ] File type validation (reject invalid types)
- [ ] Free tier limit enforcement (10 documents)

**Flashcard Generation**:
- [ ] Generate from uploaded document
- [ ] Generate from imported URL
- [ ] Review flashcards
- [ ] Export flashcards (JSON)
- [ ] Flashcard quality is good

**Chat Feature**:
- [ ] Chat with uploaded document
- [ ] Socratic teaching mode works
- [ ] Message history persists
- [ ] Context switching between documents

**Podcast Generation**:
- [ ] Generate podcast from document
- [ ] Audio plays correctly
- [ ] Different voices work
- [ ] Download podcast

**Mind Map**:
- [ ] Generate mind map from document
- [ ] Interactive navigation
- [ ] Export functionality

**URL Import**:
- [ ] Import arXiv paper
- [ ] Import web article
- [ ] Import Medium post
- [ ] Error handling for invalid URLs

**Rate Limiting**:
- [ ] AI endpoints limited to 10/min
- [ ] Upload endpoints limited to 20/hour
- [ ] Rate limit headers present
- [ ] User-friendly error messages

**Error Handling**:
- [ ] Network errors handled gracefully
- [ ] API errors show user-friendly messages
- [ ] Offline detection works
- [ ] Retry mechanisms work

**Mobile Responsive**:
- [ ] Test on iPhone (iOS)
- [ ] Test on Android
- [ ] Test on tablet
- [ ] All features work on mobile

**Accessibility**:
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

## Key Decisions

### Architecture Decisions

1. **In-Memory Rate Limiting** (instead of Redis)
   - **Reason**: Cost savings for MVP
   - **Trade-off**: Resets on server restart
   - **Upgrade Path**: Upstash Redis for production scale

2. **In-Memory Usage Tracking** (instead of database queries)
   - **Reason**: Faster performance, less DB load
   - **Trade-off**: Limited to 10,000 entries
   - **Upgrade Path**: Persist to database with cron job

3. **Server-Side Only Logging** (never on client)
   - **Reason**: Security, privacy, prevent data leaks
   - **Trade-off**: Can't debug client-side issues in production
   - **Upgrade Path**: Sentry for client-side error tracking

4. **Zod for Validation** (instead of manual checks)
   - **Reason**: Type safety, better errors, maintainability
   - **Trade-off**: Adds dependency
   - **Benefit**: Catches bugs at compile time

### Security Decisions

1. **50MB File Size Limit**
   - **Reason**: Prevent abuse, control storage costs
   - **Impact**: Some large PDFs rejected
   - **Alternative**: Premium tier could have 100MB limit

2. **Conservative Rate Limits**
   - AI endpoints: 10 requests/min
   - Uploads: 20 requests/hour
   - **Reason**: Prevent API abuse and cost overruns
   - **Impact**: Power users may hit limits
   - **Mitigation**: Premium tier gets higher limits

3. **COPPA Compliance (13+ age requirement)**
   - **Reason**: Legal requirement for educational apps
   - **Impact**: Requires parental consent for under-13
   - **Implementation**: Age verification + consent flow

### Cost Control Decisions

1. **Free Tier: 10 documents/month, $10 OpenAI budget**
   - **Reason**: Attract users while controlling costs
   - **Calculation**: ~$1/user/month average
   - **Goal**: 100 active free users = $100/month cost

2. **Premium Tier: $9.99/month, unlimited documents**
   - **Reason**: Competitive pricing, covers costs + margin
   - **Margin**: $5-7/user/month after OpenAI costs
   - **Target**: 20 paying users = $200/month revenue

3. **Token Limits per Request**
   - Flashcards: Max 2000 output tokens
   - Chat: Max 1000 output tokens
   - **Reason**: Prevent single request from being too expensive
   - **Impact**: Longer content may be truncated

---

## Estimated Costs (Monthly)

### Infrastructure
- **Vercel**: $0 (Hobby tier)
- **Supabase**: $0 (Free tier: 500MB database, 1GB storage)
- **Clerk**: $0 (Free tier: 10,000 MAUs)
- **Sentry**: $0 (Free tier: 5,000 events/month)
- **Stripe**: 2.9% + $0.30 per transaction

### Variable Costs
- **OpenAI API**: $50-150/month (depends on usage)
  - Free users: ~$1/user/month
  - Premium users: ~$3-5/user/month
  - Safety buffer: $50/month cap with alerts

### Total Estimated Cost
- **Minimum**: $50/month (just OpenAI for small user base)
- **Target**: $100/month (moderate usage, cost controls active)
- **Maximum**: $150/month (high usage, near limits)

**Break-even**: 15-20 premium subscribers

---

## Next Steps

### Immediate (This Week)
1. ✅ Install security packages
2. ✅ Create logging utility
3. ✅ Create rate limiting
4. ✅ Create cost estimator
5. ✅ Create validation schemas
6. ✅ Add security headers
7. ✅ Create robots.txt and sitemap.xml
8. ⏳ Replace console.log statements (pending)
9. ⏳ Add usage tracking (pending)
10. ⏳ Apply rate limiting to API routes (pending)
11. ⏳ Setup Sentry (pending)

### Week 2
- Create legal documents (ToS, Privacy Policy)
- Implement COPPA compliance
- Test all features
- Add loading states and error handling
- Setup analytics

### Week 3
- Update documentation
- Performance optimization
- Manual testing
- Production deployment
- Launch!

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Clerk Docs](https://clerk.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

### Legal Templates
- [Terms of Service Generator](https://www.termsfeed.com/terms-service-generator/)
- [Privacy Policy Generator](https://www.termsfeed.com/privacy-policy-generator/)
- [COPPA Compliance Guide](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)

### Testing Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [WAVE Accessibility](https://wave.webaim.org/)

---

## Contact

For questions about this implementation:
- Review this document
- Check CLAUDE.md for project guidelines
- Refer to created utilities in `lib/` folder

---

**Last Updated**: January 19, 2025
**Status**: Week 1 - 70% Complete
**Next Milestone**: Complete security implementation by end of Week 1
