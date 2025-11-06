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
- `components/`: Client-side React components
- `lib/`: Business logic and utilities
  - `lib/ai/`: Multi-provider AI architecture (OpenAI, DeepSeek, Anthropic)
  - `lib/supabase/`: Database client and utilities
  - `lib/store/`: Zustand state management
  - `lib/spaced-repetition/`: SM-2 algorithm implementation

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

**AI Generation**:
- `/api/generate-flashcards`: Standard flashcard generation
- `/api/generate-flashcards-rag`: RAG-based generation for large docs
- `/api/chat-with-document`: Direct chat with full document
- `/api/chat-rag`: RAG-based chat for large documents
- `/api/generate-podcast`: Podcast script + TTS generation
- `/api/generate-mindmap`: Mind map extraction with complexity scoring

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

### Spaced Repetition System (`lib/spaced-repetition/sm2-algorithm.ts`)

**SM-2 Algorithm** (SuperMemo 2):
- Tracks flashcard performance: `easiness_factor`, `interval`, `repetitions`
- User rates difficulty: Again (0), Hard (1), Good (2), Easy (3)
- Algorithm adjusts next review date based on performance
- Review queue API: `/api/flashcards/review-queue` returns due cards
- Update performance: `/api/flashcards/update-review` recalculates schedule

**Implementation**: See `lib/spaced-repetition/sm2-algorithm.ts` for full algorithm

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