# 🔍 Sentry Performance Alert Resolution Guide

## Understanding Your Alert

**Alert**: API Performance Degradation
**Metric**: p95(span.duration) > 3000ms
**Actual**: 50+ seconds
**Filter**: transaction.op:http.server

This means **95% of your API requests** are taking longer than 3 seconds, with some hitting **50+ seconds**.

---

## 🎯 Step-by-Step Resolution

### 1. Find the Slow API Route

**Option A: Via Sentry Dashboard**
1. Click **"View on Sentry"** in the alert email
2. Go to **Performance** → **Transactions**
3. Set time range: **Nov 20, 4:00-5:00 AM**
4. Sort by: **P95 Duration** (descending)
5. Look for routes with **50+ second** durations

**Option B: Check Vercel Logs**
```bash
# If deployed on Vercel
vercel logs --follow
```

**Option C: Add Temporary Logging**
Add this to suspected slow routes:

```typescript
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // ... your code ...

    const duration = Date.now() - startTime
    console.log(`[PERF] Route completed in ${duration}ms`)

    if (duration > 10000) {
      console.warn(`[PERF WARNING] Slow request detected: ${duration}ms`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[PERF ERROR] Route failed after ${duration}ms`, error)
    throw error
  }
}
```

---

## 🔎 Most Likely Slow Routes (Based on Your Code)

### 1. **Podcast Generation** (`/api/generate-podcast`)
**Why it's slow**: TTS generation with LemonFox API

**Check**:
```bash
# Search Vercel logs for podcast generation
grep "generate-podcast" vercel-logs.txt
```

**Typical causes**:
- LemonFox API timeout (30-60s)
- Large document text being converted to audio
- Network latency to LemonFox servers

**Fix**:
- Add streaming response (already implemented)
- Reduce text length sent to TTS
- Implement retry logic with exponential backoff
- Add timeout to LemonFox API calls

### 2. **Mind Map RAG** (`/api/generate-mindmap-rag`)
**Why it's slow**: ChromaDB vector search + AI generation

**Typical causes**:
- ChromaDB not running/slow
- Large document chunking
- Multiple AI API calls

**Fix**:
- Check ChromaDB connection: `curl http://localhost:8000/api/v1/heartbeat`
- Reduce chunk size for vector search
- Implement parallel AI calls
- Cache frequently generated mind maps

### 3. **Document Completion** (`/api/documents/[id]/complete`)
**Why it's slow**: PDF extraction + ChromaDB indexing

**Typical causes**:
- Large PDF files (>100MB)
- PyMuPDF extraction taking long
- ChromaDB indexing slow

**Fix**:
- Use Inngest background jobs for large files
- Implement progress updates
- Skip indexing if document < 10MB

### 4. **Flashcard RAG** (`/api/generate-flashcards-rag`)
**Why it's slow**: Vector search + AI generation

**Typical causes**:
- Too many chunks returned from vector search
- Multiple AI calls for flashcard generation

**Fix**:
- Limit vector search results (top 5-10 chunks)
- Batch flashcard generation
- Use faster AI model (gpt-3.5-turbo instead of gpt-4)

---

## 🚀 Quick Fixes to Implement Now

### 1. Add Request Timeouts

Update suspected slow routes:

```typescript
// app/api/generate-podcast/route.ts
export const maxDuration = 120 // Reduce from 300 to 120 seconds

// Add timeout to external API calls
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  })
} finally {
  clearTimeout(timeout)
}
```

### 2. Add Performance Monitoring

```typescript
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const route = req.nextUrl.pathname

  try {
    // Step 1: Parse request
    const step1 = Date.now()
    const body = await req.json()
    logger.debug(`[${route}] Parse request: ${Date.now() - step1}ms`)

    // Step 2: Database query
    const step2 = Date.now()
    const data = await supabase.from('table').select()
    logger.debug(`[${route}] Database query: ${Date.now() - step2}ms`)

    // Step 3: AI generation
    const step3 = Date.now()
    const result = await generateContent()
    logger.debug(`[${route}] AI generation: ${Date.now() - step3}ms`)

    // Total
    const total = Date.now() - startTime
    logger.api('POST', route, 200, total)

    if (total > 10000) {
      logger.warn(`[PERF] Slow request: ${route} took ${total}ms`)
    }

    return NextResponse.json(result)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`[${route}] Failed after ${duration}ms`, error)
    throw error
  }
}
```

### 3. Implement Caching

```typescript
// For frequently generated content
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Check cache first
const cacheKey = `mindmap:${documentId}:${mapType}`
const cached = await redis.get(cacheKey)

if (cached) {
  logger.debug('[CACHE HIT]', cacheKey)
  return NextResponse.json(cached)
}

// Generate and cache
const result = await generateMindMap()
await redis.set(cacheKey, result, { ex: 3600 }) // Cache for 1 hour

return NextResponse.json(result)
```

---

## 🔧 Immediate Actions

1. **Check Sentry Dashboard** → Find which exact route is slow
2. **Review Route Code** → Look for:
   - External API calls without timeouts
   - Large loops or data processing
   - Missing indexes in database queries
   - Synchronous operations that should be async

3. **Add Logging** → Temporarily add performance logs to suspected routes

4. **Monitor** → Watch for next occurrence and check logs

---

## 📊 How to Prevent Future Alerts

### 1. Set Realistic Timeout Values

```typescript
// Short operations (database CRUD)
export const maxDuration = 10

// Medium operations (AI generation)
export const maxDuration = 60

// Long operations (RAG indexing, large file processing)
export const maxDuration = 300

// But ALWAYS add internal timeouts shorter than maxDuration
```

### 2. Use Background Jobs for Long Operations

```typescript
// Instead of waiting 5 minutes in the API route
// Trigger background job and return immediately

export async function POST(req: NextRequest) {
  const { documentId } = await req.json()

  // Trigger Inngest background job
  await inngest.send({
    name: 'document.process',
    data: { documentId }
  })

  // Return immediately
  return NextResponse.json({
    status: 'processing',
    message: 'Processing started. Check back in a few minutes.'
  })
}
```

### 3. Implement Proper Error Handling

```typescript
try {
  const result = await externalAPI.call(data, {
    timeout: 30000, // 30s timeout
    retries: 3,
    retryDelay: 1000
  })
} catch (error) {
  if (error.code === 'ETIMEDOUT') {
    logger.error('API timeout', { route, duration: 30000 })
    return NextResponse.json({
      error: 'Request timeout. Please try again.'
    }, { status: 504 })
  }
  throw error
}
```

---

## 🎯 Next Steps

1. **Identify the slow route** using Sentry dashboard
2. **Add performance logging** to that route
3. **Deploy and monitor** for next occurrence
4. **Implement fixes** based on findings
5. **Adjust alert threshold** if needed (maybe 5000ms instead of 3000ms for complex operations)

---

## 📞 Common Questions

**Q: Why does the alert not show which API?**
A: The alert shows aggregate data. You need to drill down in the Sentry Performance dashboard to see individual transactions.

**Q: Should I increase maxDuration?**
A: No! Instead, optimize the slow operation or move it to a background job.

**Q: How do I mute this alert temporarily?**
A: Click "Mute this alert" in the email, but make sure to fix the underlying issue.

**Q: Is 50 seconds normal for AI generation?**
A: No. Most AI APIs respond in 5-30 seconds. 50+ seconds indicates:
- Network timeout
- Retrying failed requests
- Processing too much data
- External API being slow

---

**Last Updated**: Nov 20, 2025
**Status**: Investigation needed - check Sentry dashboard for specific route
