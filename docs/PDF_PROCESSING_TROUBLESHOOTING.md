# PDF Processing & Troubleshooting Guide

**Complete reference for understanding, monitoring, and troubleshooting PDF document processing in Synaptic**

Last Updated: 2025-11-11

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Complete Processing Flow](#complete-processing-flow)
3. [Size-Based Routing Logic](#size-based-routing-logic)
4. [Multi-Tier PDF Extraction](#multi-tier-pdf-extraction)
5. [Per-Page Data Extraction](#per-page-data-extraction)
6. [Processing Status Lifecycle](#processing-status-lifecycle)
7. [Common Failure Scenarios](#common-failure-scenarios)
8. [Monitoring & Debugging Tools](#monitoring--debugging-tools)
9. [Database Schema Reference](#database-schema-reference)
10. [Production Deployment](#production-deployment)

---

## Architecture Overview

Synaptic handles PDF documents up to 500MB with a sophisticated multi-tier processing system designed for reliability, performance, and accuracy.

### Key Components

- **Direct Upload**: Client uploads files directly to Supabase Storage via signed URLs (bypasses Vercel 4.5MB limit)
- **Size-Based Routing**: Small PDFs (<10MB) processed synchronously, large PDFs (≥10MB) processed asynchronously
- **Multi-Tier Extraction**: pdf-parse (fast) → PyMuPDF (robust fallback) for maximum compatibility
- **Per-Page Tracking**: New feature that preserves page boundaries and character offsets for accurate content selection
- **Background Jobs**: Inngest handles async processing with retries, timeouts, and failure recovery
- **RAG Indexing**: ChromaDB vector storage enables semantic search for large documents

### Processing Capabilities

| Document Size | Processing Mode | Time to Ready | Max Duration |
|--------------|----------------|---------------|--------------|
| <10MB | Synchronous | 5-30 seconds | 120 seconds |
| ≥10MB | Asynchronous (Inngest) | 1-15 minutes | 900 seconds (15 min) |

---

## Complete Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD REQUEST                                               │
│    User clicks "Upload Document" → File selected                │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SIGNED URL GENERATION                                        │
│    POST /api/documents/upload                                   │
│    • Creates document record (status: 'pending')                │
│    • Generates Supabase signed upload URL (2-hour expiry)       │
│    • Returns: { uploadUrl, document }                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. DIRECT UPLOAD                                                │
│    Client → Supabase Storage                                    │
│    • Upload happens directly (not through API)                  │
│    • Browser handles progress tracking                          │
│    • Automatic retries on failure                               │
│    • No file size limit (up to 5GB supported)                   │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. COMPLETION NOTIFICATION                                      │
│    POST /api/documents/[id]/complete                            │
│    • Verifies file in storage                                   │
│    • Checks actual file size                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
                  SIZE ROUTER
                       ↓
         ┌─────────────┴─────────────┐
         ↓                           ↓
    < 10MB                       ≥ 10MB
 SMALL PDF FLOW              LARGE PDF FLOW
         ↓                           ↓
┌─────────────────────┐    ┌────────────────────┐
│ SYNCHRONOUS         │    │ ASYNCHRONOUS       │
│ (Immediate)         │    │ (Background Job)   │
└─────────┬───────────┘    └─────────┬──────────┘
          ↓                          ↓
┌─────────────────────┐    ┌────────────────────┐
│ 5A. EXTRACT TEXT    │    │ 5B. QUEUE INNGEST  │
│ • Download from     │    │ • Send event       │
│   storage           │    │ • Update status to │
│ • Run pdf-parse     │    │   'processing'     │
│ • Fallback PyMuPDF  │    │ • Return to client │
│ • Capture per-page  │    │                    │
│   data              │    │ UI starts polling: │
│                     │    │ GET /api/documents │
│ Time: 5-30 sec      │    │     /[id]/status   │
└─────────┬───────────┘    └─────────┬──────────┘
          ↓                          ↓
┌─────────────────────┐    ┌────────────────────┐
│ 6A. INDEX (inline)  │    │ INNGEST STEPS:     │
│ • ChromaDB (non-    │    │                    │
│   fatal if fails)   │    │ Step 1: Download   │
│                     │    │ Step 2: Extract    │
│ Time: 2-10 sec      │    │ • pdf-parse        │
└─────────┬───────────┘    │ • PyMuPDF fallback │
          ↓                │ • Per-page data    │
┌─────────────────────┐    │ Timeout: 10 min    │
│ 7A. UPDATE STATUS   │    │                    │
│ • Status: completed │    │ Step 3: RAG Index  │
│ • Save extracted    │    │ • ChromaDB         │
│   text              │    │ Timeout: 10 min    │
│ • Save page data    │    │                    │
│                     │    │ Step 4: Update Doc │
│ READY FOR USE       │    │ • Status: completed│
│ (User can proceed   │    │ • Save results     │
│  immediately)       │    │                    │
└─────────────────────┘    │ Total: 1-15 min    │
                           └─────────┬──────────┘
                                     ↓
                           ┌────────────────────┐
                           │ 6B. POLLING STOPS  │
                           │ UI refreshes       │
                           │                    │
                           │ READY FOR USE      │
                           └────────────────────┘
```

### Decision Points

**Why Direct Upload?**
- Bypasses Vercel's 4.5MB request body limit
- 50-70% faster than chunked upload
- Browser handles retries automatically
- Scales to 5GB with no code changes

**Why Size-Based Routing?**
- Small PDFs: Users want immediate access (synchronous)
- Large PDFs: Avoid blocking request/timeout (asynchronous)
- Threshold: 10MB chosen based on:
  - Typical chapter size for textbooks
  - 120-second Vercel function limit
  - Average extraction time (~30 seconds for 10MB)

**Why Multi-Tier Extraction?**
- pdf-parse: Fast (JavaScript-native), handles 90% of PDFs
- PyMuPDF: Robust (handles complex PDFs with equations, tables, encrypted fonts)
- Fallback ensures maximum compatibility

---

## Size-Based Routing Logic

Location: `app/api/documents/[id]/complete/route.ts:27`

```typescript
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB

const isLargeFile = actualFileSize > LARGE_FILE_THRESHOLD

if (isPDF && !isLargeFile) {
  // Small PDF: Process synchronously
  // Ready in 5-30 seconds
} else if (isPDF && isLargeFile) {
  // Large PDF: Queue Inngest job
  // Ready in 1-15 minutes
}
```

### Small PDF Processing (< 10MB)

**Pros**:
- Immediate availability (no waiting for background job)
- Simpler error handling (errors returned in API response)
- No polling required
- Lower latency for typical use cases

**Cons**:
- Limited by Vercel function timeout (120 seconds)
- Blocks API response until complete
- Can fail if extraction takes >2 minutes

**Max Duration**: 120 seconds (`export const maxDuration = 120`)

### Large PDF Processing (≥ 10MB)

**Pros**:
- No timeout constraints (15-minute limit)
- Doesn't block API response
- Can retry failed steps independently
- Better monitoring via Inngest dashboard

**Cons**:
- Requires polling for status updates
- More complex error handling
- Delayed availability (1-15 minutes)
- Requires Inngest service running

**Max Duration**: 900 seconds (15 minutes total)

---

## Multi-Tier PDF Extraction

Location: `lib/server-pdf-parser.ts`

### Extraction Strategy

```
PDF File
   ↓
┌────────────────────────────┐
│ TIER 1: pdf-parse          │
│ (Fast, JavaScript-native)  │
│                            │
│ Success? → Return text     │
│ Failure? → Continue to T2  │
│                            │
│ Timeout: 8 minutes         │
│ Success rate: ~90%         │
└────────┬───────────────────┘
         ↓ (if error)
┌────────────────────────────┐
│ TIER 2: PyMuPDF            │
│ (Robust, Python subprocess)│
│                            │
│ Success? → Return text     │
│ Failure? → Return error    │
│                            │
│ Timeout: 8 minutes         │
│ Success rate: ~98%         │
└────────────────────────────┘
```

### Tier 1: pdf-parse

**Technology**: Mozilla PDF.js (via npm package `pdf-parse`)

**Characteristics**:
- JavaScript-native (no external dependencies)
- Fast: 2-5 seconds for typical PDFs
- Handles standard PDFs well (text-based, simple structure)
- **Does NOT extract per-page data** (returns concatenated text)

**Limitations**:
- Fails on complex PDFs (encrypted fonts, advanced compression)
- Error: `TypeError: Object.defineProperty called on non-object`
- Cannot handle scanned PDFs (no text layer)

**When It's Used**:
- Always attempted first
- If successful, no fallback needed
- Logged as: `processing_method: 'pdf-parse'`

### Tier 2: PyMuPDF (Fallback)

**Technology**: PyMuPDF (fitz) via Python subprocess

**Characteristics**:
- Python-based (requires `venv/bin/python3`)
- Robust: Handles complex PDFs (PDF 1.7+, encrypted fonts, tables, equations)
- **Extracts per-page data** with character offsets
- Fast: ~4 seconds for 19MB/849-page textbook

**How It Works**:
```typescript
// 1. Save PDF buffer to temp file
const tempFilePath = `/tmp/pdf-extract-${Date.now()}.pdf`
fs.writeFileSync(tempFilePath, buffer)

// 2. Call Python script
const { stdout } = await execAsync(
  `${venvPython} scripts/extract-pdf-pymupdf.py "${tempFilePath}"`,
  { timeout: 480000, maxBuffer: 50 * 1024 * 1024 }
)

// 3. Parse JSON response
const result = JSON.parse(stdout)
// Returns: { success, text, pageCount, pages, method: 'pymupdf' }

// 4. Clean up temp file
fs.unlinkSync(tempFilePath)
```

**Requirements**:
```bash
# Virtual environment with PyMuPDF installed
python3 -m venv venv
source venv/bin/activate
pip install PyMuPDF
```

**When It's Used**:
- Automatically when pdf-parse fails
- Also tried if pdf-parse returns no text
- Logged as: `processing_method: 'pymupdf'`

**Timeout Configuration**:
```typescript
// lib/server-pdf-parser.ts:150
timeout: 480000  // 8 minutes for Python subprocess
maxBuffer: 50 * 1024 * 1024  // 50MB output buffer
```

### Error Handling

```typescript
try {
  const result = await Promise.race([
    parsePDFWithPdfParse(buffer),
    createTimeoutPromise(480000)
  ])

  if (!result.error && result.text && result.text.length > 100) {
    return { ...result, method: 'pdf-parse' }
  }

  // pdf-parse failed - try PyMuPDF
  const pymupdfResult = await parsePDFWithPyMuPDF(buffer)
  return pymupdfResult

} catch (parseError) {
  // pdf-parse threw error - try PyMuPDF
  const pymupdfResult = await parsePDFWithPyMuPDF(buffer)
  return pymupdfResult
}
```

---

## Per-Page Data Extraction

**NEW FEATURE** (Added 2025-11-11)

### Problem Solved

Previously, PDF text was concatenated into a single string, losing page boundaries. This made page-based content selection inaccurate (relied on heuristic estimation).

### Solution

Extract and store per-page text with character offsets during PDF parsing.

### Data Structure

```typescript
interface PageData {
  pageNumber: number      // 1-indexed for display (1, 2, 3...)
  text: string            // Full text for this page
  startOffset: number     // Character position in full text
  endOffset: number       // Character position in full text
}

// Stored in document.metadata.pages
pages: PageData[]
```

### Example

```json
{
  "metadata": {
    "page_count": 3,
    "pages": [
      {
        "pageNumber": 1,
        "text": "Introduction to Statistics...",
        "startOffset": 0,
        "endOffset": 1543
      },
      {
        "pageNumber": 2,
        "text": "Chapter 1: Data Collection...",
        "startOffset": 1545,  // Note: +2 for \n\n separator
        "endOffset": 3204
      },
      {
        "pageNumber": 3,
        "text": "Chapter 2: Descriptive Stats...",
        "startOffset": 3206,
        "endOffset": 5012
      }
    ]
  }
}
```

### How It's Generated

**PyMuPDF Script** (`scripts/extract-pdf-pymupdf.py`):

```python
pages_data = []
current_offset = 0

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()

    if text.strip():
        start_offset = current_offset
        end_offset = current_offset + len(text)

        pages_data.append({
            "pageNumber": page_num + 1,
            "text": text,
            "startOffset": start_offset,
            "endOffset": end_offset
        })

        current_offset = end_offset + 2  # Account for \n\n separator

return {
    "success": True,
    "text": "\n\n".join(text_parts),
    "pages": pages_data  # NEW
}
```

### How It's Used

**Text Extraction** (`lib/text-extraction.ts:extractTextFromPages`):

```typescript
// Strategy 1: Use per-page data (accurate)
if (metadata.pages && Array.isArray(metadata.pages)) {
  const selectedPages = metadata.pages.filter(
    p => p.pageNumber >= startPage && p.pageNumber <= endPage
  )

  const pageTexts = selectedPages.map(p => p.text)
  return pageTexts.join('\n\n')
}

// Strategy 2: Heuristic fallback (less accurate)
// Used for old documents without per-page data
const avgPageLength = fullText.length / totalPages
const startChar = (startPage - 1) * avgPageLength
const endChar = endPage * avgPageLength
return fullText.substring(startChar, endChar)
```

### Benefits

- **Accurate page selection**: Users can select pages 10-15 and get exactly those pages
- **Smart topic detection**: AI can assign accurate page ranges to topics
- **Better flashcards**: Generate from specific chapters/sections
- **Backward compatible**: Old documents fall back to heuristic method

### Verification

Check if a document has per-page data:

```bash
# Via API
curl http://localhost:3000/api/documents/{id} | jq '.metadata.pages'

# Should return array of page objects or null (if missing)
```

---

## Processing Status Lifecycle

Location: Database `documents.processing_status` column

### Status Values

```typescript
type ProcessingStatus =
  | 'pending'      // Initial state after document creation
  | 'processing'   // Async extraction in progress (large files only)
  | 'completed'    // Successfully processed and ready
  | 'failed'       // Processing failed (see error_message)
  | 'needs_ocr'    // Scanned PDF detected, requires OCR
```

### State Transitions

```
CREATE DOCUMENT
      ↓
   pending  ← Document record created, awaiting upload
      ↓
   [UPLOAD]
      ↓
   ┌─────────────┐
   │ File size?  │
   └─────────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
 < 10MB    ≥ 10MB
    ↓         ↓
    │    processing  ← Inngest job started
    │         ↓
    │    [EXTRACT]
    │         ↓
    └─────┬───┘
          ↓
     ┌─────────────┐
     │ Success?    │
     └─────────────┘
          ↓
     ┌────┴────┐
     ↓         ↓
   YES        NO
     ↓         ↓
completed   ┌─────────────┐
            │ Scanned?    │
            └─────────────┘
                  ↓
             ┌────┴────┐
             ↓         ↓
           YES        NO
             ↓         ↓
        needs_ocr   failed
```

### Status Meanings

#### `pending`
- **When**: Document record created via `/api/documents/upload`
- **Duration**: Milliseconds (until upload completes)
- **User Action**: Browser uploading file to Supabase Storage
- **Next State**: → `completed` (small) or `processing` (large)

#### `processing`
- **When**: Large PDF (≥10MB) queued to Inngest
- **Duration**: 1-15 minutes
- **User Action**: UI polls `/api/documents/[id]/status` every 2 seconds
- **UI Shows**: "Processing..." with spinner
- **Next State**: → `completed`, `failed`, or `needs_ocr`

#### `completed`
- **When**: Text successfully extracted and indexed
- **Indicates**:
  - `extracted_text` field populated
  - `metadata.page_count` set
  - `metadata.pages` array available (if PyMuPDF used)
  - RAG indexing attempted (may have succeeded or failed non-fatally)
- **User Action**: Can generate flashcards, chat, podcasts, mind maps

#### `failed`
- **When**: Extraction or processing error occurred
- **Indicates**:
  - `error_message` field contains details
  - `metadata.error_details` may have stack trace
  - Neither pdf-parse nor PyMuPDF succeeded
- **User Action**: Check error message, may need to:
  - Re-upload after fixing PDF
  - Install PyMuPDF if missing
  - Report bug if unexpected

#### `needs_ocr`
- **When**: Scanned PDF detected (no extractable text)
- **Indicates**:
  - PDF contains only images
  - Text layer missing or insufficient
  - Requires OCR to extract text
- **User Action**: Use OCR software to convert PDF, then re-upload

### Polling Mechanism

**Client-side** (`components/SimpleDocumentUploader.tsx`):

```typescript
// Start polling after upload
const checkStatus = async () => {
  const response = await fetch(`/api/documents/${id}/status`)
  const data = await response.json()

  if (data.processing_status === 'processing') {
    // Still processing - poll again in 2 seconds
    setTimeout(checkStatus, 2000)
  } else {
    // Done (completed/failed/needs_ocr)
    handleComplete(data)
  }
}
```

**Server-side** (`app/api/documents/[id]/status/route.ts`):

```typescript
export async function GET(req, { params }) {
  const document = await supabase
    .from('documents')
    .select('id, file_name, processing_status, error_message, metadata')
    .eq('id', params.id)
    .single()

  return NextResponse.json(document)
}
```

---

## Common Failure Scenarios

### 1. Document Stuck in "Processing" Status

#### Symptoms
- Document shows "Processing..." for >15 minutes
- UI keeps auto-refreshing
- No error message displayed
- Inngest dashboard shows failed job or no job

#### Root Causes

**A. Inngest Job Timeout (>15 minutes)**
- PDF is extremely large or complex
- Extraction takes longer than 15-minute limit
- Inngest kills job, `onFailure` hook should update status but may fail

**B. ChromaDB Connection Failure**
- ChromaDB service not running
- Wrong `CHROMA_URL` environment variable
- Network/firewall blocking localhost:8000
- Job fails during RAG indexing step

**C. PyMuPDF Not Installed**
- pdf-parse fails on complex PDF
- Falls back to PyMuPDF but Python/PyMuPDF missing
- Job fails with module import error

**D. Inngest Service Not Running (Dev)**
- Forgot to start `npx inngest-cli@latest dev`
- Job never executes
- Document stuck in `processing` forever

**E. onFailure Hook Fails**
- Database connection lost during hook execution
- RLS policy prevents service role update
- Inngest can't update document status

#### Diagnosis

```bash
# 1. Check Inngest dashboard
open http://localhost:8288
# Look for:
# - Failed jobs (red status)
# - Job not found (never queued)
# - Timeout errors in step execution

# 2. Check server logs
tail -f .next/server.log | grep -i "inngest\|pdf\|9cd41234"
# Look for:
# - [Inngest] Starting PDF processing
# - [Inngest] PDF extraction successful
# - [Inngest] Processing failed

# 3. Check document in database
curl http://localhost:3000/api/documents/{id}/status | jq
# Check:
# - processing_status (should be 'processing')
# - updated_at (how long stuck?)
# - error_message (any errors?)

# 4. Check how long document has been stuck
npm run db:query "
  SELECT id, file_name, processing_status,
         EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS minutes_stuck
  FROM documents
  WHERE processing_status = 'processing'
  ORDER BY updated_at DESC;
"

# 5. Verify PyMuPDF installation
python3 -c "import fitz; print('PyMuPDF version:', fitz.__version__)"
# Should print version number, not import error

# 6. Test ChromaDB connection
curl http://localhost:8000/api/v1/heartbeat
# Should return: {"nanosecond heartbeat": ...}
```

#### Solutions

**Solution 1: Run Fix Script**
```bash
# Marks all stuck documents as failed
npx tsx scripts/fix-stuck-documents.ts

# Then re-upload the document
```

**Solution 2: Manual Database Update**
```sql
-- Via Supabase Studio or psql
UPDATE documents
SET processing_status = 'failed',
    error_message = 'Processing timed out. Please re-upload.'
WHERE id = '9cd41234-116c-4f5f-af07-c4fb7da139f1';
```

**Solution 3: Restart Inngest and Retry**
```bash
# Kill existing Inngest process
pkill -f inngest-cli

# Restart Inngest dev server
npx inngest-cli@latest dev

# Re-upload document to trigger new job
```

**Solution 4: Fix PyMuPDF Installation**
```bash
cd /path/to/flashcard-generator
python3 -m venv venv
source venv/bin/activate
pip install PyMuPDF

# Test it works
python3 scripts/extract-pdf-pymupdf.py /path/to/test.pdf
```

**Solution 5: Start ChromaDB**
```bash
# Start ChromaDB if not running
docker run -d -p 8000:8000 chromadb/chroma

# Or with persistent storage
docker run -d -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  chromadb/chroma
```

#### Prevention

```bash
# Monitoring script (run daily)
#!/bin/bash
# check-stuck-documents.sh

STUCK=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*)
  FROM documents
  WHERE processing_status = 'processing'
  AND updated_at < NOW() - INTERVAL '20 minutes';
")

if [ "$STUCK" -gt 0 ]; then
  echo "⚠️  Found $STUCK stuck documents!"
  # Send alert (email, Slack, etc.)
  npx tsx scripts/fix-stuck-documents.ts
fi
```

---

### 2. PyMuPDF Fallback Not Working

#### Symptoms
- PDF extraction fails even though pdf-parse failed
- No "🐍 Attempting PyMuPDF extraction" log message
- Error: "Unable to parse PDF" without PyMuPDF attempt
- Complex PDFs consistently fail

#### Root Causes

**A. Virtual Environment Not Activated**
- Node.js looks for `venv/bin/python3`
- venv doesn't exist or is misconfigured
- Falls back to system Python which may not have PyMuPDF

**B. PyMuPDF Not Installed**
- venv exists but PyMuPDF package not installed
- Import fails in Python script
- Error returned to Node.js

**C. Python Path Misconfigured**
- `venv/bin/python3` doesn't exist
- Permissions issue (script not executable)
- Wrong Python version (<3.7)

**D. Temp File Permissions**
- Can't write to `/tmp` directory
- Permission denied when creating temp PDF file
- Disk full

#### Diagnosis

```bash
# 1. Test PyMuPDF directly
python3 scripts/extract-pdf-pymupdf.py /path/to/test.pdf
# Should print JSON with success: true

# 2. Check venv Python
which python3
# Should show: /path/to/flashcard-generator/venv/bin/python3

# If not, activate venv:
source venv/bin/activate
which python3

# 3. Verify PyMuPDF installed
pip list | grep PyMuPDF
# Should show: PyMuPDF        1.23.x

# 4. Test import directly
python3 -c "import fitz; print(fitz.__version__)"
# Should print version number

# 5. Check Python version
python3 --version
# Should be Python 3.7 or higher

# 6. Check temp directory
ls -la /tmp | head -20
# Should be writable

# Try creating temp file
echo "test" > /tmp/test-$(date +%s).txt
# Should succeed without error

# 7. Check script permissions
ls -la scripts/extract-pdf-pymupdf.py
# Should be: -rwxr-xr-x (executable)

# If not:
chmod +x scripts/extract-pdf-pymupdf.py
```

#### Solutions

**Solution 1: Install PyMuPDF in venv**
```bash
cd /path/to/flashcard-generator

# Create venv if doesn't exist
python3 -m venv venv

# Activate venv
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install PyMuPDF
pip install PyMuPDF

# Verify
python3 -c "import fitz; print('Success! Version:', fitz.__version__)"

# Test with actual PDF
python3 scripts/extract-pdf-pymupdf.py /path/to/test.pdf
```

**Solution 2: Fix Python Path**
```bash
# Check if venv Python exists
ls -la venv/bin/python3

# If not, recreate venv
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install PyMuPDF
```

**Solution 3: Fix Temp Directory Permissions**
```bash
# Check disk space
df -h /tmp

# Check permissions
ls -lad /tmp
# Should be: drwxrwxrwt (1777)

# If wrong:
sudo chmod 1777 /tmp
```

**Solution 4: Update .env.local Path (if needed)**
```bash
# If using custom Python location
echo 'PYTHON_PATH=/custom/path/to/python3' >> .env.local

# Update lib/server-pdf-parser.ts to use $PYTHON_PATH
```

---

### 3. ChromaDB Indexing Failures

#### Symptoms
- Document marked `completed` but `rag_indexed_at` is null
- `metadata.rag_indexed` is false
- RAG-based chat/flashcards don't work ("No content found")
- Server logs show "Cannot connect to ChromaDB"

#### Root Causes

**A. ChromaDB Service Not Running**
- Docker container stopped or never started
- Port 8000 not accessible
- Container crashed

**B. Wrong CHROMA_URL**
- Environment variable pointing to wrong host/port
- Localhost vs 127.0.0.1 difference
- Production URL in development

**C. Port Conflict**
- Another service using port 8000
- ChromaDB can't bind to port
- Connection refused

**D. Network/Firewall Blocking**
- Docker networking issue
- Firewall blocking localhost:8000
- Container in different network

#### Diagnosis

```bash
# 1. Check if ChromaDB is running
docker ps | grep chroma
# Should show: chromadb/chroma container with status "Up"

# If not running:
docker ps -a | grep chroma
# Check exit code and status

# 2. Test ChromaDB endpoint
curl http://localhost:8000/api/v1/heartbeat
# Should return: {"nanosecond heartbeat": ...}

# If connection refused:
# - ChromaDB not running
# - Wrong port
# - Firewall blocking

# 3. Check environment variable
echo $CHROMA_URL
# Should be: http://localhost:8000

# In Node.js:
node -e "console.log(process.env.CHROMA_URL)"

# 4. Check port availability
lsof -i :8000
# Should show either ChromaDB or nothing (if not running)

# If another service:
# Kill it or use different port

# 5. Test connection from Node.js
node -e "
  fetch(process.env.CHROMA_URL + '/api/v1/heartbeat')
    .then(r => r.json())
    .then(console.log)
    .catch(console.error)
"

# 6. Check ChromaDB logs
docker logs $(docker ps -q -f name=chroma)
# Look for errors or startup issues
```

#### Solutions

**Solution 1: Start ChromaDB**
```bash
# Basic (no persistence)
docker run -d -p 8000:8000 chromadb/chroma

# With persistence (recommended)
docker run -d \
  -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  --name chromadb \
  chromadb/chroma

# Verify it started
docker ps | grep chroma
curl http://localhost:8000/api/v1/heartbeat
```

**Solution 2: Fix Port Conflict**
```bash
# Find what's using port 8000
lsof -i :8000
# Kill it or use different port for ChromaDB

# Run ChromaDB on different port
docker run -d -p 8001:8000 chromadb/chroma

# Update .env.local
echo 'CHROMA_URL=http://localhost:8001' >> .env.local

# Restart dev server
npm run dev
```

**Solution 3: Fix Environment Variable**
```bash
# Check .env.local exists
cat .env.local | grep CHROMA_URL

# If missing, add it
echo 'CHROMA_URL=http://localhost:8000' >> .env.local

# Restart dev server (to pick up new env var)
npm run dev
```

**Solution 4: Production Hosted ChromaDB**
```bash
# For production, use hosted ChromaDB
# Update .env.production or Vercel env vars:
CHROMA_URL=https://your-chroma-instance.com
CHROMA_API_KEY=your-api-key  # If required

# Test connection
curl $CHROMA_URL/api/v1/heartbeat \
  -H "Authorization: Bearer $CHROMA_API_KEY"
```

**Solution 5: Restart ChromaDB Container**
```bash
# Stop and remove
docker stop chromadb
docker rm chromadb

# Start fresh with persistence
docker run -d \
  -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  --name chromadb \
  --restart unless-stopped \
  chromadb/chroma

# Verify
docker logs -f chromadb
# Should see: "Application startup complete"
```

---

### 4. Per-Page Extraction Not Working

#### Symptoms
- `metadata.pages` is undefined or null
- Page-based content selection shows "page information not available"
- Flashcards/podcasts include entire document instead of selected pages
- `extractTextFromPages()` falls back to heuristic estimation

#### Root Causes

**A. Old Document (Before Feature)**
- Document uploaded before per-page feature was added (before 2025-11-11)
- Metadata doesn't include `pages` array
- Only `page_count` available

**B. pdf-parse Used (No Per-Page)**
- pdf-parse succeeded, so PyMuPDF never ran
- pdf-parse doesn't extract per-page data
- Only PyMuPDF provides per-page data

**C. Extraction Failed**
- Both pdf-parse and PyMuPDF failed
- No text extracted at all
- Document in `failed` or `needs_ocr` status

#### Diagnosis

```bash
# 1. Check if pages array exists
curl http://localhost:3000/api/documents/{id} | jq '.metadata.pages'
# Should return: array of page objects or null

# 2. Check extraction method
curl http://localhost:3000/api/documents/{id} | jq '.metadata.processing_method'
# Should see: "sync_pymupdf" or "async_inngest"

# 3. Check document date
curl http://localhost:3000/api/documents/{id} | jq '.created_at'
# If before 2025-11-11, won't have per-page data

# 4. Check server logs for this document
tail -f .next/server.log | grep -i "9cd41234\|stored per-page"
# Should see: "✅ Stored per-page data for X pages"

# 5. Check PyMuPDF script output directly
python3 scripts/extract-pdf-pymupdf.py /path/to/test.pdf | jq '.pages'
# Should return pages array with pageNumber, text, offsets
```

#### Solutions

**Solution 1: Re-Upload Document (Recommended)**
```bash
# Simply re-upload the document
# New upload will use latest extraction logic
# Per-page data will be captured
```

**Solution 2: Use Full Document Mode**
```typescript
// In content selection modal, if no pages:
if (!document.metadata?.pages) {
  // Show "Full Document" option only
  // Don't show page range selector
}
```

**Solution 3: Trigger Re-Processing (Manual)**
```bash
# Not implemented yet, but could be done:

# 1. Download file from Supabase Storage
# 2. Re-run extraction with current code
# 3. Update metadata.pages
# 4. Save to database

# Example script (scripts/reprocess-document.ts):
const { parseServerPDF } = await import('@/lib/server-pdf-parser')
const result = await parseServerPDF(file)

await supabase
  .from('documents')
  .update({
    metadata: {
      ...document.metadata,
      pages: result.pages
    }
  })
  .eq('id', documentId)
```

**Solution 4: Verify PyMuPDF Fallback Works**
```bash
# Ensure PyMuPDF is working
python3 scripts/extract-pdf-pymupdf.py /path/to/test.pdf

# Check output includes pages array
python3 scripts/extract-pdf-pymupdf.py /path/to/test.pdf | jq '.pages | length'
# Should print number of pages

# If not working, reinstall PyMuPDF
pip install --force-reinstall PyMuPDF
```

---

## Monitoring & Debugging Tools

### 1. Inngest Dashboard (Development)

**Location**: http://localhost:8288 (when dev server running)

**How to Start**:
```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Inngest CLI dev server
npx inngest-cli@latest dev
```

**Features**:
- **Runs Tab**: View all job executions (completed/failed/running)
- **Step-by-Step View**: See each step's input, output, duration
- **Event Payloads**: Inspect `document/process` event data
- **Retry Jobs**: Manually retry failed jobs
- **Logs**: View console logs from each step
- **Error Stack Traces**: Full error details with line numbers

**Common Checks**:
```bash
# 1. Find recent PDF processing jobs
# Navigate to: Runs → Filter by "document/process"

# 2. Check failed jobs
# Look for red status indicators
# Click job → View error in onFailure hook

# 3. Check job duration
# Should complete in 1-15 minutes
# If timeout (15min), investigate which step timed out

# 4. Verify event was received
# Events tab → Search for document/process
# If missing, check Inngest client configuration
```

### 2. Server Logs

**Key Log Messages to Monitor**:

```bash
# Follow logs in real-time
tail -f .next/server.log | grep -i "pdf\|inngest\|pymupdf\|chroma"

# Useful filters:
tail -f .next/server.log | grep "📄\|🐍\|✅\|❌"  # Emoji indicators
tail -f .next/server.log | grep -i "error\|fail"  # Errors only
tail -f .next/server.log | grep "9cd41234"  # Specific document
```

**Processing Start**:
```
📄 Server PDF parsing: Introductory_Statistics_2e_-_WEB.pdf, size: 19.09 MB
⏱️ Starting pdf-parse with 8-minute timeout...
```

**Multi-Tier Extraction**:
```
✅ pdf-parse completed successfully
# OR
❌ pdf-parse error: TypeError: Object.defineProperty...
⚠️ pdf-parse failed or returned no text, trying PyMuPDF fallback...
🐍 Attempting PyMuPDF extraction (fallback)...
🐍 Running PyMuPDF script: /path/to/venv/bin/python3 ...
✅ PyMuPDF extracted 1658115 characters from 849 pages
```

**Per-Page Data**:
```
📄 PDF has 849 pages
✅ Stored per-page data for 849 pages
✅ PyMuPDF extracted 1658115 characters from 849 pages (with per-page data: 849 pages)
```

**RAG Indexing**:
```
[Vector Store] Starting indexing for document 9cd41234...
[Vector Store] Created collection: doc_9cd41234_116c_4f5f_af07_c4fb7da139f1
[Vector Store] Indexed 65 chunks into ChromaDB
✅ Indexed 65 chunks, avg size: 741 chars
```

**Inngest Processing**:
```
[Inngest] Starting PDF processing {"documentId":"9cd41234..."}
[Inngest] Status updated to processing
[Inngest] File downloaded {"documentId":"9cd41234...","size":20020938}
[Inngest] PDF extraction successful {"method":"pymupdf","hasPageData":true}
[Inngest] RAG indexing completed {"documentId":"9cd41234...","chunks":65}
[Inngest] Processing completed successfully {"method":"pymupdf"}
```

**Errors**:
```
❌ pdf-parse error: TypeError: Object.defineProperty called on non-object
❌ PyMuPDF extraction failed: Unable to parse PDF: ...
[Inngest] PDF processing failed via onFailure hook
Failed to connect to ChromaDB at http://localhost:8000
```

### 3. Database Queries

```sql
-- Find stuck documents (processing for >20 minutes)
SELECT id, file_name, processing_status,
       created_at, updated_at,
       EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS minutes_stuck,
       error_message
FROM documents
WHERE processing_status = 'processing'
  AND updated_at < NOW() - INTERVAL '20 minutes'
ORDER BY updated_at DESC;

-- Check recent uploads and their status
SELECT id, file_name, file_size,
       processing_status,
       metadata->>'processing_method' AS method,
       metadata->>'page_count' AS pages,
       rag_chunk_count,
       created_at
FROM documents
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 20;

-- Find failed extractions
SELECT id, file_name, processing_status,
       error_message,
       metadata->>'error_details' AS details,
       metadata->>'processing_method' AS method
FROM documents
WHERE processing_status IN ('failed', 'needs_ocr')
ORDER BY updated_at DESC
LIMIT 20;

-- Check RAG indexing success rate
SELECT
  COUNT(*) AS total_large_pdfs,
  COUNT(CASE WHEN rag_chunk_count > 0 THEN 1 END) AS indexed,
  COUNT(CASE WHEN rag_chunk_count IS NULL OR rag_chunk_count = 0 THEN 1 END) AS not_indexed
FROM documents
WHERE file_type = 'application/pdf'
  AND file_size >= 10485760  -- 10MB
  AND created_at > NOW() - INTERVAL '7 days';

-- View processing metadata
SELECT
  id,
  file_name,
  processing_status,
  metadata->>'processing_method' AS method,
  metadata->>'page_count' AS pages,
  (metadata->'pages') IS NOT NULL AS has_page_data,
  metadata->>'rag_indexed' AS rag_indexed,
  metadata->>'text_length' AS text_length
FROM documents
WHERE file_type = 'application/pdf'
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Manual Testing Commands

```bash
# Test PyMuPDF directly
python3 scripts/extract-pdf-pymupdf.py /path/to/test.pdf | jq

# Test ChromaDB connection
curl http://localhost:8000/api/v1/heartbeat | jq

# Test document status endpoint
curl http://localhost:3000/api/documents/{id}/status | jq

# Test file download from Supabase
curl "$(curl http://localhost:3000/api/documents/{id}/download)" -o test.pdf

# Check Inngest event delivery
curl http://localhost:8288/events | jq

# Verify environment variables
node -e "console.log({
  CHROMA_URL: process.env.CHROMA_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Missing'
})"
```

---

## Database Schema Reference

### documents Table (Relevant Fields)

```sql
CREATE TABLE documents (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES user_profiles(id),
  clerk_user_id TEXT,

  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT NOT NULL,

  -- Processing status
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN (
      'pending',
      'processing',
      'completed',
      'failed',
      'needs_ocr'
    )),
  error_message TEXT,

  -- Extracted content
  extracted_text TEXT,

  -- RAG indexing
  rag_indexed_at TIMESTAMP WITH TIME ZONE,
  rag_chunk_count INTEGER,
  rag_collection_name TEXT,

  -- Metadata (JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Important indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
```

### Metadata JSONB Structure

```typescript
interface DocumentMetadata {
  // Upload metadata
  upload_completed_at: string  // ISO timestamp
  actual_file_size: number
  is_large_file: boolean

  // Processing metadata
  processing_started_at?: string
  processing_completed_at?: string
  processing_method?: 'sync_pdf-parse' | 'sync_pymupdf' | 'async_inngest'
  processing_duration?: number  // milliseconds

  // PDF metadata
  page_count?: number
  pages?: Array<{
    pageNumber: number
    text: string
    startOffset: number
    endOffset: number
  }>

  // Extraction results
  has_extracted_text: boolean
  text_length?: number
  extraction_method?: 'pdf-parse' | 'pymupdf'

  // RAG metadata
  rag_indexed: boolean
  rag_chunk_count?: number

  // Error details
  error_details?: string
  failed_via?: 'onFailure_hook' | 'main_catch'
  failure_reason?: 'timeout' | 'error'

  // Topics (AI-detected)
  topics?: Array<{
    title: string
    description: string
    pageRange: { start: number; end: number }
  }>
}
```

### Example Document Record

```json
{
  "id": "9cd41234-116c-4f5f-af07-c4fb7da139f1",
  "user_id": 3,
  "file_name": "Introductory_Statistics_2e_-_WEB.pdf",
  "file_type": "application/pdf",
  "file_size": 20020938,
  "storage_path": "3/1762882177770-Introductory_Statistics_2e_-_WEB.pdf",
  "processing_status": "completed",
  "extracted_text": "Introduction to Statistics...",
  "rag_indexed_at": "2025-11-11T17:29:37.754Z",
  "rag_chunk_count": 65,
  "rag_collection_name": "doc_9cd41234_116c_4f5f_af07_c4fb7da139f1",
  "metadata": {
    "upload_completed_at": "2025-11-11T17:29:25.000Z",
    "actual_file_size": 20020938,
    "is_large_file": true,
    "processing_started_at": "2025-11-11T17:29:26.000Z",
    "processing_completed_at": "2025-11-11T17:29:37.000Z",
    "processing_method": "async_inngest",
    "page_count": 849,
    "pages": [
      {
        "pageNumber": 1,
        "text": "Introductory Statistics 2e...",
        "startOffset": 0,
        "endOffset": 1543
      }
      // ... 848 more pages
    ],
    "has_extracted_text": true,
    "text_length": 48105,
    "extraction_method": "pymupdf",
    "rag_indexed": true,
    "rag_chunk_count": 65
  },
  "created_at": "2025-11-11T17:29:24.000Z",
  "updated_at": "2025-11-11T17:29:37.754Z"
}
```

---

## Production Deployment

### Environment Variables Checklist

```bash
# Required for PDF processing
OPENAI_API_KEY=sk-...           # For embeddings (RAG indexing)
SUPABASE_SERVICE_ROLE_KEY=...   # Server-side Supabase access

# Required for async processing
INNGEST_EVENT_KEY=...           # Inngest Cloud event key
INNGEST_SIGNING_KEY=...         # Inngest Cloud signing key
INNGEST_APP_ID=...              # Your app ID

# Required for RAG
CHROMA_URL=https://your-chroma-instance.com
CHROMA_API_KEY=...              # If using hosted ChromaDB

# Optional (enhances processing)
ANTHROPIC_API_KEY=...           # For complex document analysis
DEEPSEEK_API_KEY=...            # Cost-effective alternative

# Python/PyMuPDF (ensure available in runtime)
# For Vercel: Not supported (Edge runtime)
# For dedicated server: Install Python 3 + PyMuPDF
```

### Infrastructure Requirements

**1. ChromaDB Instance**
```bash
# Development
docker run -d -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  chromadb/chroma

# Production options:
# - Hosted ChromaDB (https://trychroma.com)
# - Self-hosted on dedicated server
# - Cloud provider (AWS/GCP/Azure) with persistent storage
```

**2. Python Runtime (for PyMuPDF)**
```bash
# Dedicated Server
python3 -m venv /opt/synaptic/venv
source /opt/synaptic/venv/bin/activate
pip install PyMuPDF

# Vercel (Edge Runtime)
# ⚠️ PyMuPDF NOT supported in Edge runtime
# Fallback: Use only pdf-parse (less robust)

# Alternative: PyMuPDF as microservice
# Deploy Python service separately, call via HTTP
```

**3. Inngest Cloud**
```bash
# Sign up: https://inngest.com
# Create app and get credentials
# Set environment variables in Vercel
```

**4. Monitoring**
```bash
# Sentry (error tracking)
SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Uptime monitoring
# - ChromaDB: Health check endpoint
# - Inngest: Dashboard alerts
# - Database: Query for stuck documents (cron)
```

### Performance Tuning

**1. Timeout Configuration**

```typescript
// app/api/documents/[id]/complete/route.ts
export const maxDuration = 120  // Small PDFs: 2 minutes

// lib/inngest/functions/process-pdf.ts
export const maxDuration = 900  // Large PDFs: 15 minutes

// Individual step timeouts
{ timeout: '10m' }  // PDF extraction
{ timeout: '10m' }  // RAG indexing
```

**2. Chunk Size (RAG)**

```typescript
// lib/vector-store.ts
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // Increase for less chunks (faster indexing)
  chunkOverlap: 200,    // Increase for better context preservation
  separators: ["\n\n", "\n", ". ", " ", ""]
})

// Tradeoff:
// - Larger chunks: Faster indexing, less precise retrieval
// - Smaller chunks: Slower indexing, more precise retrieval
```

**3. Polling Interval**

```typescript
// components/SimpleDocumentUploader.tsx
const POLL_INTERVAL = 2000  // 2 seconds (aggressive)

// Production recommendation:
// - Start: 2s (responsive for small files)
// - After 1 min: 5s (reduce load)
// - After 5 min: 10s (background polling)

// Exponential backoff:
const interval = Math.min(2000 * Math.pow(1.5, attempts), 10000)
```

**4. Concurrent Processing**

```typescript
// lib/inngest/client.ts
// Inngest handles concurrency automatically

// To limit concurrent jobs (if needed):
export const processPDFFunction = inngest.createFunction({
  id: 'process-pdf-document',
  concurrency: {
    limit: 5,  // Max 5 PDFs processing simultaneously
    key: 'event.data.userId'  // Per-user limit
  },
  // ...
})
```

### Monitoring Setup

**1. Daily Stuck Document Check**

```bash
# scripts/check-stuck-documents.sh
#!/bin/bash

STUCK=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*)
  FROM documents
  WHERE processing_status = 'processing'
  AND updated_at < NOW() - INTERVAL '20 minutes';
")

if [ "$STUCK" -gt 0 ]; then
  echo "⚠️  Found $STUCK stuck documents"

  # Send alert
  curl -X POST https://hooks.slack.com/... \
    -d "{\"text\": \"Found $STUCK stuck documents!\"}"

  # Auto-fix (optional)
  npx tsx scripts/fix-stuck-documents.ts
fi

# Run daily via cron
# 0 2 * * * /path/to/check-stuck-documents.sh
```

**2. ChromaDB Health Check**

```bash
# scripts/check-chromadb.sh
#!/bin/bash

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $CHROMA_URL/api/v1/heartbeat)

if [ "$STATUS" != "200" ]; then
  echo "❌ ChromaDB is down (HTTP $STATUS)"
  # Send alert
  curl -X POST https://hooks.slack.com/... \
    -d "{\"text\": \"ChromaDB is down!\"}"
fi

# Run every 5 minutes via cron
# */5 * * * * /path/to/check-chromadb.sh
```

**3. Inngest Failure Alerts**

```typescript
// lib/inngest/functions/process-pdf.ts
onFailure: async ({ event, error }) => {
  // Log to Sentry
  Sentry.captureException(error, {
    tags: {
      documentId: event.data.documentId,
      fileName: event.data.fileName
    }
  })

  // Send webhook alert
  await fetch(process.env.ALERT_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      type: 'pdf_processing_failed',
      documentId: event.data.documentId,
      error: error.message
    })
  })

  // Update document status
  await updateDocumentStatus('failed')
}
```

**4. Storage Usage Monitoring**

```sql
-- Check total storage used
SELECT
  COUNT(*) AS total_documents,
  SUM(file_size) / (1024*1024*1024) AS total_gb,
  AVG(file_size) / (1024*1024) AS avg_mb
FROM documents;

-- Check storage by user
SELECT
  user_id,
  COUNT(*) AS doc_count,
  SUM(file_size) / (1024*1024) AS total_mb
FROM documents
GROUP BY user_id
ORDER BY total_mb DESC
LIMIT 20;
```

---

## Quick Reference

### Common Commands

```bash
# Start development servers
npm run dev                        # Next.js
npx inngest-cli@latest dev         # Inngest
docker run -d -p 8000:8000 chromadb/chroma  # ChromaDB

# Test PyMuPDF
python3 scripts/extract-pdf-pymupdf.py test.pdf

# Check stuck documents
npx tsx scripts/fix-stuck-documents.ts

# View Inngest dashboard
open http://localhost:8288

# Test ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Follow logs
tail -f .next/server.log | grep -i "pdf\|inngest"

# Check document status
curl http://localhost:3000/api/documents/{id}/status | jq
```

### File Locations

```
lib/
  server-pdf-parser.ts          # Multi-tier PDF extraction
  vector-store.ts               # ChromaDB RAG indexing
  text-extraction.ts            # Per-page text extraction
  inngest/
    client.ts                   # Inngest configuration
    functions/
      process-pdf.ts            # Async PDF processing job

scripts/
  extract-pdf-pymupdf.py        # PyMuPDF Python script
  fix-stuck-documents.ts        # Recovery script

app/api/
  documents/
    upload/route.ts             # Signed URL generation
    [id]/complete/route.ts      # Upload completion + sync processing
    [id]/status/route.ts        # Status polling endpoint
```

### Status Flow Reference

```
pending → (upload) → completed          # Small PDF (sync)
pending → (upload) → processing → completed   # Large PDF (async)
pending → (upload) → processing → failed      # Extraction error
pending → (upload) → processing → needs_ocr   # Scanned PDF
```

---

## Support & Contribution

For issues, questions, or contributions related to PDF processing:

1. **Check this guide** for troubleshooting steps
2. **Search server logs** for error messages
3. **Check Inngest dashboard** for job failures
4. **Review database** for document status
5. **Test PyMuPDF** directly if extraction fails
6. **File bug report** with logs and document details

---

**Document Version**: 1.0
**Last Updated**: 2025-11-11
**Maintained by**: Claude Code
**Repository**: flashcard-generator
