# Infrastructure & Scaling Analysis

This document provides a comprehensive analysis of Synaptic's current infrastructure setup, traffic capacity, cost projections, and scaling recommendations.

**Last Updated**: 2025-11-28

---

## Current Infrastructure Setup

### Core Services

| Service | Tier | Limits | Cost |
|---------|------|--------|------|
| **Vercel** | Hobby | 100GB bandwidth/mo, 100 serverless executions/day | Free |
| **Supabase** | Free | 500MB database, 1GB storage, 2GB bandwidth | Free |
| **ChromaDB** | Self-hosted (Docker) | Single instance, no replication | Free |
| **Rate Limiting** | In-memory | Single instance, resets on deploy | Free |
| **OpenAI** | Pay-as-you-go | No prepaid credits | Variable |
| **DeepSeek** | Pay-as-you-go | No prepaid credits | Variable |
| **LemonFox** | Pay-as-you-go | No prepaid credits | Variable |

### Critical Bottlenecks

1. **ChromaDB (Self-hosted Docker)**
   - **Capacity**: 10-50 concurrent users max
   - **Issue**: Single instance, no horizontal scaling, no clustering
   - **Impact**: RAG features (large document processing) will fail under moderate load
   - **Priority**: 🔴 **CRITICAL** - Blocks scaling beyond 50 users

2. **In-memory Rate Limiting**
   - **Capacity**: 500-1,000 concurrent users (unreliable beyond this)
   - **Issue**: Single serverless instance, resets on each deployment
   - **Impact**: Users distributed across multiple serverless instances won't share rate limit state
   - **Priority**: 🔴 **CRITICAL** - Required for production

3. **Vercel Serverless (Hobby Tier)**
   - **Capacity**: 10,000-50,000 requests/day (~7-35 requests/min sustained)
   - **Issue**: No commercial use allowed on Hobby tier
   - **Impact**: Can't monetize app without upgrading
   - **Priority**: 🟡 **HIGH** - Legal requirement before launch

4. **Supabase (Free Tier)**
   - **Capacity**: 1,000-5,000 active users (500MB database)
   - **Issue**: Limited connections (60 max), no point-in-time recovery
   - **Impact**: Database connection pool exhaustion under load
   - **Priority**: 🟢 **MEDIUM** - Becomes issue at 1,000+ users

---

## Traffic Capacity Analysis

### Current Setup (All Free Tiers)

| Metric | Capacity | Bottleneck |
|--------|----------|------------|
| **Concurrent Users** | 10-50 | ChromaDB |
| **Daily Active Users** | 100-300 | Vercel Hobby bandwidth |
| **Requests/Day** | 10,000-50,000 | Vercel Hobby execution limit |
| **Large Documents (RAG)** | 10-50/day | ChromaDB performance |
| **Database Records** | 1,000-5,000 users | Supabase storage |

**Realistic Production Capacity**: **10-50 concurrent users**, **100-300 daily active users**

### With Basic Upgrades ($100-130/month)

**Upgrades**:
- Pinecone Starter: $49/month (replaces ChromaDB)
- Upstash Redis: $10/month (distributed rate limiting)
- Vercel Pro: $20/month (commercial use, better limits)
- Supabase Pro: $25/month (8GB database, 100GB storage)

| Metric | Capacity | Improvement |
|--------|----------|-------------|
| **Concurrent Users** | 500-1,000 | 10-20x improvement |
| **Daily Active Users** | 5,000-10,000 | 16-33x improvement |
| **Requests/Day** | 500,000-1M | 50x improvement |
| **Large Documents (RAG)** | 500-1,000/day | 50x improvement |
| **Database Records** | 10,000-50,000 users | 10x improvement |

**Realistic Production Capacity**: **500-1,000 concurrent users**, **5,000-10,000 daily active users**

### Production Scale ($500-1,000/month)

**Upgrades**:
- Pinecone Standard: $100/month (2M+ vectors, 10 pods)
- Upstash Redis Pro: $30/month (distributed caching)
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- Cloudflare R2: $15/month (500GB storage)
- AI Credits: $200-500/month (usage-based)
- Monitoring: $50/month (Sentry, analytics)

| Metric | Capacity | Improvement |
|--------|----------|-------------|
| **Concurrent Users** | 10,000-50,000 | 1,000x improvement |
| **Daily Active Users** | 100,000-500,000 | 1,000x improvement |
| **Requests/Day** | 5M-10M | 500x improvement |
| **Large Documents (RAG)** | 10,000+/day | 1,000x improvement |
| **Database Records** | 100,000-500,000 users | 100x improvement |

**Realistic Production Capacity**: **10,000-50,000 concurrent users**, **100,000-500,000 daily active users**

---

## AI Cost Analysis

### Cost Per User (Monthly Average)

**Free Tier User** (10 flashcard sets, 3 podcasts, 5 chat sessions, 2 mind maps):
- OpenAI: ~$4-8/month per user
- DeepSeek alternative: ~$1.60-3.20/month per user (60% savings)

**Premium Tier User** (unlimited usage, daily active):
- OpenAI: ~$20-100/month per user
- DeepSeek alternative: ~$8-40/month per user (60% savings)

### Cost Projections by User Scale

| Users | OpenAI Cost | DeepSeek Cost | Savings | Recommended Credits |
|-------|-------------|---------------|---------|---------------------|
| **10 users** | $40-80/mo | $16-32/mo | $24-48/mo | $100 initial |
| **100 users** | $400-800/mo | $160-320/mo | $240-480/mo | $500-1,000/mo |
| **1,000 users** | $4K-8K/mo | $1.6K-3.2K/mo | $2.4K-4.8K/mo | $5K-10K/mo |
| **10,000 users** | $40K-80K/mo | $16K-32K/mo | $24K-48K/mo | $50K-100K/mo |

**Free tier users**: Assume 20% of total users (lower AI usage)
**Premium users**: Assume 80% of total users (higher AI usage)

### API Provider Recommendations

#### OpenAI
- **Use For**: Embeddings (required), TTS (high quality), flashcards (existing implementation)
- **Initial Credits**: $100
- **Monthly Budget**:
  - 100 users: $400-800
  - 1,000 users: $4,000-8,000
- **Pricing**: $0.50/M input tokens, $1.50/M output tokens (GPT-4o)

#### DeepSeek
- **Use For**: Mind maps, podcast scripts, chat (60-70% cost savings)
- **Initial Credits**: $50
- **Monthly Budget**:
  - 100 users: $160-320
  - 1,000 users: $1,600-3,200
- **Pricing**: $0.27/M input tokens, $1.10/M output tokens (deepseek-chat)
- **Note**: Currently default provider for mind maps

#### Anthropic (Claude)
- **Use For**: Complex documents (textbooks, research papers), large JSON outputs
- **Initial Credits**: $50
- **Monthly Budget**:
  - 100 users: $200-1,000 (used selectively)
  - 1,000 users: $2,000-10,000
- **Pricing**: $3/M input tokens, $15/M output tokens (Claude Sonnet 4)
- **Auto-selection**: Complexity score ≥ 50 automatically uses Anthropic

#### LemonFox (TTS)
- **Use For**: Podcast audio generation (83% cheaper than OpenAI)
- **Initial Credits**: $20
- **Monthly Budget**:
  - 100 users: $100-500
  - 1,000 users: $1,000-5,000
- **Pricing**: ~$0.05/minute vs OpenAI $0.30/minute

---

## Immediate Upgrade Priorities

### Priority 1: Replace ChromaDB (🔴 CRITICAL)

**Problem**: Self-hosted Docker instance can't scale beyond 10-50 concurrent users

**Solutions**:

| Option | Cost | Capacity | Pros | Cons |
|--------|------|----------|------|------|
| **Pinecone Starter** | $49/mo | 1M vectors, 1 pod | Managed, easy migration, generous free tier (100K vectors) | Limited to 1 pod on starter |
| **Pinecone Standard** | $100/mo | 2M+ vectors, 10 pods | Horizontal scaling, high availability | More expensive |
| **Weaviate Cloud** | $50/mo | 1M vectors | Open source, flexible | More complex setup |
| **Qdrant Cloud** | $49/mo | 1M vectors | Fast, Rust-based | Newer, smaller ecosystem |

**Recommendation**: **Pinecone Starter** ($49/month)
- Start with free tier (100K vectors) to test migration
- Upgrade to Starter when hitting limits
- Easy path to Standard tier as you scale

**Migration Steps**:
1. Sign up for Pinecone, create index
2. Update `lib/vector-store.ts` to use Pinecone client
3. Set environment variable: `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`
4. Migrate existing embeddings (batch job)
5. Test RAG features thoroughly
6. Deprecate ChromaDB Docker container

### Priority 2: Distributed Rate Limiting (🔴 CRITICAL)

**Problem**: In-memory rate limiting fails across serverless instances

**Solution**: **Upstash Redis** ($10/month for 1GB)

**Benefits**:
- Distributed state across all serverless functions
- No reset on deployment
- Fast (~1-2ms latency)
- Generous free tier (10K commands/day)

**Implementation**:
```typescript
// lib/rate-limit-redis.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  analytics: true,
})
```

### Priority 3: Vercel Pro ($20/month)

**Problem**: Hobby tier prohibits commercial use, limited bandwidth

**Benefits**:
- Commercial use allowed (legal requirement)
- 1TB bandwidth/month (vs 100GB)
- 1,000 serverless executions/day (vs 100)
- Team collaboration features
- Web Analytics included

**When to upgrade**: Before charging users or launching publicly

### Priority 4: Supabase Pro ($25/month)

**Problem**: 500MB database fills up fast, limited connections

**Benefits**:
- 8GB database (16x increase)
- 100GB storage (100x increase)
- 250GB bandwidth (125x increase)
- Daily backups with point-in-time recovery
- No "Pausing" of inactive projects

**When to upgrade**: At 500-1,000 users or 400MB database usage

---

## Scaling Roadmap

### Phase 1: MVP Launch (0-100 users) - $0-100/month

**Timeline**: Months 1-2

**Infrastructure**:
- ✅ Vercel Hobby (free)
- ✅ Supabase Free (free)
- 🔄 Pinecone Free tier (0-100K vectors)
- ✅ In-memory rate limiting (acceptable for MVP)
- ✅ OpenAI pay-as-you-go ($50-100/month)

**Total Cost**: $50-100/month (mostly AI credits)

**Capacity**: 10-50 concurrent users, 100-300 daily active users

**Trigger to Phase 2**: 50 concurrent users OR 100K vectors in Pinecone

### Phase 2: Early Growth (100-1,000 users) - $200-500/month

**Timeline**: Months 3-6

**Upgrades**:
- 🔄 Vercel Pro ($20/month) - Required for commercial use
- 🔄 Pinecone Starter ($49/month) - Hitting vector limits
- 🔄 Upstash Redis ($10/month) - Rate limiting issues appearing
- 🔄 Supabase Pro ($25/month) - Database growing fast
- 🔄 AI Credits ($100-300/month) - Usage scaling

**Total Cost**: $200-500/month

**Capacity**: 500-1,000 concurrent users, 5,000-10,000 daily active users

**Trigger to Phase 3**: 500 concurrent users OR $500/month AI costs

### Phase 3: Scaling (1,000-10,000 users) - $1,000-3,000/month

**Timeline**: Months 6-12

**Upgrades**:
- 🔄 Pinecone Standard ($100/month) - Need horizontal scaling
- 🔄 Upstash Redis Pro ($30/month) - Higher throughput
- 🔄 Cloudflare R2 ($15/month) - Large file storage
- 🔄 Sentry Pro ($50/month) - Error monitoring at scale
- 🔄 AI Credits ($500-2,000/month) - Major cost driver

**Total Cost**: $1,000-3,000/month

**Capacity**: 10,000-50,000 concurrent users, 100,000-500,000 daily active users

**Trigger to Phase 4**: 10,000 concurrent users OR $3,000/month total cost

### Phase 4: Production Scale (10,000+ users) - $5,000-20,000/month

**Timeline**: Year 2+

**Infrastructure Overhaul**:
- 🔄 Pinecone Enterprise (custom pricing, dedicated pods)
- 🔄 Supabase Pro ($100-500/month) - Larger database instance
- 🔄 Vercel Enterprise (custom pricing) - Dedicated infrastructure
- 🔄 Multi-region deployment (CDN, edge functions)
- 🔄 Dedicated AI credit accounts with volume discounts
- 🔄 Full observability stack (Datadog, Sentry, custom metrics)

**Total Cost**: $5,000-20,000/month

**Capacity**: 100,000+ concurrent users, 1M+ daily active users

---

## Cost Optimization Strategies

### 1. AI Provider Rotation

**Current Implementation**: Multi-provider architecture (`lib/ai/`)

**Strategy**:
- Use **DeepSeek** for all mind maps (60% cost savings)
- Use **DeepSeek** for podcast scripts (60% cost savings)
- Keep **OpenAI** for embeddings (required), flashcards (existing), chat (quality)
- Use **Anthropic** only for complex documents (complexity ≥ 50)
- Use **LemonFox** for all TTS (83% cost savings)

**Expected Savings**: 40-50% on AI costs

### 2. Intelligent Truncation

**Current Implementation**: `lib/ai/index.ts` truncates at sentence boundaries

**Improvements**:
- Implement chapter/section selection before generation (already in UI)
- Add "lazy indexing" - only index selected document sections
- Cache AI responses for common queries (Redis)
- Implement user-controlled quality settings (faster models for drafts)

**Expected Savings**: 20-30% on AI costs

### 3. Caching Strategy

**Recommendations**:
- Cache embeddings in Redis (reuse across users for public documents)
- Cache AI responses for identical prompts (de-duplicate)
- Implement client-side caching (SWR, React Query)
- Use CDN for static assets (Cloudflare, Vercel Edge)

**Expected Savings**: 10-20% on AI costs, 30-50% on bandwidth

### 4. Freemium Model Design

**Current Limits** (`lib/usage-limits.ts`):
```typescript
free: {
  documents: 10,
  flashcards: 100,
  podcasts: 5,
  mindmaps: 10,
  chat_messages: 50,
  quick_summaries: 10,
  study_buddy: 100
}
```

**Optimization**:
- Free tier should cost $1-3/user/month (80% margins)
- Premium tier ($9.99/month) should cost $3-5/user/month (50-70% margins)
- Encourage self-hosting for power users (provide Docker images)

**Revenue Requirements**:
- Break-even at 50-100 premium users ($500-1,000/month revenue)
- Profitable at 200+ premium users ($2,000+/month revenue)

---

## Monitoring & Alerts

### Critical Metrics to Track

1. **ChromaDB Health**
   - Vector insert latency (p95, p99)
   - Query response time (p50, p95, p99)
   - Memory usage (alert at 80%)
   - **Alert Threshold**: p99 latency > 5 seconds

2. **Rate Limiting**
   - Requests throttled per endpoint
   - Users hitting limits frequently
   - False positives (legitimate users blocked)
   - **Alert Threshold**: >10% requests throttled

3. **AI Costs**
   - Tokens used per endpoint (daily, weekly, monthly)
   - Cost per user (track by tier)
   - Provider distribution (OpenAI vs DeepSeek vs Anthropic)
   - **Alert Threshold**: Daily costs exceed budget by 50%

4. **Database Performance**
   - Connection pool usage (alert at 80%)
   - Query performance (slow query log)
   - Storage usage (alert at 80%)
   - **Alert Threshold**: Connection pool > 80%

5. **Error Rates**
   - 5xx errors by endpoint
   - Failed AI generations
   - Failed file uploads
   - **Alert Threshold**: Error rate > 1%

### Recommended Tools

| Tool | Purpose | Cost | Priority |
|------|---------|------|----------|
| **Sentry** | Error tracking, performance monitoring | $26/mo (Team) | 🔴 HIGH |
| **Vercel Analytics** | Web vitals, user behavior | Included with Pro | 🟢 MEDIUM |
| **Supabase Metrics** | Database performance | Included | 🟢 MEDIUM |
| **Custom Dashboard** | AI costs, usage limits | DIY (Next.js admin) | 🟡 LOW |
| **Upstash Analytics** | Rate limiting metrics | Included | 🟢 MEDIUM |

---

## Security Considerations

### Rate Limiting (Current Risk: 🔴 HIGH)

**Issue**: In-memory rate limiting can be bypassed by distributed attacks

**Fix**: Migrate to Upstash Redis (distributed state)

**Additional Measures**:
- Implement IP-based rate limiting (in addition to user-based)
- Add CAPTCHA for suspicious traffic patterns
- Monitor for credential stuffing attacks

### API Key Exposure (Current Risk: 🟡 MEDIUM)

**Issue**: API keys in environment variables are accessible to all serverless functions

**Current Mitigation**:
- Keys are server-side only (not in `NEXT_PUBLIC_*`)
- Vercel encrypts environment variables at rest

**Additional Measures**:
- Rotate API keys quarterly
- Use separate keys for dev/staging/production
- Implement API key rotation without downtime

### User Data Privacy (Current Risk: 🟢 LOW)

**Protections**:
- ✅ Supabase Row-Level Security (RLS) enabled on all tables
- ✅ Clerk handles authentication (SOC 2 compliant)
- ✅ HTTPS everywhere (enforced by Vercel)
- ✅ User documents isolated by `user_id`

**Improvements**:
- Add data export feature (GDPR compliance)
- Implement automated data deletion for churned users (90 days)
- Add encryption at rest for sensitive documents (future)

---

## Disaster Recovery

### Current Backup Strategy

**Supabase (Free Tier)**:
- ❌ No automated backups
- ❌ No point-in-time recovery
- ⚠️ Projects pause after 7 days inactivity

**Risk**: Data loss from accidental deletion or corruption

**Mitigation** (until Supabase Pro):
- Manual weekly database dumps via `pg_dump`
- Store backups in R2/S3 (versioned)
- Test restoration monthly

**Supabase Pro Backup Strategy**:
- ✅ Daily automated backups (7-day retention)
- ✅ Point-in-time recovery (up to 7 days)
- ✅ Manual backup before major migrations

### Recovery Time Objectives (RTO)

| Failure Scenario | Current RTO | Target RTO | Mitigation |
|------------------|-------------|------------|------------|
| **Vercel outage** | 0 min (auto-failover) | 0 min | Multi-region deployment (future) |
| **Supabase outage** | 30-60 min | 5 min | Implement database replica (Pro tier) |
| **ChromaDB failure** | 60-120 min | 15 min | Migrate to Pinecone (managed service) |
| **Data corruption** | 24 hours | 1 hour | Enable point-in-time recovery (Pro tier) |

---

## Conclusion

**Current Capacity**: The app can realistically handle **10-50 concurrent users** and **100-300 daily active users** on the current free-tier infrastructure.

**Critical Bottleneck**: ChromaDB (self-hosted Docker) blocks scaling beyond 50 users. This is the #1 priority to fix.

**Minimum Viable Upgrades** ($100-130/month):
1. Pinecone Starter ($49/mo) - Replace ChromaDB
2. Upstash Redis ($10/mo) - Distributed rate limiting
3. Vercel Pro ($20/mo) - Legal requirement for commercial use
4. Supabase Pro ($25/mo) - Database growth
5. AI Credits ($100-300/mo) - Usage-based

**Break-even Point**: 50-100 premium users at $9.99/month ($500-1,000/month revenue) covers infrastructure costs.

**Scaling Path**: Clear roadmap from MVP ($100/mo) → Early Growth ($500/mo) → Production Scale ($5,000/mo) with well-defined triggers and capacity estimates.

**Next Steps**:
1. ✅ Document infrastructure (this file)
2. 🔄 Set up Pinecone account and test migration
3. 🔄 Implement Upstash Redis rate limiting
4. 🔄 Create monitoring dashboard for AI costs
5. 🔄 Plan pricing tiers based on cost analysis
