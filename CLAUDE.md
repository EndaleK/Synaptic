# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 TypeScript application that provides AI-powered study tools:
- **Document Chat**: Upload documents and chat with them using OpenAI
- **Flashcard Generation**: Automatically generate flashcards from uploaded documents
- **Multi-format Support**: Handles PDF, DOCX, DOC, TXT, and JSON files

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

Required environment variables in `.env.local`:
```
OPENAI_API_KEY=your_api_key_here
```

## Technical Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **AI**: OpenAI SDK with gpt-3.5-turbo
- **Document Processing**: mammoth (DOCX), pdf2json (server-side), pdfjs-dist & react-pdf (client-side)
- **Icons**: lucide-react

## Critical Implementation Details

### OpenAI Integration (`lib/openai.ts`)
- Uses gpt-3.5-turbo for both flashcards and chat
- **Flashcard generation**: temperature 0.3, max 2000 tokens, structured JSON prompt requesting 5-15 cards
- **Document chat** (`/api/chat-with-document`): temperature 0.1, max 1000 tokens, strict document-grounding
- **Token management**: Both pipelines implement intelligent truncation at sentence boundaries (~45K chars for flashcards, ~48K for chat)
- Graceful fallback messages when API key missing (informative, not errors)

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

### Client-Side Architecture Patterns
- **Dynamic imports**: ChatInterface dynamically imported to avoid SSR issues with PDF.js
- **Hydration safety**: Page uses `suppressHydrationWarning` for dark mode compatibility
- **State management**: Simple useState for flashcards and loading states (no Redux/Zustand needed)
- **File processing**: All file parsing happens in components, results sent to API routes

### Testing Files
Test files exist for manual validation (not automated tests):
- `test-openai.js`: Direct OpenAI API connectivity check
- `test-server.js`: Server endpoint validation
- `test.html`: Static HTML for frontend testing
- `test-pdf-parsing.js`: PDF text extraction validation