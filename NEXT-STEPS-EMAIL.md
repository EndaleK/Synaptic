# Email Integration - Next Steps

## ✅ What's Been Completed

### 1. **Email Infrastructure** (100% Complete)
- ✅ Resend client configured ([lib/email/client.ts](lib/email/client.ts))
- ✅ Email sending utilities ([lib/email/send.ts](lib/email/send.ts))
- ✅ 5 React Email templates created
- ✅ Environment variable added to `.env.local`
- ✅ Configuration test script created

### 2. **Email Templates** (100% Complete)
- ✅ Welcome email (hello@synaptic.study)
- ✅ Subscription confirmation (hello@synaptic.study)
- ✅ Payment receipt (hello@synaptic.study)
- ✅ Payment failed alert (support@synaptic.study)
- ✅ Usage warning (hello@synaptic.study)

### 3. **Integration Points** (80% Complete)
- ✅ Welcome email on signup ([middleware.ts:70-80](middleware.ts#L70-L80))
- ✅ Subscription email on checkout ([app/api/webhooks/stripe/route.ts:105-116](app/api/webhooks/stripe/route.ts#L105-L116))
- ✅ Payment receipt on recurring payment ([app/api/webhooks/stripe/route.ts:311-322](app/api/webhooks/stripe/route.ts#L311-L322))
- ✅ Payment failure alert ([app/api/webhooks/stripe/route.ts:253-271](app/api/webhooks/stripe/route.ts#L253-L271))
- ⏳ Usage warning email (template ready, needs integration)

---

## 🚀 Next Steps to Go Live

### Step 1: Verify Domain in Resend (CRITICAL - 10 minutes)

Your API key is ready (`re_D7WX8AYU_***`), but emails won't send until you verify your domain.

1. **Sign in to Resend**
   - Go to [resend.com/login](https://resend.com/login)
   - Use the account associated with API key `re_D7WX8AYU_***`

2. **Add synaptic.study domain**
   - Dashboard → **Domains** → **Add Domain**
   - Enter: `synaptic.study`

3. **Add DNS records**
   Resend will show you 3 DNS records to add. Go to your domain registrar and add:

   ```
   Type: TXT
   Name: @ (or leave blank)
   Value: resend-verify=[UNIQUE-CODE-FROM-RESEND]

   Type: TXT
   Name: @ (or leave blank)
   Value: v=spf1 include:resend.com ~all

   Type: CNAME
   Name: resend._domainkey
   Value: [PROVIDED-BY-RESEND].resend.com
   ```

4. **Wait for verification**
   - DNS propagation: 5-60 minutes
   - Check status in Resend dashboard
   - When verified, you'll see a green checkmark ✅

5. **Test email sending**
   ```bash
   TEST_EMAIL=your@email.com npx tsx scripts/test-email.ts
   ```

---

### Step 2: Deploy to Production (5 minutes)

1. **Add to Vercel Environment Variables**
   - Go to [vercel.com](https://vercel.com) → Your project
   - **Settings** → **Environment Variables**
   - Add:
     ```
     Name: RESEND_API_KEY
     Value: re_D7WX8AYU_KvwHn8JNhjCkTBqducgF7szL
     Environment: Production, Preview
     ```
   - **Save**

2. **Redeploy**
   - **Deployments** → Latest deployment → **Redeploy**
   - Or push a new commit to trigger deployment

3. **Test production emails**
   - Sign up as new user on production → Check for welcome email
   - Subscribe to premium → Check for confirmation email

---

### Step 3: Set Up Email Inboxes (Optional - 10 minutes)

Right now, Resend can **send FROM** hello@/support@synaptic.study, but you need to set up inboxes to **receive TO** those addresses.

#### **Option A: Cloudflare Email Routing** (FREE, Recommended)

1. Cloudflare Dashboard → **Email** → **Email Routing**
2. **Enable** Email Routing
3. Add routes:
   - `hello@synaptic.study` → your personal Gmail
   - `support@synaptic.study` → your personal Gmail
4. Configure Gmail to "Send mail as" hello@ and support@

**Pros**: Free, simple, fast setup
**Cons**: Forwarding only, not dedicated inboxes

#### **Option B: Google Workspace** ($6/month)

1. Sign up at [workspace.google.com](https://workspace.google.com)
2. Add synaptic.study domain
3. Create mailboxes: hello@, support@
4. Configure MX records

**Pros**: Professional, dedicated inboxes, team collaboration
**Cons**: $6/user/month

---

## 📊 Current Status

### Email Sending
- ✅ API key configured
- ⏳ Domain verification pending
- ⏳ Production deployment pending

### Email Receiving
- ⏳ Not yet configured (optional)

### Testing
- ✅ Configuration test passes
- ⏳ Send test email (after domain verification)
- ⏳ Test all 5 email types

---

## 🧪 Testing Checklist

Once domain is verified, test all email types:

- [ ] **Welcome Email**: Sign up as new user → Visit dashboard → Check email
- [ ] **Subscription Confirmation**: Subscribe with Stripe test mode → Check email
- [ ] **Payment Receipt**: Wait for recurring payment (or use Stripe CLI) → Check email
- [ ] **Payment Failure**: Use Stripe CLI to trigger failure → Check email
- [ ] **Usage Warning**: Manually trigger (see below)

### Manual Test: Usage Warning Email

```typescript
// Create test API route: app/api/test-usage-email/route.ts
import { NextResponse } from 'next/server'
import { sendUsageWarningEmail } from '@/lib/email/send'

export async function GET() {
  const result = await sendUsageWarningEmail({
    userEmail: 'your@email.com',
    userName: 'Test User',
    usagePercentage: 85,
    limitType: 'flashcards',
    currentUsage: 85,
    maxLimit: 100,
  })

  return NextResponse.json(result)
}

// Then visit: http://localhost:3000/api/test-usage-email
```

---

## 📈 Monitoring & Analytics

### Resend Dashboard
- **Emails sent**: Daily/monthly volume
- **Delivery rate**: Should be >99%
- **Bounce rate**: Should be <2%
- **Spam reports**: Should be <0.1%

### Performance Metrics
```
Target Metrics (Transactional Emails):
- Open Rate: >40%
- Click Rate: >20%
- Bounce Rate: <2%
- Spam Rate: <0.1%
```

### Cost Tracking
```
Current Plan:
- Free tier: 3,000 emails/month
- Paid tier: $20/month for 50,000 emails

Estimated Monthly Usage:
- 100 signups/day × 30 = 3,000 welcome emails
- 50 subscriptions = 50 confirmation emails
- 50 renewals = 50 receipt emails
- 10 failures = 10 failure alerts
Total: ~3,110 emails/month

Recommendation: Start with free tier, upgrade when needed
```

---

## 🔮 Future Enhancements

### Priority 1: Usage Warning Integration
**Status**: Template ready, needs integration
**File to modify**: [app/api/usage/route.ts](app/api/usage/route.ts)

Add this after usage check:
```typescript
import { sendUsageWarningEmail } from '@/lib/email/send'

// When user hits 80% of limit
if (usagePercentage >= 80 && !emailSentThisMonth) {
  await sendUsageWarningEmail({
    userEmail: user.email,
    userName: user.full_name,
    usagePercentage,
    limitType: 'documents', // or 'flashcards', 'chat messages', etc.
    currentUsage,
    maxLimit,
  })
}
```

### Priority 2: Study Reminders
**Status**: Not implemented
**New file needed**: `lib/email/templates/study-reminder-email.tsx`
**Trigger**: Scheduled job checking `study_schedule_events` table

### Priority 3: Streak Milestones
**Status**: Not implemented
**New file needed**: `lib/email/templates/streak-milestone-email.tsx`
**Trigger**: Streak update in [app/api/streak/update/route.ts](app/api/streak/update/route.ts)

### Priority 4: Email Preferences
**Status**: Not implemented
**Database change needed**: Add `email_preferences` JSONB column to `user_profiles`
**UI needed**: Settings page toggle for email types

---

## 📝 Quick Reference

### Email Addresses
- **hello@synaptic.study**: Marketing, welcome, confirmations, receipts, warnings
- **support@synaptic.study**: Payment failures, reply-to for all emails

### Key Files
- Configuration: [lib/email/client.ts](lib/email/client.ts)
- Send functions: [lib/email/send.ts](lib/email/send.ts)
- Templates: [lib/email/templates/](lib/email/templates/)
- Test script: [scripts/test-email.ts](scripts/test-email.ts)

### Commands
```bash
# Test configuration
npx tsx scripts/test-email.ts

# Send test email
TEST_EMAIL=your@email.com npx tsx scripts/test-email.ts

# Preview templates
npx react-email dev

# Build project
npm run build
```

### Environment Variables
```bash
# .env.local
RESEND_API_KEY=re_D7WX8AYU_KvwHn8JNhjCkTBqducgF7szL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or production URL
```

---

## 🆘 Troubleshooting

### Emails not sending?
1. Check domain verification (green checkmark in Resend)
2. Verify `RESEND_API_KEY` in environment variables
3. Check server logs for "Email sent" messages
4. Test with: `TEST_EMAIL=your@email.com npx tsx scripts/test-email.ts`

### Emails going to spam?
1. Verify SPF and DKIM DNS records
2. Warm up domain (start with low volume)
3. Check Resend dashboard for spam reports
4. Avoid spam trigger words (FREE, ACT NOW, etc.)

### Wrong email content?
1. Check user data in database (email, full_name)
2. Verify template props in send functions
3. Preview templates: `npx react-email dev`

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Email Strategy Guide](./EMAIL-STRATEGY.md)
- [Email Setup Guide](./EMAIL-SETUP.md)
- [Stripe Email Testing](https://stripe.com/docs/webhooks/test)

---

## ✨ Summary

**You're 90% done!** Just need to:
1. ✅ Verify domain in Resend (10 min)
2. ✅ Deploy to production (5 min)
3. ✅ Test emails (5 min)

**Total time to launch**: ~20 minutes

All email infrastructure is built and ready. Once domain is verified, emails will start sending automatically for:
- New user signups
- Premium subscriptions
- Payment receipts
- Payment failures

Good luck! 🚀
