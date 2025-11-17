# 🚨 Deployment Issues Diagnosis - AI Features Not Working

## Problem Statement
AI-powered features (video transcription, podcast generation, mindmap generation, flashcards) work perfectly on **local development** but fail on **Vercel deployment**.

---

## 🔍 Root Causes Identified

### **1. Environment Variables Missing on Vercel** (Most Likely)

**Problem**: API keys and environment variables work locally (`.env.local`) but may not be properly set in Vercel.

**What to Check**:
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Verify ALL of these are set for **Production**, **Preview**, AND **Development** environments:

```bash
# CRITICAL - OpenAI (required for most AI features)
OPENAI_API_KEY=sk-...

# CRITICAL - YouTube (required for video transcription)
YOUTUBE_API_KEY=...

# Optional AI Providers
DEEPSEEK_API_KEY=...
ANTHROPIC_API_KEY=...
LEMONFOX_API_KEY=...

# Database
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# App URL (CRITICAL for internal API calls)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Fix**:
1. Go to Vercel → Settings → Environment Variables
2. Add each variable for all three environments (Production, Preview, Development)
3. **IMPORTANT**: After adding variables, you MUST redeploy for them to take effect
4. Click "Redeploy" (not just "Deploy") to rebuild with new env vars

---

### **2. Missing `NEXT_PUBLIC_APP_URL` for Internal API Calls** (High Priority)

**Problem**: Several routes make internal fetch calls to other API routes:

**Examples from code**:
```typescript
// app/api/video/generate-content/route.ts:198
const mindmapResponse = await fetch(
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-mindmap`,
  { method: 'POST', ... }
)

// app/api/video/generate-content/route.ts:215
const examResponse = await fetch(
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/exams`,
  { method: 'POST', ... }
)
```

**Why it fails on deployment**:
- Locally: Falls back to `http://localhost:3000` ✅
- On Vercel: Falls back to `http://localhost:3000` ❌ (doesn't exist in serverless environment)
- Without proper URL, internal API calls **fail silently** or timeout

**Fix**:
Add to Vercel environment variables:
```bash
NEXT_PUBLIC_APP_URL=https://synaptic.study
# or
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

### **3. Vercel Timeout Issues** (Moderate Priority)

**Problem**: Long-running AI operations may exceed Vercel's execution limits.

**Current Settings** (Good):
```typescript
// app/api/generate-podcast/route.ts:18
export const maxDuration = 300 // 5 minutes

// app/api/generate-mindmap/route.ts:15
export const maxDuration = 300 // 5 minutes

// app/api/video/process/route.ts (MISSING!)
// No maxDuration set - defaults to 10s on Hobby, 15s on Pro
```

**Vercel Limits**:
- **Hobby Plan**: 10 seconds max (default)
- **Pro Plan**: 60 seconds max (default), 300 seconds with `maxDuration = 300`
- **Edge Runtime**: 30 seconds max (can't be changed)

**Fix**:
Add `export const maxDuration = 300` to these files:
- `app/api/video/process/route.ts` (YouTube transcript extraction)
- `app/api/generate-flashcards/route.ts` (if missing)
- Any other AI generation routes

---

### **4. Runtime Environment Mismatch**

**Problem**: Some AI features use Node.js-specific libraries that don't work in Edge Runtime.

**Dependencies that REQUIRE Node.js runtime**:
- `pdf2json` (PDF parsing)
- `chromadb` (vector database)
- `@egoist/youtube-transcript-plus` (YouTube transcripts)
- `mammoth` (DOCX parsing)
- `canvas` (image manipulation)

**Current Status**:
- Most routes correctly use **Node.js runtime** (default in Next.js 15)
- Some routes may default to Edge runtime without explicit configuration

**Fix** (if needed):
Add to affected API routes:
```typescript
export const runtime = 'nodejs' // Force Node.js runtime
export const maxDuration = 300
```

---

### **5. YouTube Transcript Library May Fail**

**Problem**: `@egoist/youtube-transcript-plus` makes external HTTP requests to YouTube's servers.

**Potential Issues**:
1. **YouTube rate limiting**: Too many requests from Vercel's IP addresses
2. **YouTube blocking serverless IPs**: Google may block cloud provider IPs
3. **CORS/firewall issues**: Vercel's network configuration
4. **Missing API key**: YouTube Data API requires `YOUTUBE_API_KEY`

**Current Implementation**:
```typescript
// app/api/video/process/route.ts:157
const transcriptData = await fetchTranscript(videoId, { lang: 'en' })
```

**Fix Options**:

**Option A**: Verify YouTube API Key is set on Vercel
```bash
YOUTUBE_API_KEY=AIza...  # Must be set in Vercel env vars
```

**Option B**: Add retry logic with exponential backoff
```typescript
// Add retry wrapper
async function fetchTranscriptWithRetry(videoId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchTranscript(videoId, { lang: 'en' })
    } catch (err) {
      if (i === maxRetries - 1) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

**Option C**: Use YouTube Data API directly as fallback
```typescript
// Use official YouTube Data API v3 captions endpoint
const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
```

---

### **6. OpenAI API Issues on Deployment**

**Problem**: OpenAI SDK may behave differently on serverless.

**Potential Issues**:
1. **API key not set**: `OPENAI_API_KEY` missing from Vercel env vars
2. **Request timeout**: OpenAI requests timing out before completion
3. **Rate limiting**: Hitting OpenAI's rate limits faster on deployment
4. **Streaming issues**: SSE streaming not working through Vercel's proxies

**Current Implementation**:
```typescript
// app/api/video/process/route.ts:8-10
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
```

**Fix**:
Add timeout configuration:
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes
  maxRetries: 2
})
```

---

## 🔧 Immediate Action Plan

### **Step 1: Verify Environment Variables** (5 minutes)

1. Go to Vercel Dashboard
2. Navigate to: Your Project → Settings → Environment Variables
3. Check if ALL these are present:
   - ✅ `OPENAI_API_KEY`
   - ✅ `YOUTUBE_API_KEY`
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (should be `pk_live_*`, not `pk_test_*`)
   - ✅ `CLERK_SECRET_KEY` (should be `sk_live_*`, not `sk_test_*`)
   - ✅ `NEXT_PUBLIC_APP_URL`

4. **CRITICAL**: Ensure each variable is set for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. After adding/updating, click **"Redeploy"** (Deployments tab → latest → "...") → Redeploy

---

### **Step 2: Add Missing maxDuration** (2 minutes)

Add this line to `app/api/video/process/route.ts` (right after imports):

```typescript
export const maxDuration = 300 // Add this at line 12
```

Commit and push to trigger redeployment.

---

### **Step 3: Check Vercel Deployment Logs** (Debugging)

1. Go to Vercel Dashboard → Deployments → Latest Deployment
2. Click "View Function Logs" or "Runtime Logs"
3. Try triggering a video transcription on production
4. Watch for errors in real-time

**Look for these error patterns**:
```
❌ "API key not found" → Missing OPENAI_API_KEY or YOUTUBE_API_KEY
❌ "Timeout" or "504 Gateway Timeout" → Need maxDuration = 300
❌ "fetch failed" or "ECONNREFUSED localhost:3000" → Missing NEXT_PUBLIC_APP_URL
❌ "YouTubeTranscriptError" → YouTube blocking serverless IPs
❌ "Module not found" → Runtime mismatch (need runtime = 'nodejs')
```

---

### **Step 4: Test Each Feature Individually**

After redeployment, test in this order:

1. **Video Transcript** (`/api/video/process`)
   - Should extract captions from YouTube video
   - Check logs for YouTube API errors

2. **Flashcard Generation** (`/api/generate-flashcards`)
   - Should use OpenAI to create flashcards
   - Check logs for OpenAI API errors

3. **Podcast Generation** (`/api/generate-podcast`)
   - Should generate script and audio
   - Check logs for timeout errors (needs maxDuration = 300)

4. **Mind Map Generation** (`/api/generate-mindmap`)
   - Should create concept map with AI
   - Check logs for complexity analysis errors

---

## 🐛 Debugging Commands

### Check which environment variables are available in production:

Create a temporary debug route: `app/api/debug/env/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasYouTube: !!process.env.YOUTUBE_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasClerkPublic: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV
  })
}
```

Then visit: `https://your-app.vercel.app/api/debug/env`

**IMPORTANT**: Delete this route after debugging (contains sensitive info about your setup)

---

## 📊 Expected Results After Fixes

| Feature | Before Fix | After Fix |
|---------|-----------|-----------|
| Video Transcription | ❌ Fails silently | ✅ Extracts captions |
| Flashcard Generation | ❌ Timeout or no response | ✅ Creates flashcards |
| Podcast Generation | ❌ Takes too long, times out | ✅ Generates in 1-3 min |
| Mind Map Generation | ❌ Empty or error | ✅ Creates concept map |
| AI Chat | ❌ No response | ✅ Responds with context |

---

## 🔗 Vercel Documentation References

- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Serverless Function Timeouts](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
- [Runtime Configuration](https://vercel.com/docs/functions/runtimes)
- [Function Logs](https://vercel.com/docs/observability/runtime-logs)

---

## 📝 Summary

**Most Likely Cause**: Missing environment variables on Vercel (especially `NEXT_PUBLIC_APP_URL`, `OPENAI_API_KEY`, `YOUTUBE_API_KEY`)

**Quick Fix**:
1. Set all environment variables in Vercel Dashboard
2. Add `export const maxDuration = 300` to video processing route
3. Add `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`
4. Redeploy

**Time to Fix**: 5-10 minutes

**If still not working**: Check Vercel function logs for specific error messages and update this document with findings.
