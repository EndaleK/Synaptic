# API Key Verification Checklist

**Pre-Launch Requirement**: Verify all API keys are production keys, not test/sandbox keys

**Verification Date**: _____________
**Verified By**: _____________

---

## ✅ Required API Keys (Production)

### 1. OpenAI API Key
**Variable**: `OPENAI_API_KEY`
**Format**: Starts with `sk-` (secret key)
**Get it from**: https://platform.openai.com/api-keys

**Verification Steps:**
- [ ] Key starts with `sk-`
- [ ] Key is not a test/demo key
- [ ] Key has billing configured and active
- [ ] Check usage limits: https://platform.openai.com/settings/organization/limits
- [ ] Verify billing history shows recent usage
- [ ] Test key with simple API call:
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY"
  ```
- [ ] Expected models available: `gpt-3.5-turbo`, `gpt-4o`, `text-embedding-3-small`, `tts-1`

**Budget Recommendations:**
- Set hard monthly limit: $100-$500 (adjust based on expected usage)
- Enable email alerts at 50%, 75%, 90% of limit
- Monitor dashboard daily for first week after launch

---

### 2. DeepSeek API Key (Optional but Recommended)
**Variable**: `DEEPSEEK_API_KEY`
**Get it from**: https://platform.deepseek.com/api_keys

**Verification Steps:**
- [ ] Key is active and valid
- [ ] Account has sufficient credits/billing configured
- [ ] Test key with API call:
  ```bash
  curl https://api.deepseek.com/v1/models \
    -H "Authorization: Bearer $DEEPSEEK_API_KEY"
  ```
- [ ] Model `deepseek-chat` is available

**Why DeepSeek?**
- 60-70% cheaper than OpenAI ($0.27/M vs $0.50/M tokens)
- Used for mind maps and podcast scripts to reduce costs
- If not configured, app falls back to OpenAI

---

### 3. Anthropic Claude API Key (Optional)
**Variable**: `ANTHROPIC_API_KEY`
**Format**: Starts with `sk-ant-`
**Get it from**: https://console.anthropic.com/settings/keys

**Verification Steps:**
- [ ] Key starts with `sk-ant-`
- [ ] Key has active billing and credits
- [ ] Test key with API call:
  ```bash
  curl https://api.anthropic.com/v1/models \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01"
  ```
- [ ] Models available: `claude-3-5-sonnet-20240620`, `claude-sonnet-4-20250514`

**When is Anthropic Used?**
- Complex documents (auto-selected when complexity score ≥ 50)
- Large JSON outputs (mind maps, exams)
- Falls back to OpenAI/DeepSeek if not configured

---

### 4. LemonFox TTS API Key (For Podcasts)
**Variable**: `LEMONFOX_API_KEY`
**Get it from**: https://www.lemonfox.ai/account/api-keys

**Verification Steps:**
- [ ] Key is active
- [ ] Account has credits or active billing
- [ ] 83% cheaper than OpenAI TTS ($2.50/M chars vs $15/M)
- [ ] Test with sample text-to-speech request

**Fallback:**
- If not configured, app uses OpenAI `tts-1` (more expensive)
- Consider LemonFox for cost savings on podcast feature

---

### 5. YouTube Data API v3 Key (For Video Learning)
**Variable**: `YOUTUBE_API_KEY`
**Get it from**: https://console.cloud.google.com/apis/credentials

**Verification Steps:**
- [ ] API key is created and active
- [ ] YouTube Data API v3 is enabled in project
- [ ] Daily quota: 10,000 units (100 searches/day)
- [ ] Test with YouTube search:
  ```bash
  curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=$YOUTUBE_API_KEY"
  ```
- [ ] Monitor quota usage: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

---

### 6. Supabase Credentials
**Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Get them from**: https://app.supabase.com/project/_/settings/api

**Verification Steps:**
- [ ] URL matches production project (not dev/staging)
- [ ] Anon key is for production project
- [ ] Service role key is for production project
- [ ] **CRITICAL**: Service role key is NEVER exposed to client
- [ ] Database has all migrations applied
- [ ] RLS policies are enabled on all tables
- [ ] Test database connection from server:
  ```typescript
  const supabase = createClient()
  const { data, error } = await supabase.from('user_profiles').select('count')
  ```

**Security Checks:**
- [ ] Row Level Security (RLS) enabled on all user tables
- [ ] Service role key only used in server-side API routes
- [ ] Database backups configured (daily at minimum)
- [ ] Point-in-time recovery enabled

---

### 7. Clerk Authentication
**Variables**:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**Get them from**: https://dashboard.clerk.com

**Verification Steps:**
- [ ] Keys are from production instance (not development)
- [ ] Production instance has proper domain configured
- [ ] Email/SMS authentication methods configured
- [ ] Social OAuth providers configured (if using)
- [ ] Test sign-up and sign-in flows
- [ ] Verify user sync with Supabase works

**Production Settings:**
- [ ] Allowed redirect URLs include production domain
- [ ] Session duration set appropriately (7-30 days)
- [ ] Password policy configured
- [ ] Rate limiting enabled for auth endpoints

---

### 8. Stripe (Optional - For Payments)
**Variables**:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Get them from**: https://dashboard.stripe.com/apikeys

**Verification Steps:**
- [ ] **CRITICAL**: Using LIVE keys, not TEST keys
- [ ] Live keys indicated by `pk_live_` and `sk_live_` prefixes
- [ ] Webhook endpoint configured: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Webhook signing secret obtained from webhook configuration
- [ ] Test mode is OFF in Stripe dashboard
- [ ] Products and prices created in LIVE mode
- [ ] Payment methods enabled (card, etc.)

**Webhook Events to Listen For:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## ⚠️ Optional but Recommended

### 9. Sentry Error Monitoring
**Variables**:
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

**Get them from**: https://sentry.io

**Verification Steps:**
- [ ] Sentry project created for production
- [ ] DSN copied from project settings
- [ ] Source maps upload configured (for debugging)
- [ ] Alert rules configured (Slack, email)
- [ ] Test error capture:
  ```javascript
  Sentry.captureException(new Error('Test error'))
  ```

**Recommended Alerts:**
- New issues created
- Issue spike (>100/hour)
- Performance degradation (>2s response time)

---

### 10. Cloudflare R2 Storage (For Large Files)
**Variables**:
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

**Get them from**: https://dash.cloudflare.com/r2

**Verification Steps:**
- [ ] Production R2 bucket created
- [ ] Bucket name matches configuration
- [ ] API token has read/write permissions
- [ ] CORS configured if needed for direct uploads
- [ ] Test upload and download operations
- [ ] Bucket lifecycle rules configured (if needed)

---

### 11. Upstash Redis (For Distributed Rate Limiting)
**Variables**:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Get them from**: https://console.upstash.com

**Verification Steps:**
- [ ] Redis database created for production
- [ ] REST API enabled
- [ ] Test connection and set/get operations
- [ ] Monitor usage in Upstash dashboard

**When is this used?**
- Distributed rate limiting across serverless functions
- Falls back to in-memory if not configured (resets on deployment)

---

### 12. ChromaDB (For RAG on Large Documents)
**Variable**: `CHROMA_URL`

**Verification Steps:**
- [ ] ChromaDB instance running (Docker or hosted)
- [ ] URL accessible from server
- [ ] Test collection creation:
  ```javascript
  const response = await fetch(`${CHROMA_URL}/api/v1/collections`)
  ```
- [ ] Persistent storage configured (not ephemeral)

**Production Recommendations:**
- Use persistent volume for Docker deployment
- OR: Consider hosted Chroma Cloud for production scale
- Monitor disk usage (embeddings can grow large)

---

## 🔐 Security Verification

### Environment Variables Security
- [ ] `.env.local` file is in `.gitignore` (never committed)
- [ ] Production secrets stored in Vercel environment variables (not in code)
- [ ] Service role keys and secret keys NEVER exposed to client
- [ ] All `NEXT_PUBLIC_*` variables safe to expose
- [ ] No API keys in client-side code or browser console

### API Key Rotation Plan
- [ ] Document key rotation procedure
- [ ] Schedule quarterly key rotation (recommended)
- [ ] Test key rotation in staging first
- [ ] Have backup keys ready before rotating

---

## 🧪 Integration Testing

### Test Each API Key Works End-to-End

#### OpenAI Test:
```bash
# Test embeddings (for RAG)
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "Test embedding", "model": "text-embedding-3-small"}'

# Test chat completion
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello"}]}'
```

#### Supabase Test:
- [ ] Upload document → Should save to `documents` table
- [ ] Generate flashcards → Should save to `flashcards` table
- [ ] Create exam → Should save to `exams` and `exam_questions` tables
- [ ] All RLS policies enforced correctly

#### Clerk + Supabase Integration:
- [ ] Sign up new user → Creates `user_profiles` record automatically
- [ ] User can only see their own data (RLS working)
- [ ] Sign out/sign in persists user ID correctly

---

## 📊 Monitoring Setup

### Pre-Launch Monitoring Checklist
- [ ] OpenAI usage dashboard bookmarked: https://platform.openai.com/usage
- [ ] Supabase dashboard bookmarked: https://app.supabase.com/project/_/settings/database
- [ ] Clerk dashboard bookmarked: https://dashboard.clerk.com
- [ ] Stripe dashboard bookmarked: https://dashboard.stripe.com
- [ ] Sentry dashboard bookmarked (if configured)

### Daily Checks (First Week)
- [ ] OpenAI spend tracking (should be < daily budget)
- [ ] Error rate in Sentry (should be < 1%)
- [ ] Supabase disk usage (should not grow unexpectedly)
- [ ] Clerk MAU (monthly active users)
- [ ] Stripe MRR (monthly recurring revenue)

---

## ✅ Final Sign-Off

**Before launching to production, confirm:**

- [ ] All REQUIRED API keys configured and tested
- [ ] All keys are PRODUCTION keys (not test/sandbox)
- [ ] Billing configured with limits and alerts
- [ ] Security checklist completed
- [ ] Integration tests passed
- [ ] Monitoring dashboards set up
- [ ] Error tracking enabled
- [ ] Team has access to all dashboards
- [ ] Key rotation plan documented
- [ ] Incident response plan in place

**Verified By**: _____________________
**Date**: _____________________
**Signature**: _____________________

---

## 🚨 Troubleshooting Common Issues

### "API key invalid" errors:
1. Check key format (correct prefix for each service)
2. Verify key is from production project/account
3. Check billing is active
4. Try regenerating key if corrupted

### "Rate limit exceeded":
1. Check OpenAI usage dashboard
2. Increase rate limits if needed
3. Enable Redis for distributed rate limiting
4. Optimize AI calls to reduce frequency

### "Insufficient quota":
1. Check billing status
2. Add payment method
3. Increase spending limits
4. For YouTube API: Wait for quota reset (midnight PT)

### Database connection errors:
1. Verify Supabase project is not paused
2. Check service role key is correct
3. Ensure migrations applied
4. Test connection with Supabase client

---

**Last Updated**: November 9, 2025
**Document Version**: 1.0
