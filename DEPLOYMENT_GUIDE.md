# 🚀 Synaptic Deployment Guide
## Complete Step-by-Step Instructions for First-Time Deployment

**Platform:** Vercel (Recommended)
**Estimated Time:** 2-3 hours
**Difficulty:** Beginner-friendly
**Cost:** Free to start, ~$20-50/month after growth

---

## 📋 Pre-Deployment Checklist

### ✅ Phase 1: Verify Services Setup (30 minutes)

#### 1.1 Verify Supabase is Production-Ready

**Check your Supabase URL:**
```bash
# Open your .env.local and find NEXT_PUBLIC_SUPABASE_URL
# It should look like:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# ❌ WRONG (local development):
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321

# ✅ CORRECT (production):
NEXT_PUBLIC_SUPABASE_URL=https://npwtmibmwvwhqcqhmbcf.supabase.co
```

**If using local Supabase, migrate to cloud:**
1. Go to https://supabase.com/dashboard
2. Create new project or use existing
3. Go to Project Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
5. Apply your schema:
   ```bash
   # Copy contents of supabase/schema.sql
   # Paste into Supabase SQL Editor
   # Run the query
   ```

---

#### 1.2 Gather All Environment Variables

**Create a document with ALL these variables ready to paste into Vercel:**

```bash
# ===== AI PROVIDERS =====
# OpenAI (REQUIRED for TTS)
OPENAI_API_KEY=sk-proj-...

# DeepSeek (RECOMMENDED for cost savings)
DEEPSEEK_API_KEY=sk-...

# Anthropic (OPTIONAL)
ANTHROPIC_API_KEY=sk-ant-...

# Gemini (OPTIONAL)
GEMINI_API_KEY=...

# YouTube API (OPTIONAL)
YOUTUBE_API_KEY=...

# ===== SUPABASE (CRITICAL) =====
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ===== CLERK AUTHENTICATION (CRITICAL) =====
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ===== STRIPE PAYMENTS (REQUIRED) =====
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ===== CLOUDFLARE R2 STORAGE (FOR LARGE FILES) =====
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=synaptic-documents

# ===== APP CONFIGURATION =====
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# ===== AI PROVIDER SELECTION (OPTIONAL) =====
MINDMAP_PROVIDER=deepseek
PODCAST_SCRIPT_PROVIDER=deepseek

# ===== OPTIONAL BUT RECOMMENDED =====
LEMONFOX_API_KEY=...
CHROMA_URL=http://localhost:8000
SENTRY_DSN=https://...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

**Action Items:**
- [ ] Copy all values from your `.env.local`
- [ ] Save to a secure text file (you'll paste these into Vercel)
- [ ] Verify all URLs start with `https://` (not `http://`)
- [ ] Double-check no values say "localhost"

---

#### 1.3 Verify Local Build Works

```bash
# Clean build to verify everything works
rm -rf .next
npm run build

# Should complete without errors
# Warnings are OK for now
```

**Expected warnings (safe to ignore for now):**
- ChromaDB module warnings
- Supabase Realtime edge runtime warnings

**If build fails:**
- Check for TypeScript errors
- Ensure all dependencies are installed
- Fix any import path issues

---

## 🌐 Phase 2: Deploy to Vercel (15 minutes)

### 2.1 Create Vercel Account

1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your repositories
4. Skip team creation (or create if you want)

---

### 2.2 Import Your Repository

1. Click **"Add New..."** → **"Project"**
2. Find **"Synaptic"** in your repository list
3. Click **"Import"**

---

### 2.3 Configure Build Settings

Vercel should auto-detect everything. Verify these settings:

```
Framework Preset: Next.js ✅ (auto-detected)
Root Directory: ./ ✅
Build Command: npm run build ✅
Output Directory: .next ✅
Install Command: npm install ✅
Node.js Version: 20.x ✅ (recommended)
```

**Don't change anything unless you know what you're doing!**

---

### 2.4 Add Environment Variables

This is the MOST IMPORTANT step!

1. Scroll down to **"Environment Variables"**
2. Click to expand
3. **Copy-paste each variable** from your prepared list
4. For each variable:
   - **Name:** Variable name (e.g., `OPENAI_API_KEY`)
   - **Value:** The actual key/value
   - **Environments:** Check ALL three boxes:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

**Pro Tips:**
- Copy-paste from your prepared file to avoid typos
- Variables with `NEXT_PUBLIC_` are exposed to browser (public)
- Variables without prefix are server-only (secret)
- You can bulk import by clicking "Paste .env"

**CRITICAL Variables (Must Have):**
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

### 2.5 Deploy!

1. Click **"Deploy"** button
2. Watch the build process:
   - ⏳ Installing dependencies... (1-2 min)
   - ⏳ Building application... (2-3 min)
   - ⏳ Uploading build outputs... (30 sec)
   - ✅ Deployment ready!

**First deployment takes 3-5 minutes**

---

### 2.6 Get Your Deployment URL

Once deployed, you'll see:

```
🎉 Congratulations!
Your project has been successfully deployed!

https://synaptic-xxx.vercel.app
```

**Copy this URL - you'll need it for the next steps!**

---

## ⚙️ Phase 3: Post-Deployment Configuration (30 minutes)

### 3.1 Update NEXT_PUBLIC_APP_URL

1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_APP_URL`
3. Update value to your Vercel URL: `https://synaptic-xxx.vercel.app`
4. Click **"Save"**
5. Go to **Deployments** tab → Click **"Redeploy"** on latest deployment

---

### 3.2 Configure Clerk

1. Go to https://dashboard.clerk.com
2. Select your Synaptic project
3. Navigate to **Configure** → **URLs**
4. Add authorized redirect URLs:
   ```
   https://synaptic-xxx.vercel.app
   https://synaptic-xxx.vercel.app/sign-in
   https://synaptic-xxx.vercel.app/sign-up
   https://synaptic-xxx.vercel.app/dashboard
   ```
5. Set **"Home URL"** to `https://synaptic-xxx.vercel.app`
6. Set **"Sign-in URL"** to `https://synaptic-xxx.vercel.app/sign-in`
7. Set **"Sign-up URL"** to `https://synaptic-xxx.vercel.app/sign-up`
8. Click **"Save"**

---

### 3.3 Configure Supabase

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. **Site URL:** `https://synaptic-xxx.vercel.app`
5. **Redirect URLs:** Add:
   ```
   https://synaptic-xxx.vercel.app/**
   https://synaptic-xxx.vercel.app/auth/callback
   ```
6. Click **"Save"**

---

### 3.4 Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://synaptic-xxx.vercel.app/api/webhooks/stripe`
4. **Description:** "Synaptic Production Webhook"
5. **Events to send:** Select these:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **"Add endpoint"**
7. **Copy the webhook signing secret** (starts with `whsec_...`)
8. Go back to Vercel → Environment Variables
9. Update `STRIPE_WEBHOOK_SECRET` with new value
10. **Redeploy** the app

---

### 3.5 Test Stripe Webhook

1. In Stripe webhook page, click **"Send test webhook"**
2. Select `customer.subscription.created`
3. Click **"Send test webhook"**
4. Should show: ✅ **200 OK**
5. If you get an error, check Vercel logs

---

## ✅ Phase 4: Testing & Verification (1 hour)

### 4.1 Critical User Flows Test

Visit your deployed app: `https://synaptic-xxx.vercel.app`

**Test 1: Authentication**
- [ ] Click "Get Started" or "Sign In"
- [ ] Create new account with email
- [ ] Verify email (check spam folder)
- [ ] Should redirect to dashboard
- [ ] Sign out and sign back in
- [ ] ✅ All auth flows work

**Test 2: Document Upload**
- [ ] Navigate to "Documents" page
- [ ] Upload a small PDF or DOCX
- [ ] Should process within 10-30 seconds
- [ ] Document should appear in list
- [ ] ✅ File upload works

**Test 3: Flashcard Generation**
- [ ] Click "Generate Flashcards" on uploaded document
- [ ] Should switch to Flashcards mode
- [ ] Wait 10-20 seconds
- [ ] Flashcards should appear
- [ ] Can flip cards
- [ ] ✅ Flashcard AI works

**Test 4: Chat with Document**
- [ ] Click "Chat" icon on a document
- [ ] Ask a question about the document
- [ ] Should get Socratic-style response (asks follow-up questions)
- [ ] ✅ Chat AI works

**Test 5: Writer Feature**
- [ ] Click "Writer" from sidebar
- [ ] Create new essay
- [ ] Type some text **with spaces** (verify space bar works!)
- [ ] Click "Save"
- [ ] Should save successfully
- [ ] ✅ Writer works

**Test 6: Payment Flow (Use Stripe Test Mode)**
- [ ] Go to pricing page
- [ ] Click "Subscribe" on Premium plan
- [ ] Use Stripe test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date
- [ ] CVC: Any 3 digits
- [ ] ZIP: Any 5 digits
- [ ] Should complete successfully
- [ ] Verify webhook was received in Stripe dashboard
- [ ] ✅ Payments work

---

### 4.2 Check Vercel Logs

1. Go to Vercel Dashboard → **Deployments**
2. Click on your latest deployment
3. Click **"Functions"** tab
4. Look for any red errors
5. **Common errors to ignore:**
   - ChromaDB warnings (expected)
   - Edge Runtime warnings (expected)

**If you see errors:**
- Click on the error to see details
- Common issues:
  - Missing environment variable
  - Supabase connection failure
  - Clerk redirect URL mismatch

---

### 4.3 Test on Multiple Devices

- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] Mobile Chrome (iOS)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Common mobile issues:**
- Responsive layout problems
- Touch targets too small
- PDF viewer not working

---

## 🔍 Phase 5: Set Up Monitoring (30 minutes)

### 5.1 Set Up Sentry (Error Tracking)

1. Go to https://sentry.io/signup/
2. Create account (free for 5,000 errors/month)
3. Create new project → Select **"Next.js"**
4. Copy your DSN: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
5. Run setup wizard:
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
6. Add to Vercel environment variables:
   ```
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_AUTH_TOKEN=... (from wizard)
   ```
7. Redeploy

**Test Sentry:**
- Create a test error page
- Visit it in production
- Check Sentry dashboard for error

---

### 5.2 Enable Vercel Analytics

1. Vercel Dashboard → **Analytics** tab
2. Click **"Enable Analytics"**
3. Free on Hobby plan (basic)
4. Upgrade to Pro for detailed insights

---

### 5.3 Set Up Uptime Monitoring

**Option 1: UptimeRobot (Free)**
1. Go to https://uptimerobot.com
2. Create account
3. Add monitor:
   - Type: HTTP(S)
   - URL: `https://synaptic-xxx.vercel.app`
   - Interval: 5 minutes
4. Get email alerts when site is down

**Option 2: BetterStack (Paid, Better)**
- More reliable
- SMS alerts
- Status page
- $10/month

---

## 🎯 Phase 6: Optimization (Optional - 1 hour)

### 6.1 Install Sharp for Image Optimization

```bash
npm install sharp
git add package.json package-lock.json
git commit -m "Add sharp for image optimization"
git push
```

Vercel will auto-deploy with sharp enabled = faster images

---

### 6.2 Set Up Redis for Rate Limiting

1. Go to https://upstash.com (free tier)
2. Create new database
3. Copy connection URL and token
4. Add to Vercel environment variables:
   ```
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
5. Redeploy

---

### 6.3 Configure Custom Domain (Optional)

**Cost:** $10-15/year

1. Purchase domain from Namecheap, Google Domains, or Cloudflare
2. In Vercel Dashboard → **Settings** → **Domains**
3. Click **"Add"**
4. Enter your domain (e.g., `synaptic.ai`)
5. Vercel provides DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
6. Add these records to your domain registrar
7. Wait 10-60 minutes for DNS propagation
8. SSL certificate auto-generates (wait 24 hours)

**After domain is live:**
- Update `NEXT_PUBLIC_APP_URL` in Vercel
- Update Clerk authorized URLs
- Update Supabase redirect URLs
- Update Stripe webhook endpoint
- Redeploy

---

## 🚨 Common Issues & Solutions

### Issue: "Failed to load environment variables"
**Solution:**
- Go to Vercel → Settings → Environment Variables
- Verify all required variables are set
- Make sure you selected all 3 environments (Production, Preview, Development)
- Redeploy

---

### Issue: "Redirect URI mismatch" (Clerk)
**Solution:**
- Go to Clerk Dashboard → Configure → URLs
- Add your exact Vercel URL
- Include trailing paths: `/sign-in`, `/sign-up`, `/dashboard`
- Wait 1 minute for changes to propagate

---

### Issue: "Database connection failed" (Supabase)
**Solution:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is NOT localhost
- Check Supabase service status: https://status.supabase.com
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Vercel logs for exact error

---

### Issue: "Stripe webhook returns 401/403"
**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` matches your webhook
- Check endpoint URL is exactly: `https://your-app.vercel.app/api/webhooks/stripe`
- Test with Stripe CLI: `stripe listen --forward-to ...`

---

### Issue: "Build fails with module not found"
**Solution:**
- Check import paths for case sensitivity
- Run `npm run build` locally to reproduce
- Verify all dependencies are in `package.json`
- Check for circular dependencies

---

### Issue: "Function execution timeout"
**Solution:**
- Hobby plan has 10s timeout
- Pro plan has 60s timeout
- Optimize slow API routes
- Consider upgrading to Pro

---

### Issue: "Bandwidth limit exceeded"
**Solution:**
- Free tier: 100GB/month (HARD LIMIT)
- Check Vercel Analytics to see usage
- Optimize image sizes
- Use Cloudflare R2 for large files
- Upgrade to Pro plan ($20/month = 1TB)

---

## 📊 Post-Deployment Checklist

### Week 1 After Launch
- [ ] Monitor Vercel logs daily
- [ ] Check Sentry for errors
- [ ] Verify Stripe webhooks working
- [ ] Test all critical user flows
- [ ] Check Supabase database size
- [ ] Monitor Vercel bandwidth usage
- [ ] Read user feedback from beta testers

### Week 2-4 After Launch
- [ ] Optimize slow API routes (check Vercel Analytics)
- [ ] Fix any reported bugs
- [ ] Set up automated backups (Supabase auto-backup on Pro)
- [ ] Review costs vs projections
- [ ] Plan upgrades if hitting limits

---

## 💰 Cost Management

### When to Upgrade Vercel (Hobby → Pro)

**Triggers:**
- Bandwidth exceeds 100GB/month
- Need team collaboration
- Need longer function timeouts (60s vs 10s)
- Need more preview deployments
- Need commercial use

**Cost:** $20/month per seat

---

### When to Upgrade Supabase (Free → Pro)

**Triggers:**
- Database > 500MB
- Storage > 1GB
- Bandwidth > 5GB
- Need daily backups
- Need more connections

**Cost:** $25/month

---

### When to Upgrade Clerk (Free → Essential)

**Triggers:**
- Monthly Active Users > 10,000
- Need advanced features (MFA, custom flows)
- Need SAML SSO

**Cost:** $25/month + $0.02/MAU over 1,000

---

## 🎉 Success Metrics

Your deployment is successful when:

✅ **All core features work:**
- Sign up/login
- Document upload
- Flashcard generation
- Chat with documents
- Writer/essay assistant
- Payment processing

✅ **No critical errors:**
- Sentry shows < 1% error rate
- Vercel logs are clean
- Stripe webhooks all 200 OK

✅ **Performance is good:**
- Page load < 3 seconds
- API responses < 2 seconds
- No timeout errors

✅ **Beta testers can use it:**
- Invite 5-10 testers
- They successfully complete key flows
- Feedback is positive

---

## 📞 Getting Help

### Vercel Support
- **Hobby Plan:** Community support (Discord, forums)
- **Pro Plan:** Email support (24-48 hour response)
- Discord: https://vercel.com/discord
- Docs: https://vercel.com/docs

### Supabase Support
- **Free Plan:** Community support
- **Pro Plan:** Email support
- Discord: https://discord.supabase.com
- Docs: https://supabase.com/docs

### Clerk Support
- **Free Plan:** Community support
- **Paid Plans:** Email support
- Discord: https://clerk.com/discord
- Docs: https://clerk.com/docs

### Stripe Support
- Chat support (all plans)
- Email support
- Phone support (for significant issues)
- Docs: https://stripe.com/docs

---

## 🚀 Next Steps After Successful Deployment

1. **Send beta tester invites** (use the guide you created earlier)
2. **Set up analytics** (Google Analytics, Plausible, or Mixpanel)
3. **Create status page** (status.io or statuspage.io)
4. **Plan your launch** (Product Hunt, Hacker News, social media)
5. **Monitor and iterate** based on user feedback

---

## 📝 Deployment Timeline

**Total estimated time: 2-3 hours**

- Pre-deployment prep: 30 minutes
- Vercel deployment: 15 minutes
- Post-deployment config: 30 minutes
- Testing: 1 hour
- Monitoring setup: 30 minutes
- Optional optimizations: 1 hour

**You've got this! 🎉**

---

*Last updated: November 3, 2025*
*Version: 1.0*
