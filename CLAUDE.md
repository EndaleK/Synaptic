# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 TypeScript application that provides AI-powered personalized learning:
- **Learning Style Assessment**: Quiz-based detection of user's learning preferences (VAK model)
- **Document Chat**: Upload documents and engage with Socratic AI teacher
- **Flashcard Generation**: Automatically generate flashcards from uploaded documents
- **Podcast Generation**: Convert documents to AI-narrated audio content (planned)
- **Mind Map Visualization**: Extract hierarchical concepts as interactive mind maps (planned)
- **Multi-format Support**: Handles PDF, DOCX, DOC, TXT, and JSON files

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
The app follows Next.js 15 App Router patterns with clear separation of concerns:
- `app/page.tsx`: Main client-side page with side-by-side layout (Chat interface on left, Flashcard generator on right)
- `app/api/*/route.ts`: Server-side API routes for OpenAI integration
- `components/`: React components with client-side interactivity
- `lib/`: Pure business logic functions (document parsing, PDF handling, OpenAI integration)

### Key Components & Interaction Flow

**ChatInterface** (client-side, dynamically imported):
- Manages document upload state and extracted text
- Sends user messages + document content to `/api/chat-with-document`
- Displays AI responses with typing animation

**DocumentUpload** (client-side):
- Handles file uploads for flashcard generation
- Uses `lib/document-parser.ts` for text extraction
- Sends extracted text to `/api/generate-flashcards`

**FlashcardDisplay** (client-side):
- Interactive flashcard viewer with flip animations
- Supports JSON export via file-saver

### Document Processing Architecture

Two parallel processing pipelines exist:

**Chat Pipeline**:
1. File uploaded in ChatInterface
2. Text extracted via `lib/document-parser.ts` (client-side for DOCX, TXT)
3. For PDFs: Falls back to server-side extraction via `lib/server-pdf-parser.ts`
4. Full document content stored in component state
5. User questions + full document sent to `/api/chat-with-document`

**Flashcard Pipeline**:
1. File uploaded in DocumentUpload
2. Text extracted via same `lib/document-parser.ts`
3. Extracted text sent to `/api/generate-flashcards`
4. OpenAI returns JSON array of flashcard objects

### API Route Details
- `/api/generate-flashcards`: Calls OpenAI with structured prompt to extract 5-15 flashcards from document text
- `/api/chat-with-document`: Implements document-based Q&A, sends document context + user question to OpenAI
- `/api/pdf-worker`: Serves PDF.js worker file with proper headers for client-side PDF viewing

## Environment Configuration

Required environment variables in `.env.local` (see `.env.example` for full template):
```bash
# AI Provider API Keys (configure at least one)
OPENAI_API_KEY=your_openai_api_key_here              # Required for TTS
DEEPSEEK_API_KEY=your_deepseek_api_key_here          # Recommended for cost savings
ANTHROPIC_API_KEY=your_anthropic_api_key_here        # Optional for complex documents

# AI Provider Selection (Optional - intelligent defaults if not set)
MINDMAP_PROVIDER=deepseek                            # Options: openai | deepseek | anthropic
PODCAST_SCRIPT_PROVIDER=deepseek                     # Options: openai | deepseek | anthropic
# FLASHCARD_PROVIDER=openai                           # Optional override
# CHAT_PROVIDER=openai                                # Optional override

# Supabase (Database & Storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Stripe (Monetization)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## Technical Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Clerk (with Supabase integration)
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **State Management**: Zustand (global state with persistence)
- **AI Providers**: Multi-provider architecture supporting OpenAI, DeepSeek, and Anthropic Claude
  - **OpenAI**: gpt-3.5-turbo, gpt-4o, TTS models
  - **DeepSeek**: deepseek-chat (60-70% cheaper than OpenAI)
  - **Anthropic**: claude-3-5-sonnet, claude-sonnet-4 (best for complex documents)
- **Payments**: Stripe (subscription management)
- **Document Processing**: mammoth (DOCX), pdf2json (server-side), pdfjs-dist & react-pdf (client-side)
- **Icons**: lucide-react

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

### Authentication & Authorization Architecture

**Clerk + Supabase Integration**:
- Clerk handles authentication (sign-in, sign-up, session management)
- Middleware (`middleware.ts`) protects routes and syncs Clerk sessions with Supabase
- User profiles in Supabase link to Clerk via `clerk_user_id`
- Row-Level Security (RLS) policies ensure users only access their own data

**Protected Routes**:
- `/dashboard/*` - Requires authentication
- `/(auth)/*` - Public authentication pages
- `/` - Public landing page

### Database Architecture (`supabase/schema.sql`)

**Core Tables**:
1. **user_profiles**: Extended user data, learning preferences, subscription status
2. **learning_profiles**: Quiz results and learning style assessments
3. **documents**: Uploaded files with extracted content and metadata
4. **flashcards**: Generated flashcards with spaced repetition data
5. **chat_history**: Conversation threads with teaching mode tracking
6. **podcasts**: Generated audio content with metadata
7. **mindmaps**: Hierarchical concept maps as JSON structures
8. **usage_tracking**: API usage for billing and rate limiting

**Key Features**:
- Row-Level Security (RLS) on all tables
- Automatic `updated_at` timestamps via triggers
- Indexes for performance on common queries
- Monthly document usage tracking for free tier limits

### State Management Architecture (`lib/store/useStore.ts`)

**Zustand Stores** (with localStorage persistence):

1. **useUserStore**: User profile, learning style, preferred mode
2. **useDocumentStore**: Current document, document history
3. **useUIStore**: Active learning mode, dark mode, minimized view state

**Why Zustand**: Lightweight, TypeScript-first, perfect for cross-component state without prop drilling. Essential for:
- Persisting learning style after quiz
- Sharing active learning mode across dashboard
- Managing document context across features

### Client-Side Architecture Patterns
- **Dynamic imports**: ChatInterface dynamically imported to avoid SSR issues with PDF.js
- **Hydration safety**: Page uses `suppressHydrationWarning` for dark mode compatibility
- **State management**: Zustand for global state (user preferences, active mode, document context)
- **File processing**: Client-side parsing with server-side API calls for AI processing

### Testing Files
Test files exist for manual validation (not automated tests):
- `test-openai.js`: Direct OpenAI API connectivity check
- `test-server.js`: Server endpoint validation
- `test.html`: Static HTML for frontend testing
- `test-pdf-parsing.js`: PDF text extraction validation

## Deployment Strategy

### Web Deployment (Vercel - Recommended)
- **Why Vercel**: Zero-config deployment, seamless Next.js integration, automatic preview deployments
- **Setup**: Connect GitHub repo → Deploy → Configure environment variables
- **Cost**: Free tier for development; Pro tier ($20/month) required for commercial use
- **Features**: Global CDN, automatic HTTPS, serverless functions, edge network

**Alternative**: AWS (Amplify/Lambda/ECS) for full control, but requires more configuration

### Mobile App Deployment (Capacitor)
- **Strategy**: Convert Next.js app to native iOS/Android using Capacitor
- **Process**:
  1. Configure `next.config.ts` for static export
  2. Install Capacitor: `npm install @capacitor/core @capacitor/cli`
  3. Initialize native projects: `npx cap init`
  4. Build and sync: `npm run build && npx cap sync`
  5. Open in Xcode/Android Studio for submission

**Limitations**:
- Requires static export (SSR features won't work in mobile app)
- Wraps web app in native WebView (not truly native performance)
- Best for content-heavy apps; games or heavy graphics need React Native

### Monetization (Stripe)
- **Subscription Tiers**:
  - Free: 10 documents/month, basic features
  - Premium: $9.99/month, unlimited documents, all features
- **Implementation**: Stripe Checkout API + webhooks for subscription management
- **Webhook**: `/api/webhooks/stripe` handles subscription events

## Recommended MCP Servers

To enhance development workflow, install these Model Context Protocol servers:

1. **Supabase MCP Server**: AI-assisted database management
   - Query data with natural language
   - Manage tables, migrations, and schema
   - Setup: Follow https://supabase.com/docs/guides/getting-started/mcp

2. **Postgres MCP Server**: Direct PostgreSQL access
   - Execute SQL queries via AI
   - Schema exploration and optimization

3. **MongoDB MCP Server** (if switching databases):
   - Document-based operations
   - Built-in authentication support

## Future Roadmap

**Phase 2 Features** (In Development):
- Learning Style Assessment Quiz
- Adaptive Dashboard with mode tiles
- Socratic Teaching Mode

**Phase 3 Features** (Planned):
- Podcast Generation (OpenAI TTS)
- Mind Map Visualization (react-flow)
- Spaced Repetition Algorithm

**Phase 4 Features** (Future):
- Collaborative Learning (shared documents)
- Progress Analytics Dashboard
- Mobile App (Capacitor)