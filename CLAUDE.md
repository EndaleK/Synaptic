# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Synaptic** is a Next.js 15 TypeScript application that provides AI-powered personalized learning with support for documents up to 500MB+:

**Core Features**:
- **Learning Style Assessment**: Quiz-based detection of user preferences (VAK model)
- **Document Chat**: Socratic AI teacher with RAG for large documents
- **Flashcard Generation**: Auto-generate flashcards with spaced repetition
- **Podcast Generation**: Text-to-speech with LemonFox API integration
- **Mind Map Visualization**: Interactive concept maps with @xyflow/react
- **Writing Assistant**: Essay editor with AI suggestions and citation management
- **Video Learning**: YouTube search and transcript-based learning
- **Multi-format Support**: PDF, DOCX, TXT, URLs (web pages, arXiv)

**Architecture Highlights**:
- **RAG System**: ChromaDB + LangChain for 500MB+ document processing
- **R2 Storage**: Cloudflare R2 for large file storage with zero egress fees
- **Multi-AI Providers**: OpenAI, DeepSeek, Anthropic with intelligent routing
- **Spaced Repetition**: SM-2 algorithm for flashcard review optimization

**Vision**: Transform traditional study tools into an adaptive, personalized learning platform where the AI functions as an active teacher, guiding learners through Socratic dialogue rather than providing direct answers.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

Development server runs on http://localhost:3000

## Architecture

### Application Structure
The app follows Next.js 15 App Router patterns:

**Core Directories**:
- `app/`: Next.js pages and layouts
  - `app/dashboard/`: Main authenticated app interface (adaptive learning dashboard)
  - `app/(marketing)/`: Public landing pages (pricing, about)
  - `app/(auth)/`: Clerk authentication pages (sign-in, sign-up)
  - `app/api/*/route.ts`: Server-side API endpoints
    - `app/api/generate-*/`: AI generation routes (flashcards, podcast, mindmap, exam)
    - `app/api/flashcards/`: Flashcard CRUD and review system
    - `app/api/mindmaps/[id]/`: Individual mindmap resource operations
    - `app/api/podcasts/[id]/`: Individual podcast resource operations
    - `app/api/documents/`: Document management and uploads
    - `app/api/chat-*/`: Chat and RAG endpoints
- `components/`: Client-side React components
  - UI components for dashboard modes (ChatInterface, FlashcardDisplay, MindMapView, etc.)
  - Shared components (Toast, Modal, Loading states)
- `lib/`: Business logic and utilities
  - `lib/ai/`: Multi-provider AI architecture (OpenAI, DeepSeek, Anthropic)
  - `lib/supabase/`: Database client and utilities
  - `lib/store/`: Zustand state management
  - `lib/spaced-repetition/`: SM-2 algorithm implementation
  - `lib/sse-utils.ts`: Server-Sent Events streaming utilities
  - `lib/*-generator.ts`: Content generation logic (podcast, mindmap, flashcards)
  - `lib/document-parser.ts`: Client-side document text extraction
  - `lib/server-pdf-parser.ts`: Server-side PDF parsing
  - `lib/vector-store.ts`: ChromaDB integration for RAG

### Dashboard Architecture (`app/dashboard/page.tsx`)

The dashboard is a client-side adaptive interface with dynamic view switching:

**Learning Modes**:
- **Home**: DashboardHome - Mode selection tiles, recent documents
- **Chat**: ChatInterface - Socratic Q&A with document context
- **Flashcards**: DocumentUpload + FlashcardDisplay - Generation and review
- **Podcast**: PodcastView - Audio generation and playback
- **Mind Map**: MindMapView - Interactive concept visualization with @xyflow/react
- **Writing**: WritingView - Essay editor with TipTap, citations, AI suggestions
- **Video**: VideoView - YouTube search, transcript extraction, content generation
- **Quiz**: LearningStyleAssessment - VAK model assessment

**State Management**:
- Zustand stores (`lib/store/useStore.ts`) manage active mode, user preferences, document context
- Persisted to localStorage for seamless navigation
- Auto-syncs with Supabase for cross-device consistency

### Document Processing Architecture

Three processing modes based on document size:

**1. Small Documents (<10MB)**:
- Client-side extraction via `lib/document-parser.ts` (DOCX, TXT)
- Server-side PDF parsing via `lib/server-pdf-parser.ts` (pdf2json)
- Full text sent directly to AI APIs
- Used for chat, flashcards, podcasts, mind maps

**2. Large Documents (500MB+) - RAG Pipeline**:
- Upload to Cloudflare R2 via `/api/upload-large-document`
- Text extraction in chunks via `lib/document-chunker.ts`
- Vector embeddings stored in ChromaDB (`lib/vector-store.ts`)
- Similarity search retrieves relevant chunks for generation
- API routes: `/api/chat-rag`, `/api/generate-flashcards-rag`

**3. URL Imports**:
- Web pages: HTML → Markdown via Readability + Turndown
- arXiv papers: PDF download and extraction
- YouTube videos: Transcript extraction via youtube-transcript
- Import handler: `lib/importers/` (detector, arxiv, web-page)

### Critical API Routes

**Document Management**:
- `/api/documents/route.ts`: List, create, delete documents
- `/api/documents/[id]/route.ts`: Get single document
- `/api/documents/[id]/topics/route.ts`: Extract topics for content selection
- `/api/upload-large-document`: R2 upload + vector indexing

**AI Generation** (with SSE streaming support):
- `/api/generate-flashcards`: Standard flashcard generation
- `/api/generate-flashcards-rag`: RAG-based generation for large docs
- `/api/chat-with-document`: Direct chat with full document
- `/api/chat-rag`: RAG-based chat for large documents
- `/api/generate-podcast`: Podcast script + TTS generation (SSE streaming)
- `/api/generate-mindmap`: Mind map extraction with complexity scoring

**Content Resources**:
- `/api/mindmaps/[id]/route.ts`: Retrieve, update, delete individual mindmaps
- `/api/podcasts/[id]/route.ts`: Retrieve, update, delete individual podcasts
- `/api/flashcards/route.ts`: CRUD operations for flashcard sets

**Study Features**:
- `/api/flashcards/review-queue`: Spaced repetition queue (SM-2)
- `/api/flashcards/update-review`: Update review performance
- `/api/study-sessions/start`: Track study session start
- `/api/study-sessions/complete`: Record session completion
- `/api/study-statistics`: Aggregate study metrics

## Environment Configuration

Required environment variables in `.env.local` (see `.env.example` for full template):

**Core Services** (Required):
```bash
# AI Providers (configure at least one)
OPENAI_API_KEY=sk-...                    # Required for embeddings, TTS, flashcards, chat
DEEPSEEK_API_KEY=...                     # Cost-effective alternative ($0.27/M vs $0.50/M)
ANTHROPIC_API_KEY=...                    # Best for complex docs, auto-selected when needed
LEMONFOX_API_KEY=...                     # Podcast TTS (83% cheaper than OpenAI)
YOUTUBE_API_KEY=...                      # Video learning feature

# Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...        # Server-side only, bypasses RLS
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

**Large Document Support** (Optional but recommended for 500MB+ files):
```bash
# ChromaDB Vector Database (RAG system)
CHROMA_URL=http://localhost:8000         # Run: docker run -d -p 8000:8000 chromadb/chroma

# Cloudflare R2 Storage (S3-compatible, zero egress fees)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=synaptic-documents
```

**Optional Services**:
```bash
# Stripe (Monetization)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Upstash Redis (Distributed rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Google Calendar Integration
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Technical Stack

**Core Framework**:
- Next.js 15 (App Router, Server Components, API Routes)
- TypeScript
- Tailwind CSS v4
- React 19

**Authentication & Database**:
- Clerk (authentication, user management)
- Supabase (PostgreSQL with Row-Level Security)
- Zustand (client state with localStorage persistence)

**AI & ML**:
- OpenAI (GPT-4o, text-embedding-3-small, TTS)
- DeepSeek (deepseek-chat, 60-70% cheaper)
- Anthropic (Claude Sonnet 4, complex reasoning)
- LangChain (RAG orchestration, text splitting)
- ChromaDB (vector database for semantic search)

**File Processing**:
- mammoth (DOCX parsing)
- pdf2json (server-side PDF extraction)
- pdfjs-dist + react-pdf (client-side PDF viewing)
- Cloudflare R2 + AWS SDK (large file storage)
- youtube-transcript (video transcripts)
- @mozilla/readability (web page parsing)

**UI Components**:
- @xyflow/react (mind map visualization)
- @tiptap/react (rich text editor)
- recharts (study statistics)
- lucide-react (icons)

**Payments & Monitoring**:
- Stripe (subscriptions, webhooks)
- @sentry/nextjs (error tracking)

## Critical Implementation Details

### AI Provider Architecture (`lib/ai/`)
The app uses a flexible multi-provider architecture that allows easy switching between AI services:

**Provider Abstraction** (`lib/ai/providers/base.ts`):
- Common interface for all AI providers
- Supports text completion and streaming
- TTS generation (OpenAI only)
- Provider health checks via `isConfigured()`

**Available Providers**:
1. **OpenAI** (`lib/ai/providers/openai.ts`):
   - Models: gpt-3.5-turbo, gpt-4o
   - TTS: tts-1, tts-1-hd
   - Best for: Established, reliable, good quality
   - Cost: ~$0.50/M input tokens, ~$1.50/M output tokens

2. **DeepSeek** (`lib/ai/providers/deepseek.ts`):
   - Model: deepseek-chat
   - Best for: Cost savings (60-70% cheaper than OpenAI)
   - Cost: ~$0.27/M input tokens, ~$1.10/M output tokens
   - Default provider for mind maps and podcast scripts

3. **Anthropic** (`lib/ai/providers/anthropic.ts`):
   - Models: claude-3-5-sonnet, claude-sonnet-4
   - Best for: Complex documents, large JSON outputs, superior reasoning
   - Cost: ~$3/M input tokens, ~$15/M output tokens
   - Automatically used for complex mind maps (complexity score ≥ 50)

**Provider Selection** (`lib/ai/index.ts`):
- Automatic provider selection based on feature and document complexity
- Manual override via environment variables (e.g., `MINDMAP_PROVIDER=openai`)
- Fallback logic if primary provider not configured
- Feature-specific defaults:
  - Mind maps: DeepSeek (simple/moderate) or Anthropic (complex)
  - Podcast scripts: DeepSeek
  - Podcast audio: OpenAI (TTS)
  - Flashcards: OpenAI (existing implementation)
  - Chat: OpenAI (existing implementation)

**Token Management**:
- Intelligent truncation at sentence boundaries (~45-48K chars depending on feature)
- Usage tracking for cost monitoring
- Graceful fallback messages when API keys missing

### PDF Handling Architecture
The app uses a dual-mode PDF strategy:

**Server-side text extraction** (`lib/server-pdf-parser.ts`):
- Uses pdf2json for reliable server-side parsing (Node.js only)
- Handles files up to 100MB
- Implements smart truncation at ~48K characters (~12K tokens)
- Detects encrypted/password-protected PDFs with specific error messages
- Detects scanned PDFs (no extractable text) and suggests OCR

**Client-side viewing** (PDFViewer component):
- Uses react-pdf + pdfjs-dist for visual display
- Works independently of text extraction
- Webpack configured to handle PDF.js worker properly
- Dynamic imports prevent SSR hydration issues
- Next.js rewrites serve worker file at `/pdf.worker.min.js`

**Why this matters**: PDF viewer can display ANY PDF visually, but only text-based PDFs support flashcards/chat. The architecture gracefully handles both scenarios.

### Next.js Configuration (`next.config.ts`)
- **Webpack customizations**: Canvas aliasing disabled, PDF worker handled as asset/resource
- **Transpile packages**: react-pdf and pdfjs-dist must be transpiled
- **Server externals**: PDF libraries excluded from server bundle to prevent SSR conflicts
- **Rewrites**: `/pdf.worker.min.js` → `/api/pdf-worker` for worker file serving
- **Security headers**: Comprehensive production security headers including:
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options (SAMEORIGIN)
  - X-Content-Type-Options (nosniff)
  - X-XSS-Protection
  - Referrer-Policy (origin-when-cross-origin)
  - Permissions-Policy (restricts camera, microphone, geolocation)
  - Cache-Control headers for API routes (no-store)
- **Production optimizations**: `poweredByHeader: false`, compression enabled

### Authentication Flow (`middleware.ts`)

**Clerk + Supabase Integration**:
1. Clerk middleware checks authentication status
2. For protected routes (`/dashboard/*`), redirects unauthenticated users to `/sign-in`
3. Auto-creates Supabase `user_profiles` record on first dashboard visit
4. Supabase middleware (`lib/supabase/middleware.ts`) syncs session cookies
5. RLS policies enforce user data isolation using `clerk_user_id`

**Route Protection**:
- Public: `/`, `/sign-in`, `/sign-up`, `/pricing`, `/api/webhooks/*`
- Protected: `/dashboard/*` (redirects to sign-in if not authenticated)
- API routes return 401 JSON instead of redirecting

### Database Schema (Supabase)

**Core Tables** (see `supabase/schema.sql` for full schema):

1. **user_profiles**: User metadata, learning style, subscription tier, Clerk integration
2. **learning_profiles**: VAK quiz results, learning preferences
3. **documents**: Uploaded files (metadata, extracted text, R2 storage keys)
4. **flashcards**: Generated cards with SM-2 spaced repetition fields (easiness, interval, next_review)
5. **chat_history**: Conversation threads for document chat
6. **podcasts**: Generated audio with script, TTS metadata
7. **mindmaps**: JSON concept hierarchies with node relationships
8. **essays**: Writing assistant documents with content, citations
9. **study_sessions**: Session tracking for analytics
10. **study_schedule_events**: Calendar events, Pomodoro timers
11. **usage_tracking**: API call counts for rate limiting

**Critical Features**:
- **RLS Policies**: All tables filter by `user_id` (linked to Clerk via `clerk_user_id`)
- **Triggers**: Auto-update `updated_at` timestamps
- **Indexes**: Optimized for `user_id`, `document_id`, `next_review` queries
- **Foreign Keys**: Cascade deletes (document → flashcards, podcasts, mindmaps)

### State Management (`lib/store/useStore.ts`)

Three Zustand stores with localStorage persistence:

1. **useUserStore**: `userProfile`, `learningStyle`, `preferredMode`
2. **useDocumentStore**: `currentDocument`, `documentHistory`, `setCurrentDocument()`
3. **useUIStore**: `activeMode`, `darkMode`, `isMinimized`, `setActiveMode()`

**Key Patterns**:
- Stores persist to localStorage via `persist()` middleware
- Dashboard reads `activeMode` from useUIStore to render correct view
- Document context shared across chat, flashcards, podcasts, mind maps
- Learning style from quiz persists and customizes UI

### RAG Architecture for Large Documents

**Problem**: 500MB+ PDFs exceed AI context windows (128K tokens ≈ 96K words ≈ 384 pages)

**Solution** (`lib/vector-store.ts`):
1. Upload file to R2 storage (zero egress fees)
2. Extract text in chunks (1000 chars, 200 overlap)
3. Generate embeddings via OpenAI `text-embedding-3-small`
4. Store vectors in ChromaDB with document metadata
5. On query: Semantic search retrieves top-K relevant chunks
6. Send only relevant chunks to AI (fits in context window)

**Usage**:
- Start ChromaDB: `docker run -d -p 8000:8000 chromadb/chroma`
- Set `CHROMA_URL=http://localhost:8000` in `.env.local`
- Upload via `/api/upload-large-document` (auto-indexes)
- Chat via `/api/chat-rag`, flashcards via `/api/generate-flashcards-rag`

### Large File Upload Architecture (`/api/upload-large-document`)

**Problem**: Vercel has 4.5MB request body limit, need to handle 500MB+ files

**Solution - Chunked Upload System**:
1. **Client-side chunking** (`components/LargeFileUploader.tsx`):
   - Files split into 4MB chunks (safely under Vercel limit)
   - Parallel upload with configurable concurrency (default: 3)
   - Retry logic: 3 attempts per chunk with exponential backoff
   - Progress tracking per chunk and overall
   - Pause/resume support

2. **Server-side assembly** (`/api/upload-large-document/route.ts`):
   - Receives chunks with metadata (chunkIndex, totalChunks, fileId)
   - Uploads each chunk to R2 storage
   - Tracks chunk completion in memory
   - On final chunk: assembles complete file in R2
   - Triggers vector indexing for RAG

3. **Authentication requirements**:
   - Each chunk request must include Clerk session cookies
   - Use `credentials: 'include'` in fetch calls
   - Session must remain valid for entire upload (can take minutes)

**Key Implementation Details**:
- Chunk size: 4MB (4 * 1024 * 1024 bytes)
- Concurrency: 3 parallel uploads (configurable)
- Retry policy: 3 attempts with 1s, 2s, 4s delays
- File ID: UUID generated client-side to track upload
- Cleanup: Failed uploads cleaned from R2 automatically

**Common Issues**:
- **401 Errors**: Session expired during upload, user needs to re-authenticate
- **Network failures**: Handled by retry logic, but may need manual retry
- **Memory usage**: Large files processed in chunks to avoid memory issues

### Spaced Repetition System (`lib/spaced-repetition/sm2-algorithm.ts`)

**SM-2 Algorithm** (SuperMemo 2):
- Tracks flashcard performance: `easiness_factor`, `interval`, `repetitions`
- User rates difficulty: Again (0), Hard (1), Good (2), Easy (3)
- Algorithm adjusts next review date based on performance
- Review queue API: `/api/flashcards/review-queue` returns due cards
- Update performance: `/api/flashcards/update-review` recalculates schedule

**Implementation**: See `lib/spaced-repetition/sm2-algorithm.ts` for full algorithm

### Server-Sent Events (SSE) Streaming (`lib/sse-utils.ts`)

The app uses SSE for real-time progress updates during long-running operations (podcast/mindmap generation).

**Architecture**:
- **Server**: `createSSEStream()` creates ReadableStream with progress updates
- **Client**: EventSource API consumes stream and updates UI in real-time
- **Progress Tracking**: `ProgressTracker` class automatically calculates progress for multi-step operations
- **Heartbeat**: Keeps connection alive every 15 seconds (prevents proxy timeouts)

**Server-side pattern** (API routes):
```typescript
import { createSSEStream, createSSEHeaders, ProgressTracker } from '@/lib/sse-utils'

export const maxDuration = 300 // Important: Set for long-running operations

export async function POST(req: NextRequest) {
  // Pre-flight checks (auth, rate limiting, validation)

  const stream = createSSEStream(async (send) => {
    // Create progress tracker for multi-step operations
    const tracker = new ProgressTracker([
      'Parsing document',
      'Generating script',
      'Creating audio',
      'Finalizing'
    ], send)

    // Step 1
    tracker.completeStep()
    const parsed = await parseDocument()

    // Step 2
    tracker.completeStep()
    const script = await generateScript(parsed)

    // ... more steps ...

    // Final result
    send({ type: 'complete', data: { id: result.id, url: result.url } })
  })

  return new Response(stream, { headers: createSSEHeaders() })
}
```

**Client-side pattern** (React components):
```typescript
const eventSource = new EventSource('/api/generate-podcast')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)

  if (data.type === 'progress') {
    setProgress(data.progress)
    setMessage(data.message)
  } else if (data.type === 'complete') {
    setResult(data.data)
    eventSource.close()
  } else if (data.type === 'error') {
    setError(data.error)
    eventSource.close()
  }
}
```

**Why SSE over WebSockets**:
- Simpler: One-way server → client communication
- Better for serverless: No persistent connection state
- Auto-reconnects on connection loss
- Works with standard HTTP (no upgrade required)
- Perfect for progress bars and status updates

**Vercel Deployment Notes**:
- Set `export const maxDuration = 300` for long-running routes (Vercel Pro: up to 5 minutes)
- Use `export const runtime = 'nodejs'` if using Node.js-specific libraries (pdf2json, ChromaDB)
- Default Edge runtime has 30-second timeout, not suitable for podcast/mindmap generation

## Important Implementation Notes

### Dynamic Imports for SSR Compatibility
Several components use dynamic imports to prevent SSR hydration issues:
- `ChatInterface`: Uses PDF.js which has server/client incompatibilities
- `WritingView`: TipTap editor requires browser APIs
- `VideoView`: YouTube player needs DOM access

**Pattern** (see `app/dashboard/page.tsx`):
```typescript
const ChatInterface = dynamic(() => import("@/components/ChatInterface"), {
  ssr: false,
  loading: () => <LoadingSpinner />
})
```

### Suspense Boundaries for useSearchParams() (Next.js 15 Requirement)
Next.js 15 requires `useSearchParams()` to be wrapped in a Suspense boundary for static generation.

**Pattern** (see `app/dashboard/page.tsx`):
```typescript
function DashboardContent() {
  const searchParams = useSearchParams() // Uses search params
  // ... component logic
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  )
}
```

**Why**: Allows Next.js to statically generate the page while search params are resolved client-side.

### PDF.js Worker Configuration
PDF rendering requires careful webpack configuration:

1. **Webpack config** (`next.config.ts`): Treats worker as asset/resource
2. **Rewrite rule**: `/pdf.worker.min.js` → `/api/pdf-worker`
3. **API route**: `/api/pdf-worker/route.ts` serves worker with correct headers
4. **Client setup**: `pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'`

**Why**: Next.js doesn't handle PDF.js worker out-of-the-box; this ensures proper loading.

### Content Selection UX Pattern
When generating content (flashcards, podcasts, mind maps), users can select specific topics:

1. Upload document → Extract full text
2. Call `/api/documents/[id]/topics` to extract topics via AI
3. Show modal with topic checkboxes
4. Generate content only from selected topics (reduces cost, improves relevance)

**Files**: `components/ContentSelectionModal.tsx`, `components/PageTopicSelector.tsx`

### Rate Limiting Strategy
Two-tier rate limiting (`lib/rate-limit.ts`):

1. **In-memory** (default): Resets on server restart, good for development
2. **Upstash Redis** (production): Distributed across serverless functions

**Configuration**: Set `UPSTASH_REDIS_REST_URL` to enable Redis-based limiting

### Error Handling Patterns
- Client components: Toast notifications (`components/Toast.tsx`)
- API routes: Structured JSON errors with status codes
- Sentry integration: Auto-captures unhandled errors in production

### Vercel Route Configuration

**Route Segment Config** (for API routes):
- `export const maxDuration = <seconds>`: Max execution time (default: 10s Hobby, 15s Pro, 300s Pro with config)
  - Use 300 for long operations: podcast generation, mindmap generation, RAG indexing
  - Use 30 for document uploads
  - Use 10 (default) for simple CRUD operations
- `export const runtime = 'nodejs' | 'edge'`: Runtime environment
  - Use `'nodejs'` for: pdf2json, ChromaDB, Node.js-specific libraries
  - Use `'edge'` (default) for: Simple API routes, better performance, faster cold starts
  - Edge runtime limitations: No Node.js APIs (fs, crypto, etc.), 30s timeout

**When to use which**:
```typescript
// Long AI operations (podcast, mindmap, RAG)
export const maxDuration = 300
export const runtime = 'nodejs' // If using pdf2json or ChromaDB

// Document uploads with R2
export const maxDuration = 30
export const runtime = 'nodejs'

// Simple CRUD, flashcards, chat
// No config needed (uses Edge runtime defaults)
```

**Common Issues**:
- **504 Gateway Timeout**: Route exceeds maxDuration limit, increase to 300 or optimize
- **"Module not found" in production**: Missing `runtime = 'nodejs'` for Node.js libraries
- **"Dynamic Code Evaluation" errors**: Edge runtime doesn't support `eval()`, switch to nodejs runtime

## Troubleshooting Common Issues

### 401 Unauthorized Errors on Production

**Symptoms**: Uploads work locally but fail on production with 401 errors, chunks retry 3 times but all fail

**Root Causes** (in order of likelihood):

1. **Clerk Session Expired** (90% of cases)
   - User logged in days ago, session cookie expired or invalid
   - **Fix**: Sign out completely, clear browser cookies for domain, sign back in
   - **Verification**: Check if `Cookie` header is present in Network tab

2. **Wrong Clerk Keys on Production**
   - Using test keys (`pk_test_`, `sk_test_`) instead of live keys (`pk_live_`, `sk_live_`)
   - Keys not set in Vercel Production environment (only set for Preview)
   - **Fix**:
     - Verify Vercel → Settings → Environment Variables → Filter by "Production"
     - Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_live_`
     - Ensure `CLERK_SECRET_KEY` starts with `sk_live_`
     - Redeploy after updating

3. **Browser Cache/Cookie Issues**
   - Old JavaScript cached or Clerk session cookie corrupted
   - **Fix**:
     - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
     - Clear cookies for the domain
     - Try incognito/private window

4. **CORS/Cookie Blocking**
   - Third-party cookies blocked by browser security settings
   - **Fix**: Check browser console for cookie warnings, enable cookies in browser settings

**Debug Steps**:

1. **Test authentication directly** (run in browser console):
   ```javascript
   fetch('/api/user/profile', { credentials: 'include' })
     .then(r => r.json())
     .then(d => console.log('Auth test:', d))
     .catch(e => console.error('Auth failed:', e))
   ```
   - ✅ If you see user data → Auth works, upload issue is elsewhere
   - ❌ If you see `{ error: 'Unauthorized' }` → Auth broken, sign out/in

2. **Check Network tab during upload**:
   - Open DevTools → Network tab
   - Try upload, click failed request
   - Verify `Cookie:` header is present in Request Headers
   - Check response body for error details

3. **Verify Clerk environment**:
   - Dashboard routes should auto-create user profiles (see `middleware.ts:42-72`)
   - Check Supabase `user_profiles` table has entry for `clerk_user_id`
   - Check browser console for profile creation errors

### R2 Storage Configuration Issues

**Symptoms**: File uploads fail with "Storage not configured" or S3 errors

**Common Causes**:

1. **Missing R2 credentials in environment**:
   - Check `.env.local` has: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - For production: Verify Vercel environment variables are set

2. **Wrong R2 endpoint format**:
   - Must be: `https://<account-id>.r2.cloudflarestorage.com`
   - Not: Custom domain or pub-*.r2.dev URL

3. **Bucket doesn't exist**:
   - Create bucket in Cloudflare dashboard matching `R2_BUCKET_NAME`
   - Ensure API token has read/write permissions for the bucket

**Debug endpoint**: Visit `/api/storage/test` to check R2 configuration status

### ChromaDB Connection Issues

**Symptoms**: RAG features fail, "Cannot connect to ChromaDB" errors

**Fixes**:
- Verify ChromaDB is running: `docker ps | grep chroma`
- Start if not running: `docker run -d -p 8000:8000 chromadb/chroma`
- Check `CHROMA_URL` environment variable (default: `http://localhost:8000`)
- For production: Use hosted ChromaDB instance or dedicated server
- Test connection: `curl http://localhost:8000/api/v1/heartbeat`

### PDF Upload/Processing Issues

**Symptoms**: PDFs upload but fail to generate flashcards/chat

**Common Causes**:

1. **Scanned PDFs** (no extractable text):
   - Error: "This appears to be a scanned PDF"
   - **Solution**: Use OCR software (Adobe Acrobat, online OCR tools) to convert to text-based PDF

2. **Encrypted/Password-Protected PDFs**:
   - Error: "PDF is encrypted or password-protected"
   - **Solution**: Remove protection using PDF tools before uploading

3. **Large PDFs** (>100MB):
   - Use RAG pipeline via "Large File Upload" option
   - Requires R2 and ChromaDB configuration

4. **PDF.js Worker Issues**:
   - Check browser console for worker loading errors
   - Verify `/pdf.worker.min.js` route is accessible
   - Check Next.js rewrite configuration in `next.config.ts`

## Deployment

**Recommended**: Vercel (zero-config Next.js deployment)

**Setup**:
1. Connect GitHub repository
2. Configure environment variables from `.env.example`
3. Deploy (automatic on push to main)

**Production Checklist**:
- Set `NODE_ENV=production`
- Configure Sentry DSN for error tracking
- Set up Stripe webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
- Enable Upstash Redis for distributed rate limiting
- Start ChromaDB instance for large document support
- Configure R2 bucket for file storage