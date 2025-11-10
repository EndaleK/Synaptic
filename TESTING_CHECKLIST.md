# 🧪 Production Testing Checklist

**Date**: 2025-11-10
**Environment**: Production (https://synaptic.study)
**Status**: Pre-Launch Testing

---

## 1. Basic Functionality Tests (15 min)

### Authentication Flow
- [ ] Visit https://synaptic.study
- [ ] Click "Get Started"
- [ ] Sign up with new email (test account)
- [ ] Verify email confirmation works
- [ ] Sign in with existing account
- [ ] Verify redirect to dashboard after sign-in

### Landing Page
- [ ] Check logo displays correctly (486px size)
- [ ] Verify headline: "Learning That Adapts to You"
- [ ] Confirm 8 features are displayed
- [ ] Check social proof section loads
- [ ] Verify CTA buttons work
- [ ] Test mobile responsive view (resize browser)

---

## 2. Core Features Testing (30 min)

### Feature 1: Document Upload
- [ ] Upload a PDF (<10MB)
- [ ] Verify file appears in documents list
- [ ] Check file metadata (name, size, date)
- [ ] Try uploading DOCX file
- [ ] Try uploading TXT file

### Feature 2: Flashcard Generation
- [ ] Select a document
- [ ] Click "Generate Flashcards"
- [ ] Choose topics (if topic selection appears)
- [ ] Wait for generation to complete
- [ ] Verify flashcards display correctly
- [ ] Test flip animation (front/back)
- [ ] Mark as "Easy" - check spaced repetition updates
- [ ] Check flashcards saved to library

### Feature 3: Document Chat (Socratic Teacher)
- [ ] Open a document
- [ ] Go to Chat interface
- [ ] Ask a question about the document
- [ ] Verify AI responds with Socratic guidance
- [ ] Test follow-up questions
- [ ] Check chat history persists

### Feature 4: Podcast Generation
- [ ] Select a document
- [ ] Click "Generate Podcast"
- [ ] Wait for script generation
- [ ] Wait for audio generation (may take 2-3 min)
- [ ] Play audio - verify quality
- [ ] Check pause/resume controls
- [ ] Verify podcast saves to library

### Feature 5: Mind Map Generation
- [ ] Select a document
- [ ] Click "Generate Mind Map"
- [ ] Verify mind map renders with nodes
- [ ] Test drag-and-drop node movement
- [ ] Test zoom in/out
- [ ] Click "Expand Node" - verify it works
- [ ] Check relationships between concepts

### Feature 6: Mock Exam Simulator
- [ ] Select a document
- [ ] Click "Generate Mock Exam"
- [ ] Start exam
- [ ] Answer multiple choice questions
- [ ] Submit exam
- [ ] View results and analytics
- [ ] Check score calculation

### Feature 7: Video Learning
- [ ] Go to Video Learning section
- [ ] Search for a YouTube video (e.g., "photosynthesis")
- [ ] Select a video
- [ ] Verify transcript extraction
- [ ] Generate flashcards from video
- [ ] Check video embed plays

### Feature 8: Writing Assistant
- [ ] Go to Writing Assistant
- [ ] Create new essay
- [ ] Type some text
- [ ] Request AI suggestions
- [ ] Add a citation
- [ ] Save essay
- [ ] Verify essay appears in library

---

## 3. Premium/Payment Testing (10 min)

### Free Tier Limits
- [ ] Create new free account
- [ ] Generate 3+ flashcard sets (check if limit enforced)
- [ ] Try to exceed free tier limit
- [ ] Verify "Upgrade to Premium" prompt appears

### Payment Flow (Use Stripe test card: 4242 4242 4242 4242)
- [ ] Click "Upgrade to Premium"
- [ ] Verify redirect to Stripe Checkout
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Enter expiry: Any future date (e.g., 12/26)
- [ ] Enter CVC: Any 3 digits (e.g., 123)
- [ ] Complete payment
- [ ] Verify redirect back to dashboard
- [ ] Check "Premium" badge appears
- [ ] Verify unlimited access to features

**IMPORTANT**: After test, cancel subscription in Stripe dashboard or your database

---

## 4. Mobile Responsiveness (10 min)

### Test on Real Devices (Recommended)
- [ ] iPhone: Safari browser
- [ ] Android: Chrome browser
- [ ] iPad: Safari browser

### Or Test with Browser DevTools
- [ ] Open Chrome DevTools (F12)
- [ ] Toggle device toolbar (Ctrl+Shift+M)
- [ ] Test iPhone 12 Pro view (390 x 844)
- [ ] Test iPad Pro view (1024 x 1366)
- [ ] Test Samsung Galaxy view (360 x 740)

**Check:**
- [ ] Navigation menu works on mobile
- [ ] Buttons are tappable (not too small)
- [ ] Text is readable (no tiny fonts)
- [ ] Images scale correctly
- [ ] Flashcard swipe gestures work
- [ ] Upload button accessible

---

## 5. Performance Audit (15 min)

### PageSpeed Insights
1. Go to: https://pagespeed.web.dev/
2. Enter: https://synaptic.study
3. Run test
4. Check scores:
   - [ ] Performance > 90
   - [ ] Accessibility > 95
   - [ ] Best Practices > 90
   - [ ] SEO > 95

**If scores are low:**
- Check Core Web Vitals (LCP, FID, CLS)
- Look for suggestions (compress images, reduce bundle size)

### API Response Times
- [ ] Open browser DevTools → Network tab
- [ ] Generate flashcards - check response time (<5s)
- [ ] Load documents list - check response time (<2s)
- [ ] Chat message - check response time (<3s)

---

## 6. Security Check (15 min)

### A. API Key Exposure Check
- [ ] Open browser DevTools → Console
- [ ] Check for any exposed API keys in JavaScript
- [ ] Open Network tab → Check API requests
- [ ] Verify no secrets in response headers

**Expected**: Only `NEXT_PUBLIC_*` variables visible (Clerk, Supabase public keys)

### B. Row Level Security (RLS) Test
1. Sign in with Account A
2. Note a document ID from Account A
3. Sign out
4. Sign in with Account B
5. Try to access Account A's document directly (URL manipulation)

- [ ] Verify you CANNOT see Account A's documents
- [ ] Verify error or "Not found" message
- [ ] Check Supabase logs for RLS policy enforcement

### C. Rate Limiting Test
- [ ] Open Postman or browser console
- [ ] Make 20 rapid API calls to `/api/generate-flashcards`
- [ ] Verify you get rate limited (429 Too Many Requests)
- [ ] Check error message is user-friendly

### D. Security Headers Check
1. Go to: https://securityheaders.com/
2. Enter: https://synaptic.study
3. Run scan

**Check for:**
- [ ] Strict-Transport-Security (HSTS)
- [ ] X-Content-Type-Options
- [ ] X-Frame-Options
- [ ] Referrer-Policy
- [ ] Grade: A or A+

---

## 7. Error Monitoring (5 min)

### Sentry Verification
1. Go to: https://sentry.io/organizations/synaptic/projects/
2. Select "synaptic-production"
3. Trigger a test error:
   - [ ] Intentionally cause an error (e.g., upload invalid file)
   - [ ] Check if error appears in Sentry dashboard within 30s
   - [ ] Verify stack trace is readable
   - [ ] Check user context is captured

---

## 8. SEO & Social Sharing (5 min)

### OpenGraph Preview
1. Go to: https://www.opengraph.xyz/
2. Enter: https://synaptic.study
3. Check preview:
   - [ ] OG image displays (brain logo with text)
   - [ ] Title: "Synaptic - Learning That Adapts to You"
   - [ ] Description shows 8 tools + benefits

### Twitter Card Validator
1. Go to: https://cards-dev.twitter.com/validator
2. Enter: https://synaptic.study
3. Check:
   - [ ] Card type: summary_large_image
   - [ ] Image displays correctly
   - [ ] Text is readable

### Google Search Console (Optional)
- [ ] Submit sitemap (if not done)
- [ ] Request indexing for main pages

---

## 9. Cost Monitoring Setup (5 min)

### OpenAI Usage Limits
1. Go to: https://platform.openai.com/settings/organization/billing/limits
2. Verify:
   - [ ] Hard limit set to $500/month
   - [ ] Email alerts enabled
   - [ ] Current usage visible

### Stripe Monitoring
1. Go to: https://dashboard.stripe.com/dashboard
2. Bookmark for daily checks:
   - [ ] Gross volume
   - [ ] Failed payments
   - [ ] Subscription counts

### Vercel Analytics
1. Go to Vercel project → Analytics
2. Monitor:
   - [ ] Page views
   - [ ] Top pages
   - [ ] Geographic distribution

---

## 🚨 Common Issues & Fixes

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| 401 Unauthorized on upload | Clerk session expired | Sign out, clear cookies, sign back in |
| Flashcards don't generate | OpenAI API key invalid | Check Vercel env vars |
| Podcast audio fails | LemonFox API issue | Check API key or use OpenAI TTS fallback |
| Payment doesn't upgrade user | Webhook not firing | Check Stripe webhook logs |
| Mind map doesn't render | Browser cache issue | Hard refresh (Ctrl+Shift+R) |
| Images don't load | Cloudflare R2 issue | Check R2 bucket permissions |

---

## ✅ Testing Complete Checklist

Before launching:
- [ ] All 8 features tested and working
- [ ] Payment flow works end-to-end
- [ ] Mobile responsive on 3+ devices
- [ ] Performance score > 90
- [ ] Security audit passed
- [ ] No exposed secrets
- [ ] Error monitoring active
- [ ] Social sharing working

---

## 📊 Post-Testing Actions

**If tests pass:**
1. Document any minor issues in GitHub Issues
2. Proceed to soft launch (beta testers)
3. Monitor Sentry for 24 hours
4. Check Stripe webhook logs daily

**If critical issues found:**
1. Document in KNOWN_ISSUES.md
2. Fix before launch
3. Re-test after fixes
4. Update DEPLOYMENT_GUIDE.md

---

**Testing Notes:**
<!-- Add your testing notes here -->
- Date: 2025-11-10
- Tester:
- Results:
- Issues Found:
