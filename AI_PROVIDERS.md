# AI Provider Usage Guide

Complete breakdown of AI API providers used across all features in Synaptic.

## Provider Usage by Feature

### 1. Mind Maps 🗺️

- **Primary**: OpenAI (GPT-4o or GPT-3.5-turbo)
- **Why**: DeepSeek was producing 0 edges in mind maps, so OpenAI is default
- **Override**: Set `MINDMAP_PROVIDER=anthropic` for complex maps
- **Complex maps** (complexity ≥ 50): Auto-switches to **Anthropic Claude** for superior reasoning
- **Location**: `lib/ai/index.ts` (line 102)

### 2. Flashcards 🃏

**Intelligent routing based on document size:**

- **Small docs** (<100K chars): **DeepSeek** (10x cheaper than OpenAI)
- **Medium docs** (100K-800K chars): **Anthropic Claude 3.5 Sonnet** (best quality/cost)
- **Large docs** (>800K chars): **Google Gemini 1.5 Pro** (massive context)
- **Fallback**: OpenAI GPT-3.5-turbo if DeepSeek not configured
- **Embeddings** (RAG): OpenAI `text-embedding-3-small`
- **Location**: `lib/ai-provider.ts` (selectAIProvider function)

### 3. Chat 💬

- **Primary**: **DeepSeek** (60-70% cheaper than OpenAI)
- **Fallback**: OpenAI GPT-3.5-turbo if DeepSeek not configured
- **Embeddings** (RAG): OpenAI `text-embedding-3-small`
- **Location**: `lib/ai/index.ts` (line 106)

### 4. Podcast 🎙️

**Two-stage process:**

1. **Script generation**: **DeepSeek** (cost-effective)
   - Location: `lib/ai/index.ts` (line 103)

2. **Audio/TTS**: **LemonFox AI** (primary) → **OpenAI** (fallback)
   - LemonFox: $2.50 per 1M chars (83% cheaper)
   - OpenAI: $15 per 1M chars (tts-1 model)
   - Voices: `alloy` (host_a), `nova` (host_b)
   - Location: `lib/tts-generator.ts`

### 5. Quick Summary ⚡

**Same pipeline as Podcast:**

1. **Script generation**: **DeepSeek** (cost-effective, ~5-minute summaries)
   - Location: `app/api/generate-quick-summary/route.ts` (line 339)

2. **Audio/TTS**: **LemonFox AI** (primary) → **OpenAI** (fallback)
   - Cost: ~$0.01 per summary
   - Location: `lib/tts-generator.ts`

### 6. Exams 📝

**Same intelligent routing as Flashcards:**

- **Small docs**: DeepSeek
- **Medium docs**: Claude 3.5 Sonnet
- **Large docs**: Gemini 1.5 Pro
- **Fallback**: OpenAI
- **Location**: `lib/ai-provider.ts`

### 7. Video Learning 📺

- **Transcript analysis**: Uses same routing as Chat/Flashcards
- **YouTube API**: For video search and metadata
- **Location**: `app/api/video/process/route.ts`

### 8. Writing Assistant ✍️

- **Outline generation**: OpenAI GPT-3.5-turbo
- **Paraphrasing**: OpenAI GPT-3.5-turbo
- **Location**: `app/api/writing/` routes

### 9. Vector Embeddings (RAG System)

- **Provider**: OpenAI
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Use cases**: Large document indexing, semantic search
- **Location**: `lib/vector-store.ts` (line 24-27)

---

## Required API Keys

### Essential (configure at least one)

```bash
OPENAI_API_KEY=sk-...          # Required for embeddings, TTS, fallback
DEEPSEEK_API_KEY=...           # Cost-effective primary for most features
LEMONFOX_API_KEY=...           # 83% cheaper TTS for podcasts/summaries
```

### Optional (auto-routing)

```bash
ANTHROPIC_API_KEY=...          # Complex mind maps, medium documents
GOOGLE_API_KEY=...             # Large documents (>800K chars)
YOUTUBE_API_KEY=...            # Video search feature
```

---

## Cost Comparison

| Provider | Input (per 1M tokens) | Output (per 1M tokens) | Primary Use Case |
|----------|----------------------|----------------------|------------------|
| **DeepSeek** | $0.14 | $0.28 | Default for small docs (10x cheaper) |
| **OpenAI GPT-3.5** | $0.50 | $1.50 | Fallback, embeddings |
| **OpenAI GPT-4o** | $2.50 | $10.00 | Mind maps (reliable edge generation) |
| **Claude 3.5 Sonnet** | $3.00 | $15.00 | Medium docs, complex reasoning |
| **Gemini 1.5 Pro** | $7.00 | $21.00 | Massive documents (>800K chars) |
| **LemonFox TTS** | $2.50/1M chars | - | Audio generation (83% cheaper) |
| **OpenAI TTS** | $15/1M chars | - | TTS fallback |

### TTS Cost Examples

- **5-minute podcast** (~750 words, 4,500 chars):
  - LemonFox: $0.01
  - OpenAI: $0.07
  - **Savings**: 83%

- **10-minute podcast** (~1,500 words, 9,000 chars):
  - LemonFox: $0.02
  - OpenAI: $0.14
  - **Savings**: 83%

---

## Intelligent Routing Logic

### Document Size-Based Routing

The app automatically selects the optimal provider based on document size:

```typescript
// lib/ai-provider.ts - selectAIProvider()

if (textLength > 800K chars) {
  return 'gemini'  // Massive context window
}

if (textLength > 100K chars) {
  return 'claude'  // Quality + good context
}

if (DEEPSEEK_API_KEY exists) {
  return 'deepseek'  // 10x cheaper for small docs
}

return 'openai'  // Fallback
```

### Context Window Limits

| Provider | Context Limit | Token Limit | Optimal For |
|----------|--------------|-------------|-------------|
| DeepSeek | ~100K chars | ~25K tokens | Articles, papers |
| OpenAI GPT-3.5 | ~100K chars | ~25K tokens | Articles, papers |
| Claude 3.5 Sonnet | ~800K chars | ~200K tokens | Textbooks, long docs |
| Gemini 1.5 Pro | ~8M chars | ~2M tokens | Entire books, massive docs |

---

## Provider Selection Strategy

### When DeepSeek is Used (Cost Optimization)

- Flashcards from small documents
- Chat with regular-sized documents
- Podcast script generation
- Quick Summary script generation
- Exam generation from articles

**Savings**: 60-70% vs OpenAI

### When Claude is Used (Quality + Context)

- Medium-large documents (100K-800K chars)
- Complex mind maps (complexity ≥ 50)
- Multi-chapter textbooks
- Academic papers with extensive content

**Benefit**: Superior reasoning, larger context

### When Gemini is Used (Massive Context)

- Entire textbooks (>800K chars)
- Research papers with appendices
- Complete course materials
- Multiple documents combined

**Benefit**: Largest context window available

### When OpenAI is Used

- Mind maps (default, reliable edge generation)
- Embeddings (`text-embedding-3-small`)
- TTS (fallback when LemonFox unavailable)
- Writing assistant features
- Fallback when preferred provider not configured

---

## Recommended Setup

### For Best Performance + Cost Optimization

```bash
# Essential
OPENAI_API_KEY=sk-...          # Embeddings, TTS, fallback
DEEPSEEK_API_KEY=...           # Primary text generation (60-70% savings)
LEMONFOX_API_KEY=...           # Audio generation (83% savings)

# Optional but recommended
ANTHROPIC_API_KEY=...          # Complex reasoning, quality boost
YOUTUBE_API_KEY=...            # Video learning feature
```

**Benefits**:
- ✅ 60-70% cost savings on text generation
- ✅ 83% cost savings on audio/TTS
- ✅ Intelligent routing for optimal quality
- ✅ Automatic fallbacks if providers fail

### For Maximum Quality (Cost-Intensive)

```bash
OPENAI_API_KEY=sk-...          # All features
ANTHROPIC_API_KEY=...          # Complex reasoning
GOOGLE_API_KEY=...             # Large documents
LEMONFOX_API_KEY=...           # Audio (still cheaper than OpenAI TTS)
```

### For Development/Testing (Minimal Cost)

```bash
OPENAI_API_KEY=sk-...          # Only OpenAI (fallback for everything)
```

---

## Environment Variable Overrides

You can override the default provider selection with environment variables:

```bash
# Force specific provider for mind maps
MINDMAP_PROVIDER=openai        # or anthropic, deepseek
MINDMAP_PROVIDER=anthropic     # Best for complex maps

# Force specific provider for podcasts
PODCAST_SCRIPT_PROVIDER=deepseek   # or openai
PODCAST_TTS_PROVIDER=openai        # or lemonfox (if using custom setup)

# Force specific provider for chat
CHAT_PROVIDER=deepseek         # or openai, claude
```

**Location**: `lib/ai/index.ts` (getProviderForFeature function, line 90-95)

---

## Code References

### Main Provider Management

- **`lib/ai/index.ts`**: Multi-provider architecture, feature defaults
- **`lib/ai/providers/base.ts`**: Provider interface
- **`lib/ai/providers/openai.ts`**: OpenAI implementation
- **`lib/ai/providers/deepseek.ts`**: DeepSeek implementation
- **`lib/ai/providers/anthropic.ts`**: Claude implementation

### Intelligent Routing

- **`lib/ai-provider.ts`**: Legacy routing for flashcards/chat/exams
  - `selectAIProvider()`: Document size-based selection
  - `generateFlashcardsAuto()`: Auto-routing wrapper

### TTS System

- **`lib/tts-generator.ts`**: LemonFox + OpenAI TTS with fallback
  - `generateSpeechWithLemonfox()`: Line 29-59
  - `generateSpeechWithOpenAI()`: Line 64-85
  - `generateSpeechForLine()`: Line 91+ (auto-fallback logic)

### Vector Embeddings

- **`lib/vector-store.ts`**: OpenAI embeddings for RAG
  - Line 24-27: `text-embedding-3-small` initialization
  - Line 97: `embeddings.embedDocuments(chunks)`

---

## Future Optimization Opportunities

1. **Add DeepSeek to more features**: Currently not used for mind maps due to edge generation issues
2. **Implement streaming for all providers**: Currently only some routes use SSE
3. **Add provider health checks**: Monitor API availability and auto-switch
4. **Cost tracking per user**: Track spend by provider for analytics
5. **A/B testing**: Compare provider quality across features
6. **Custom provider selection UI**: Let users choose preferred provider in settings

---

## Troubleshooting

### "Provider not configured" errors

**Cause**: Missing API key for selected provider

**Solution**:
```bash
# Check which providers are configured
curl http://localhost:3000/api/debug/env-check

# Add missing API keys to .env.local
DEEPSEEK_API_KEY=...
ANTHROPIC_API_KEY=...
```

### High costs from Claude/Gemini

**Cause**: Large documents triggering expensive providers

**Solution**:
- Add `DEEPSEEK_API_KEY` to route small docs to cheaper provider
- Use content selection to reduce document size
- Monitor usage in cost estimator logs

### Mind maps missing edges

**Cause**: DeepSeek struggles with edge generation

**Solution**:
```bash
# Force OpenAI for mind maps (current default)
MINDMAP_PROVIDER=openai

# Or use Anthropic for best quality
MINDMAP_PROVIDER=anthropic
```

### TTS generation slow

**Cause**: OpenAI TTS is slower than LemonFox

**Solution**:
```bash
# Add LemonFox API key for 3x faster generation
LEMONFOX_API_KEY=...
```

---

Last Updated: 2025-11-19
