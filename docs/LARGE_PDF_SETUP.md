# Large PDF Processing Setup Guide

Complete implementation for handling 500MB+ textbooks using RAG (Retrieval-Augmented Generation)

## Overview

This system enables memory-efficient processing of massive textbooks and documents through:
1. **Cloudflare R2 Storage**: Zero egress fees, unlimited file sizes
2. **ChromaDB Vector Database**: Semantic search and retrieval
3. **RAG Architecture**: Only process relevant chunks, not entire documents
4. **Chunked Uploads**: Stream large files without memory overflow

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client (Browser)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LargeFileUploader Component                             │  │
│  │  - Splits file into 10MB chunks                          │  │
│  │  - Shows progress bar                                    │  │
│  │  - Handles upload retries                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (10MB chunks)
┌─────────────────────────────────────────────────────────────────┐
│                      Server (Next.js API)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  POST /api/upload-large-document                         │  │
│  │  1. Accept chunks                                        │  │
│  │  2. Upload to R2 (streaming)                             │  │
│  │  3. Extract text from PDF (streaming)                    │  │
│  │  4. Chunk text (1000 chars, 200 overlap)                 │  │
│  │  5. Generate embeddings (OpenAI)                         │  │
│  │  6. Store in ChromaDB                                    │  │
│  │  7. Save metadata to Supabase                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  R2 Storage     │  │  ChromaDB       │  │  Supabase      │  │
│  │  - Files        │  │  - Vectors      │  │  - Metadata    │  │
│  │  - 500GB limit  │  │  - Embeddings   │  │  - User data   │  │
│  │  - $0 egress    │  │  - Semantic     │  │  - RLS         │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Feature APIs (RAG)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐│
│  │ Flashcards     │  │ Chat           │  │ Mind Maps          ││
│  │ /api/generate- │  │ /api/chat-rag  │  │ (Future)           ││
│  │ flashcards-rag │  │                │  │                    ││
│  │                │  │                │  │                    ││
│  │ - Query: top 5 │  │ - Query: top 5 │  │ - Query: all       ││
│  │   concepts     │  │   relevant     │  │   hierarchy        ││
│  │ - Generate     │  │ - Answer       │  │ - Extract          ││
│  │   cards        │  │   question     │  │   structure        ││
│  └────────────────┘  └────────────────┘  └────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Install ChromaDB (Local Development)

**Option A: Docker (Recommended)**
```bash
# Run ChromaDB in Docker
docker run -d -p 8000:8000 chromadb/chroma

# Verify it's running
curl http://localhost:8000/api/v1/heartbeat
```

**Option B: Python Installation**
```bash
# Create a virtual environment
python3 -m venv chromadb-env
source chromadb-env/bin/activate

# Install ChromaDB
pip install chromadb

# Run ChromaDB server
chroma run --path ./chromadb_data --port 8000
```

### 2. Configure Cloudflare R2

1. **Create Cloudflare Account**
   - Go to https://dash.cloudflare.com/sign-up
   - Complete registration

2. **Enable R2**
   - Navigate to R2 in the Cloudflare dashboard
   - Click "Create Bucket"
   - Name it `synaptic-documents` (or your preferred name)

3. **Generate API Token**
   - Go to "Manage R2 API Tokens"
   - Click "Create API Token"
   - Permissions: Read & Write
   - Copy the following:
     - Access Key ID
     - Secret Access Key
     - Endpoint URL (format: `https://<account-id>.r2.cloudflarestorage.com`)

4. **Add to .env.local**
```bash
# Cloudflare R2 Configuration
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=synaptic-documents
R2_PUBLIC_URL=https://pub-xyz.r2.dev  # Optional - if public access needed

# ChromaDB Configuration
CHROMA_URL=http://localhost:8000

# OpenAI (for embeddings - text-embedding-3-small)
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Update Supabase Schema

The `documents` table needs additional columns for large file handling:

```sql
-- Add columns for R2 storage and vector indexing
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS r2_file_key TEXT,
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_r2_key ON documents(r2_file_key);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
```

### 4. Test the Setup

**Start ChromaDB**
```bash
docker run -d -p 8000:8000 chromadb/chroma
```

**Verify ChromaDB is running**
```bash
curl http://localhost:8000/api/v1/heartbeat
# Should return: {"nanosecond heartbeat": <timestamp>}
```

**Start the dev server**
```bash
npm run dev
```

**Test upload (optional)**
```bash
# Create a test PDF
echo "Test content" > test.txt

# Upload via API
curl -X POST http://localhost:3000/api/upload-large-document \
  -F "file=@test.txt" \
  -F "chunkIndex=0" \
  -F "totalChunks=1" \
  -F "fileName=test.txt" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

## Usage

### Upload Large Document

```tsx
import LargeFileUploader from '@/components/LargeFileUploader'

function MyPage() {
  const handleUploadComplete = (documentId: string, fileName: string) => {
    console.log(`✅ Uploaded: ${fileName} (ID: ${documentId})`)
    // Use documentId for flashcards, chat, etc.
  }

  return (
    <LargeFileUploader
      onUploadComplete={handleUploadComplete}
      maxFileSizeMB={500}  // Max file size
      acceptedTypes={['.pdf', '.docx', '.txt']}
    />
  )
}
```

### Generate Flashcards (RAG)

```typescript
// POST /api/generate-flashcards-rag
const response = await fetch('/api/generate-flashcards-rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 'doc_123',
    topic: 'Chapter 5: Thermodynamics',  // Optional - focus on specific topic
    count: 15  // Number of flashcards to generate
  })
})

const data = await response.json()
console.log(`Generated ${data.flashcards.length} flashcards`)
console.log(`Used ${data.chunksUsed} of ${data.totalChunks} chunks`)
```

### Chat with Document (RAG)

```typescript
// POST /api/chat-rag
const response = await fetch('/api/chat-rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 'doc_123',
    message: 'Explain the second law of thermodynamics',
    teachingMode: 'socratic'  // Optional: 'socratic' | 'direct' | 'mixed'
  })
})

const data = await response.json()
console.log(data.response)  // AI response based on relevant chunks
console.log(`Retrieved ${data.chunksUsed} relevant chunks`)
```

## Cost Analysis

### Storage Costs (500MB textbook)

**Cloudflare R2:**
- Storage: 500MB × $0.015/GB = **$0.0075/month**
- Egress: **$0** (zero egress fees!)
- Total: **$0.0075/month**

**AWS S3 (for comparison):**
- Storage: 500MB × $0.023/GB = $0.0115/month
- Egress: 500MB × $0.09/GB × 10 downloads = **$0.45/month**
- Total: **$0.4615/month**

**Savings: 98% cheaper with R2**

### Vector Database Costs

**ChromaDB (Self-hosted):**
- Development: **Free** (Docker container)
- Production: ~$20/month (small VM)

**Pinecone (Managed - Production Alternative):**
- Starter: **$70/month** (100K vectors, 1GB storage)
- Standard: **$165/month** (500K vectors, 5GB storage)

### Embedding Costs (OpenAI)

**text-embedding-3-small:**
- Cost: $0.02 per 1M tokens
- 500MB textbook: ~125M characters = ~31M tokens
- One-time indexing: **$0.62**
- Query (per chat/flashcard): 5 chunks × 250 tokens = 1,250 tokens = **$0.000025**

### Total Monthly Cost (500MB textbook)

**Development:**
- R2 Storage: $0.0075
- ChromaDB: Free (Docker)
- Embeddings: $0.62 (one-time)
- **Total: ~$1/month**

**Production (ChromaDB self-hosted):**
- R2 Storage: $0.0075
- ChromaDB VM: $20
- Embeddings: $0.62 (one-time)
- **Total: ~$20/month**

**Production (Pinecone):**
- R2 Storage: $0.0075
- Pinecone Starter: $70
- Embeddings: $0.62 (one-time)
- **Total: ~$70/month**

## Subscription Requirements

### Supabase
- **Free Tier**: 500MB database + 1GB storage
  - Sufficient for metadata only (R2 stores actual files)
  - **No subscription needed**
- **Pro Tier ($25/month)**: Required if storing files directly in Supabase
  - Supports up to 500GB file uploads
  - Not recommended - use R2 instead

### Clerk (Authentication)
- **Free Tier**: 10,000 MAUs (Monthly Active Users)
  - **No subscription needed** for production
- **Pro Tier ($25/month)**: Beyond 10,000 MAUs
  - Only needed at scale

### Cloudflare R2
- **Pay-as-you-go**: No subscription, no minimum
- **Costs**:
  - $0.015/GB/month storage
  - $0.36/million Class A operations (writes)
  - $0.00/GB egress (FREE!)

## Troubleshooting

### ChromaDB Connection Error
```
Error: Failed to connect to ChromaDB at http://localhost:8000
```

**Solution:**
```bash
# Verify ChromaDB is running
docker ps | grep chroma

# If not running, start it
docker run -d -p 8000:8000 chromadb/chroma

# Check logs
docker logs <container-id>
```

### R2 Upload Error
```
Error: Failed to upload file to R2 storage
```

**Solution:**
1. Verify R2 credentials in `.env.local`
2. Check bucket name matches
3. Ensure API token has Read & Write permissions
4. Test with curl:
```bash
curl -X PUT https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key> \
  --aws-sigv4 "aws:amz:auto:s3" \
  --user "<access-key>:<secret-key>" \
  --data-binary @test.pdf
```

### Document Not Indexed Error
```
Error: Document not yet indexed. Please wait for processing to complete.
```

**Solution:**
- Document is still being processed
- Check processing status: `GET /api/upload-large-document?documentId=<id>`
- For very large files (500MB+), processing can take 2-5 minutes
- Check server logs for errors during indexing

### Out of Memory Error
```
Error: JavaScript heap out of memory
```

**Solution:**
1. Increase Node.js heap size:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```
2. Verify streaming is working (not loading entire file into memory)
3. Check chunk size in upload (should be 10MB max)

## Performance Optimization

### Chunk Size Tuning
```typescript
// lib/vector-store.ts
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,        // Default: 1000 chars (~250 tokens)
  chunkOverlap: 200,      // Default: 200 chars (20% overlap)
})

// For very technical documents, use smaller chunks:
chunkSize: 500,
chunkOverlap: 100,

// For narrative content, use larger chunks:
chunkSize: 2000,
chunkOverlap: 400,
```

### Embedding Model Selection
```typescript
// lib/vector-store.ts
const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',  // Recommended: fast, cheap
  // modelName: 'text-embedding-3-large',  // Alternative: higher quality, 5x more expensive
})
```

### RAG Retrieval Tuning
```typescript
// Adjust topK (number of chunks retrieved)
const relevantChunks = await searchDocument(documentId, query, 5)  // Default: 5

// For more context, increase topK:
const relevantChunks = await searchDocument(documentId, query, 10)  // More context

// For faster responses, decrease topK:
const relevantChunks = await searchDocument(documentId, query, 3)  // Less context
```

## Migration to Production

### Pinecone (Scalable Vector DB)
```bash
# Install Pinecone SDK
npm install @pinecone-database/pinecone

# Update lib/vector-store.ts
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})

const index = pinecone.index('synaptic-documents')
```

### R2 Custom Domain
1. Go to R2 bucket settings
2. Click "Connect Domain"
3. Add CNAME record in Cloudflare DNS
4. Update `R2_PUBLIC_URL` in `.env.local`

### Scaling Considerations
- **100+ users**: Self-hosted ChromaDB on dedicated VM
- **1,000+ users**: Migrate to Pinecone
- **10,000+ users**: Consider caching layer (Redis) for embeddings
- **100,000+ users**: Implement CDN for R2 files, distributed vector DB sharding

## Next Steps

1. **Podcast Generation (RAG)**: Create `/api/generate-podcast-rag` for large textbooks
2. **Mind Map Generation (RAG)**: Extract hierarchical structure from entire textbook
3. **Progressive Loading**: Show flashcards/chat while document is still indexing
4. **Resume Support**: Allow users to pause/resume large uploads
5. **Batch Processing**: Process multiple documents in parallel

## Support

For issues or questions:
- GitHub Issues: [Report a bug](https://github.com/yourusername/synaptic/issues)
- Documentation: [Full docs](https://docs.synaptic.ai)
- Discord: [Join community](https://discord.gg/synaptic)
