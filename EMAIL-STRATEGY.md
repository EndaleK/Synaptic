# Email Strategy for Synaptic

This document outlines when and how emails are used in Synaptic, including domain-specific email addresses, triggers, and implementation details.

## Domain-Specific Email Addresses

### **hello@synaptic.study** (Primary/Marketing)
**Purpose**: Friendly, welcoming communication from the product

**Used for**:
- Welcome emails (new user onboarding)
- Subscription confirmations
- Payment receipts
- Usage limit warnings
- Study milestone celebrations
- Feature announcements
- Educational tips and content

**Tone**: Friendly, encouraging, product-focused

---

### **support@synaptic.study** (Support/Technical)
**Purpose**: Support and technical communication

**Used for**:
- Payment failure alerts (urgent action required)
- Account issues
- Technical problem notifications
- Reply-to address for all automated emails

**Tone**: Helpful, solution-oriented, professional

---

## Email Types and Triggers

### 1. Welcome Email ✅ IMPLEMENTED
**From**: `hello@synaptic.study`
**Reply-to**: `support@synaptic.study`
**Subject**: "Welcome to Synaptic - Your AI-Powered Learning Platform"

**Trigger**: User creates account (first dashboard visit)
**Implementation**: [middleware.ts:70-80](middleware.ts#L70-L80)
**Template**: [lib/email/templates/welcome-email.tsx](lib/email/templates/welcome-email.tsx)

**Content**:
- Welcome message
- Overview of features (Chat, Flashcards, Podcasts, Mind Maps, etc.)
- Getting started tips
- Link to dashboard

**When sent**: Immediately after user profile is created in database

---

### 2. Subscription Confirmation Email ✅ IMPLEMENTED
**From**: `hello@synaptic.study`
**Reply-to**: `support@synaptic.study`
**Subject**: "🎉 Welcome to Synaptic Premium!"

**Trigger**: Stripe webhook `checkout.session.completed`
**Implementation**: [app/api/webhooks/stripe/route.ts:117-128](app/api/webhooks/stripe/route.ts#L117-L128)
**Template**: [lib/email/templates/subscription-confirmed-email.tsx](lib/email/templates/subscription-confirmed-email.tsx)

**Content**:
- Congratulations message
- Premium features unlocked
- Tips to maximize premium benefits
- Billing information
- Link to dashboard

**When sent**: Immediately after successful subscription payment

---

### 3. Payment Receipt Email ✅ IMPLEMENTED
**From**: `hello@synaptic.study`
**Reply-to**: `support@synaptic.study`
**Subject**: "Payment Receipt - Synaptic Subscription"

**Trigger**: Stripe webhook `invoice.payment_succeeded` (for recurring payments only)
**Implementation**: [app/api/webhooks/stripe/route.ts:336-347](app/api/webhooks/stripe/route.ts#L336-L347)
**Template**: [lib/email/templates/payment-receipt-email.tsx](lib/email/templates/payment-receipt-email.tsx)

**Content**:
- Payment confirmation
- Amount paid, billing period, payment method
- Link to view invoice
- Premium benefits reminder

**When sent**: After each successful recurring payment (monthly/yearly)

**Note**: First payment receipt is covered by subscription confirmation email, so we skip `billing_reason: 'subscription_create'`

---

### 4. Payment Failed Email ✅ IMPLEMENTED
**From**: `support@synaptic.study` (urgent, requires action)
**Reply-to**: `support@synaptic.study`
**Subject**: "Action Required: Payment Failed for Synaptic Subscription"

**Trigger**: Stripe webhook `invoice.payment_failed`
**Implementation**: [app/api/webhooks/stripe/route.ts:278-296](app/api/webhooks/stripe/route.ts#L278-L296)
**Template**: [lib/email/templates/payment-failed-email.tsx](lib/email/templates/payment-failed-email.tsx)

**Content**:
- Payment issue notification
- Reason for failure (if available)
- Next retry date
- Common causes and solutions
- Link to update payment method

**When sent**: Immediately after payment failure

---

### 5. Usage Warning Email ✅ IMPLEMENTED
**From**: `hello@synaptic.study`
**Reply-to**: `support@synaptic.study`
**Subject**: "You've used 80% of your monthly [feature] limit"

**Trigger**: Usage tracking API when free user hits 80% of limit
**Implementation**: TODO - Add to [app/api/usage/route.ts](app/api/usage/route.ts)
**Template**: [lib/email/templates/usage-warning-email.tsx](lib/email/templates/usage-warning-email.tsx)

**Content**:
- Usage alert with progress bar
- Current usage vs. limit
- What happens at 100%
- Upgrade to premium CTA

**When sent**: Once per feature per month when hitting 80% threshold

**Implementation Status**: Template ready, needs integration into usage tracking

---

### 6. Study Reminder Email 📋 TODO
**From**: `hello@synaptic.study`
**Reply-to**: `support@synaptic.study`
**Subject**: "Time to review your flashcards!"

**Trigger**: Scheduled study sessions from `study_schedule_events` table

**Content**:
- Friendly reminder
- Due flashcard count
- Streak status
- Quick start link

**When sent**: Based on user's study schedule preferences

**Implementation Status**: Not yet implemented

---

### 7. Streak Milestone Email 📋 TODO
**From**: `hello@synaptic.study`
**Reply-to**: `support@synaptic.study`
**Subject**: "🔥 Amazing! You've hit a [X]-day study streak!"

**Trigger**: Streak milestones (7, 30, 60, 100 days)
**Related code**: [app/api/streak/update/route.ts](app/api/streak/update/route.ts)

**Content**:
- Celebration message
- Achievement badge
- Encouragement to continue
- Study statistics

**When sent**: When user hits milestone streaks (7, 30, 60, 100 days)

**Implementation Status**: Not yet implemented

---

## Implementation Architecture

### Email Service: Resend
- **Library**: `resend` npm package + `@react-email/components`
- **Client**: [lib/email/client.ts](lib/email/client.ts)
- **Helper functions**: [lib/email/send.ts](lib/email/send.ts)
- **Templates**: `lib/email/templates/*.tsx` (React Email components)

### Key Features
- **React Email templates**: Type-safe, component-based email design
- **Error handling**: Graceful fallback if API key not configured
- **Logging**: All emails logged with type and recipient
- **Asynchronous**: Welcome email sent async to avoid blocking middleware

### Configuration
```bash
# .env.local
RESEND_API_KEY=re_xxxxx

# Domain verification required (DNS records):
# - TXT: Domain verification
# - TXT: SPF "v=spf1 include:resend.com ~all"
# - CNAME: DKIM
```

### Email Flow Diagram

```
User Signs Up
    ↓
Middleware creates profile
    ↓
Send welcome email (async) ← hello@synaptic.study
    ↓
User upgrades to premium
    ↓
Stripe checkout.session.completed webhook
    ↓
Send subscription confirmation ← hello@synaptic.study
    ↓
Monthly recurring payment
    ↓
Stripe invoice.payment_succeeded webhook
    ↓
Send payment receipt ← hello@synaptic.study
    ↓
Payment fails
    ↓
Stripe invoice.payment_failed webhook
    ↓
Send payment failure alert ← support@synaptic.study
```

---

## Testing Emails Locally

### 1. Set up Resend account
```bash
# Sign up at https://resend.com
# Add synaptic.study domain
# Add DNS records for verification
# Create API key
```

### 2. Add to .env.local
```bash
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Test welcome email
```bash
# Sign up as a new user and visit /dashboard
# Check server console for: "✅ Email sent: welcome to user@example.com"
```

### 4. Test Stripe emails
```bash
# Use Stripe test mode
# Trigger webhooks via Stripe CLI:
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### 5. Preview templates
```bash
# Install React Email CLI
npm install -g react-email

# Start preview server
npx react-email dev

# Open http://localhost:3000
# See all templates with live preview
```

---

## Production Checklist

### Domain Verification (CRITICAL)
- [ ] Add TXT record for Resend domain verification
- [ ] Add SPF record: `v=spf1 include:resend.com ~all`
- [ ] Add DKIM CNAME record
- [ ] Verify domain in Resend dashboard (green checkmark)

### Environment Variables
- [ ] Set `RESEND_API_KEY` in Vercel production environment
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Verify Stripe keys are production keys (not test)

### Email Addresses Setup
- [ ] Configure Cloudflare Email Routing (if using):
  - `hello@synaptic.study` → your personal email
  - `support@synaptic.study` → your personal email
- [ ] Or set up Google Workspace / Zoho Mail for actual inboxes

### Monitoring
- [ ] Check Resend dashboard for email delivery status
- [ ] Monitor bounce rates and spam reports
- [ ] Set up email alerts for failed sends

### Compliance
- [ ] Add unsubscribe link (not required for transactional, but good practice)
- [ ] Include physical mailing address in footer (CAN-SPAM requirement)
- [ ] Honor unsubscribe requests within 10 days

---

## Email Preferences (Future Enhancement)

Add to `user_profiles` table:
```sql
ALTER TABLE user_profiles ADD COLUMN email_preferences JSONB DEFAULT '{
  "marketing": false,           -- Feature announcements, tips
  "transactional": true,         -- Welcome, receipts, payment issues
  "reminders": true,             -- Study reminders, streak alerts
  "usage_warnings": true         -- Usage limit notifications
}'::jsonb;
```

Allow users to manage preferences from dashboard settings.

---

## Metrics to Track

### Email Performance
- Open rates (via Resend analytics)
- Click-through rates on CTAs
- Bounce rates
- Spam reports
- Unsubscribe rates

### Business Impact
- Welcome email → First document upload rate
- Subscription confirmation → Feature usage rate
- Usage warning → Upgrade conversion rate
- Payment failure → Recovery rate (updated payment method)

### Cost Monitoring
- Emails sent per month
- Resend API costs ($20/month for 50K emails)
- Cost per user acquisition (email marketing)

---

## Future Email Types

### Onboarding Series (Drip Campaign)
- Day 0: Welcome email (current)
- Day 1: "Here's how to upload your first document"
- Day 3: "Try generating flashcards"
- Day 7: "Explore mind maps and podcasts"
- Day 14: "Upgrade to premium for unlimited access"

### Engagement & Re-engagement
- Inactive user (no login for 14 days): "We miss you!"
- Document processed: "Your [filename] is ready to chat with"
- Weekly study summary: "You studied X hours this week"

### Support & Education
- Feature announcement: "New feature: Video Learning"
- Tips & tricks: "5 ways to use mind maps for exam prep"
- Success stories: "How students are using Synaptic"

---

## Email Design Guidelines

### Brand Voice
- **Friendly but professional**: Not overly casual, not corporate
- **Encouraging**: Focus on learning success and progress
- **Clear CTAs**: One primary action per email
- **Educational**: Explain value, not just features

### Visual Design
- **Colors**: Primary (#6366f1 indigo), Success (#22c55e green), Warning (#f59e0b amber), Error (#ef4444 red)
- **Typography**: Sans-serif, 16px body text, clear hierarchy
- **Layout**: Max 600px width, 40px padding, responsive
- **Images**: Minimal, use icons and visual elements sparingly

### Email Structure (Template)
```
1. Header: Logo (optional)
2. Subject line preview
3. Greeting: "Hi [Name]," or "Hi there,"
4. Body: 2-3 short paragraphs
5. Primary CTA button
6. Secondary content (tips, features)
7. Footer: Support contact, settings link
8. Legal: Address, unsubscribe (if applicable)
```

---

## Troubleshooting

### Emails not sending
- Check `RESEND_API_KEY` is set
- Verify domain in Resend dashboard
- Check server logs for "Email not sent (RESEND_API_KEY not configured)"
- Test API key with curl:
  ```bash
  curl -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"from":"hello@synaptic.study","to":"test@example.com","subject":"Test","html":"Test"}'
  ```

### Emails going to spam
- Verify SPF and DKIM records
- Check Resend dashboard for bounce/spam reports
- Avoid spam trigger words (FREE, ACT NOW, etc.)
- Include unsubscribe link
- Warm up domain (start with small volume)

### Wrong email content
- Check template props in send functions
- Verify user data is fetched correctly
- Test with React Email preview server

---

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Stripe Email Best Practices](https://stripe.com/docs/receipts)
- [Email Design Inspiration](https://reallygoodemails.com/)
- [CAN-SPAM Compliance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
