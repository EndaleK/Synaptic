# 🚀 Synaptic Production Deployment Guide

**Last Updated**: 2025-11-09  
**Estimated Time**: 2-3 hours  
**Status**: Pre-Launch Checklist

---

## ✅ Completed Steps

- [x] Code committed and pushed to GitHub
- [x] Database migrations applied to production  
- [x] SEO metadata added
- [x] Landing page redesigned

---

## 📋 Remaining Manual Steps

### 1. Create Social Sharing Image (15 min)

**File needed**: `/public/og-image.png`

**Specs**: 1200 x 630 pixels, PNG format

**Quick tool**: https://www.canva.com (search "OG Image 1200x630")

**Content**: Logo + "Learning That Adapts to You" + "8 Tools" + "83% Cheaper"

---

### 2. Configure Vercel Environment Variables (1 hour)

**Go to**: https://vercel.com → Settings → Environment Variables

**CRITICAL Variables (must have)**:

```bash
# Authentication (LIVE keys!)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI (OpenAI required, others optional for cost savings)
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=xxx  # 60% cheaper (optional)
LEMONFOX_API_KEY=xxx  # 83% cheaper TTS (optional)

# Payments (LIVE mode!)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# YouTube (for Video Learning)
YOUTUBE_API_KEY=xxx
```

**IMPORTANT**: 
- Use `pk_live_` and `sk_live_` for Stripe (not test keys!)
- Set OpenAI billing limit to $500/month: https://platform.openai.com/settings/organization/billing/limits
- Select "Production" environment for all variables

---

### 3. Setup Stripe Webhook (10 min)

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"  
3. URL: `https://synaptic.study/api/webhooks/stripe`
4. Events: Select `checkout.session.completed` and `customer.subscription.*`
5. Copy webhook secret → Add to Vercel as `STRIPE_WEBHOOK_SECRET`

---

### 4. Setup Sentry (30 min)

1. Create account: https://sentry.io/signup/
2. Create project: "Synaptic Production" (Next.js)
3. Get `SENTRY_DSN` and `SENTRY_AUTH_TOKEN`
4. Add to Vercel environment variables
5. Test: Deploy and trigger error to verify it appears in Sentry

---

### 5. Test Everything (1 hour)

**Test Flow 1**: Sign up → Upload PDF → Generate flashcards → Review  
**Test Flow 2**: Generate mock exam → Take exam → View results  
**Test Flow 3**: Generate podcast → Play audio  
**Test Flow 4**: Try to exceed free limits → Upgrade → Payment works  
**Test Flow 5**: Check mobile (iPhone, Android, iPad)

**Payment Test**: Use Stripe test card `4242 4242 4242 4242` or real card then cancel

---

### 6. Performance Check (15 min)

**Tool**: https://pagespeed.web.dev/

**Target**: 
- Performance > 90
- Accessibility > 95  
- SEO > 95

**Common fixes**: Compress images with TinyPNG, enable caching

---

### 7. Security Check (15 min)

**A. Check no exposed secrets** (open browser console, Network tab)  
**B. Test RLS**: Try accessing another user's data (should fail)  
**C. Test rate limiting**: Make 20 rapid API requests (should block after ~10)  
**D. Headers check**: https://securityheaders.com/ (should show HSTS, CSP, etc.)

---

## 🎯 Launch Day Checklist

### Morning Setup

- [ ] Open monitoring dashboards: Vercel, Sentry, Stripe, Supabase, OpenAI
- [ ] Final smoke test (run through all 8 features)
- [ ] Support ready (email alerts, Slack)

### 12:01 AM PST - Product Hunt

- [ ] Submit: https://www.producthunt.com/posts/new
- [ ] Title: "Synaptic - 8 AI Study Tools in One Platform"
- [ ] Reply to all comments within 15 minutes
- [ ] Share on Twitter, LinkedIn, Reddit

### Monitor These

```
✅ Error Rate: < 1% (Sentry)
✅ Response Time: < 2s (Vercel)
✅ API Costs: < $50/day (OpenAI)
```

---

## 💰 Expected Costs (First 100 Users)

| Service | Monthly Cost |
|---------|-------------|
| OpenAI | $200-400 |
| LemonFox | $20-50 |
| Supabase | $0-25 |
| **Total** | **$220-475** |

**Break-even**: 23 Premium users × $9.99 = $230/month

**Cost protection**: OpenAI hard limit set to $500/month

---

## 🚨 Emergency Procedures

**If site down**: Check Vercel status, Sentry errors, then `vercel --prod rollback`  
**If payments fail**: Verify Stripe webhook URL, check LIVE keys  
**If costs spike**: Check OpenAI usage, implement stricter rate limits  

---

## ✅ Final Pre-Launch Checklist

Before going live:

- [ ] All Vercel environment variables set (Production)
- [ ] Stripe in LIVE mode with webhook configured
- [ ] OpenAI billing limit set ($500/month)
- [ ] Sentry monitoring active
- [ ] All 8 features tested end-to-end
- [ ] Mobile responsive (tested on real devices)
- [ ] Performance score > 90
- [ ] Security audit passed
- [ ] og-image.png uploaded to /public/
- [ ] Monitoring dashboards bookmarked

---

## 🎊 Ready to Launch!

1. **Week 1**: Soft launch (50-100 beta testers from Reddit)
2. **Week 2**: Product Hunt launch + social media push
3. **Week 3+**: Growth phase (influencers, content marketing)

**Launch is the beginning, not the end. Monitor, iterate, improve!**

**Questions?** See CLAUDE.md for technical details.

**Good luck! 🚀**
