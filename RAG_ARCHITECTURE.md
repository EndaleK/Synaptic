# RAG (Retrieve, Augment, Generate) Architecture

## AI Providers Used for PDF Processing

### Overview
Your RAG system uses a **multi-provider approach** with intelligent routing based on feature and cost considerations.

---

## 🔍 **RETRIEVE** - Embeddings Generation

**Provider**: **OpenAI** (REQUIRED)
- **Model**: `text-embedding-3-small`
- **Location**: [lib/vector-store.ts:24-27](lib/vector-store.ts#L24-L27)
- **Cost**: ~$0.02 per 1M tokens
- **Dimensions**: 1,536 dimensions

```typescript
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',
})
```

**Why OpenAI for embeddings**:
- Industry standard for semantic search
- ChromaDB optimized for OpenAI embeddings
- Cost-effective ($0.02/M tokens)
- No alternative providers currently supported for embeddings

**Usage**:
1. Text chunks → OpenAI embeddings → ChromaDB storage
2. User query → OpenAI embedding → Semantic search in ChromaDB
3. Top-K similar chunks retrieved for context

---

## 🤖 **GENERATE** - Text Completion

**Provider**: **DeepSeek** (Default) or **OpenAI** (Fallback)
- **Location**: [lib/ai/index.ts:100-111](lib/ai/index.ts#L100-L111)
- **Selection**: Automatic via `getProviderForFeature()`

### Default Provider Routing

| Feature | Default Provider | Fallback | Model |
|---------|-----------------|----------|-------|
| **Chat** | DeepSeek | OpenAI | `deepseek-chat` |
| **Flashcards** | DeepSeek | OpenAI | `deepseek-chat` |
| **Podcast Script** | DeepSeek | OpenAI | `deepseek-chat` |
| **Mind Map** | DeepSeek or Anthropic* | OpenAI | `deepseek-chat` or `claude-sonnet-4` |
| **Exam** | DeepSeek | OpenAI | `deepseek-chat` |

\* *Anthropic automatically used for complex mind maps (complexity score ≥ 50)*

### Cost Comparison

| Provider | Input Cost | Output Cost | Best For |
|----------|-----------|-------------|----------|
| **DeepSeek** | $0.27/M | $1.10/M | General purpose, cost-sensitive (60-70% cheaper) |
| **OpenAI** | $0.50/M | $1.50/M | Fallback, embeddings, TTS |
| **Anthropic** | $3.00/M | $15.00/M | Complex documents, large JSON outputs |

---

## 📊 Complete RAG Pipeline

### 1. **Document Upload & Indexing**
```
User uploads PDF
    ↓
PyMuPDF/pdf-parse extracts text (server-side)
    ↓
Text split into 1000-char chunks (200 overlap)
    ↓
OpenAI generates embeddings
    ↓
Stored in ChromaDB vector database
```

**Files**:
- [lib/server-pdf-parser.ts](lib/server-pdf-parser.ts) - PDF text extraction
- [lib/vector-store.ts](lib/vector-store.ts) - Embeddings & ChromaDB
- [lib/document-indexer.ts](lib/document-indexer.ts) - Indexing orchestration

---

### 2. **RAG Chat** ([/api/chat-rag](app/api/chat-rag/route.ts))

```
User asks question
    ↓
Query → OpenAI embedding
    ↓
ChromaDB semantic search → Top 5 relevant chunks
    ↓
Chunks + Question → DeepSeek/OpenAI completion
    ↓
AI response returned to user
```

**Provider Used**: Line 184
```typescript
const provider = getProviderForFeature('chat')  // DeepSeek by default
```

**Key Details**:
- **Max tokens**: 1,000 output tokens
- **Temperature**: 0.1 (focused, deterministic)
- **Context**: Top 5 chunks (~5,000 chars)
- **Modes**: Socratic, Direct, Mixed (personalized)

---

### 3. **RAG Flashcards** ([/api/generate-flashcards-rag](app/api/generate-flashcards-rag/route.ts))

```
User selects content (pages, chapters, topics, or full doc)
    ↓
If topic/full: ChromaDB search → Relevant chunks
If pages: Direct extraction from PDF
    ↓
Content → generateFlashcardsAuto()
    ↓
DeepSeek/OpenAI generates flashcard JSON
    ↓
Saved to database
```

**Provider Used**: Line 377
```typescript
const result = await generateFlashcardsAuto(combinedText, customOptions)
// Uses getProviderForFeature('flashcards') internally → DeepSeek
```

**Key Details**:
- **Max content**: 48,000 chars (~12K tokens)
- **Default count**: 15 flashcards
- **Selection modes**:
  - **Full document**: Vector search with diverse queries
  - **Topic**: Semantic search for specific topic
  - **Pages**: Direct extraction from page range
  - **Chapters**: Extract selected chapter text

**Source Fidelity**:
```typescript
const sourceFidelityInstruction =
  `🚨 CRITICAL - Source Fidelity:
   Use ONLY information from the content below.
   Do NOT add external knowledge...`
```

---

### 4. **Embedding Generation Details**

**Text Splitter Configuration** ([lib/vector-store.ts:35-39](lib/vector-store.ts#L35-L39)):
```typescript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,        // ~250 tokens
  chunkOverlap: 200,      // Preserve context
  separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''],
})
```

**Why these settings**:
- 1,000 chars = ~250 tokens (optimal for semantic search)
- 200 overlap prevents context loss at boundaries
- Sentence-aware splitting (preserves meaning)

---

## 🔄 Provider Override

### Environment Variable Override
You can force specific providers by setting environment variables:

```bash
# In .env.local
CHAT_PROVIDER=anthropic          # Use Anthropic for chat
FLASHCARDS_PROVIDER=openai       # Use OpenAI for flashcards
MINDMAP_PROVIDER=anthropic       # Use Anthropic for mind maps
```

### Automatic Provider Selection
The system automatically selects providers based on:
1. **Feature defaults** (see table above)
2. **Complexity** (Anthropic for complex mind maps)
3. **Availability** (checks if API key configured)
4. **Fallback logic** (OpenAI as last resort)

**Code**: [lib/ai/index.ts:90-95](lib/ai/index.ts#L90-L95)
```typescript
export function getProviderForFeature(feature: string): AIProvider {
  const envVar = `${feature.toUpperCase()}_PROVIDER`
  const providerType = process.env[envVar] || getDefaultProvider(feature)
  return providerFactory.getProviderWithFallback(providerType)
}
```

---

## 📝 Summary: Which API Does What?

| Operation | API Provider | Model | Why |
|-----------|-------------|-------|-----|
| **Text → Embeddings** | **OpenAI** | text-embedding-3-small | Required for ChromaDB |
| **Query → Embedding** | **OpenAI** | text-embedding-3-small | Semantic search |
| **Chat Response** | **DeepSeek** | deepseek-chat | 60% cheaper |
| **Flashcard Gen** | **DeepSeek** | deepseek-chat | Cost-effective |
| **Mind Map (Simple)** | **DeepSeek** | deepseek-chat | Fast & cheap |
| **Mind Map (Complex)** | **Anthropic** | claude-sonnet-4 | Better reasoning |
| **Podcast TTS** | **OpenAI** | tts-1 | Only provider with TTS |

---

## 🚨 Requirements

### Mandatory for RAG to Work:
1. ✅ **OpenAI API Key** - REQUIRED for embeddings (no alternatives)
   ```bash
   OPENAI_API_KEY=sk-...
   ```

2. ✅ **ChromaDB Running** - REQUIRED for vector storage
   ```bash
   docker run -d -p 8000:8000 chromadb/chroma
   CHROMA_URL=http://localhost:8000
   ```

3. ✅ **DeepSeek API Key** - RECOMMENDED for generation (cheaper)
   ```bash
   DEEPSEEK_API_KEY=sk-...
   ```
   - If not set, falls back to OpenAI

### Optional:
- **Anthropic API Key** - For complex documents
  ```bash
  ANTHROPIC_API_KEY=sk-ant-api03-...
  ```

---

## 💡 Key Insights

1. **OpenAI is NOT optional for RAG** - Required for embeddings generation
2. **DeepSeek saves 60-70%** on generation costs compared to OpenAI
3. **Anthropic is automatic** for complex mind maps (no configuration needed)
4. **ChromaDB is free** and runs locally (no API costs)
5. **Embeddings cost ~$0.02/M tokens** (very cheap compared to completions)

---

## 📚 Related Files

**Core RAG Implementation**:
- [lib/vector-store.ts](lib/vector-store.ts) - ChromaDB & embeddings
- [app/api/chat-rag/route.ts](app/api/chat-rag/route.ts) - RAG chat endpoint
- [app/api/generate-flashcards-rag/route.ts](app/api/generate-flashcards-rag/route.ts) - RAG flashcard generation

**Provider Management**:
- [lib/ai/index.ts](lib/ai/index.ts) - Provider factory & routing
- [lib/ai/providers/openai.ts](lib/ai/providers/openai.ts) - OpenAI implementation
- [lib/ai/providers/deepseek.ts](lib/ai/providers/deepseek.ts) - DeepSeek implementation
- [lib/ai/providers/anthropic.ts](lib/ai/providers/anthropic.ts) - Anthropic implementation

**PDF Processing**:
- [lib/server-pdf-parser.ts](lib/server-pdf-parser.ts) - Multi-tier PDF extraction
- [lib/document-indexer.ts](lib/document-indexer.ts) - Document indexing orchestration

---

**Last Updated**: 2025-11-11
