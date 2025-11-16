# Email Setup Guide for Synaptic

Quick guide to set up domain-specific emails for Synaptic using Resend.

## Quick Start (5 minutes)

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up with your email
3. Verify your email address

### 2. Add Your Domain (synaptic.study)
1. In Resend dashboard → **Domains** → **Add Domain**
2. Enter: `synaptic.study`
3. You'll see DNS records to add:

```
Type: TXT
Name: @
Value: resend-verify=[random-string]

Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all

Type: CNAME
Name: resend._domainkey
Value: [provided-by-resend].resend.com
```

### 3. Add DNS Records
Go to your domain registrar (Cloudflare, Namecheap, etc.) and add the records above.

**Verification**: DNS propagation takes 5-60 minutes. Check status in Resend dashboard.

### 4. Create API Key
1. Resend dashboard → **API Keys** → **Create API Key**
2. Name: "Synaptic Production"
3. Permission: **Full Access**
4. Copy the API key (starts with `re_`)

### 5. Add to Environment Variables

**Local (.env.local)**:
```bash
RESEND_API_KEY=re_xxxxx
```

**Production (Vercel)**:
1. Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Add: `RESEND_API_KEY` = `re_xxxxx`
3. Environment: **Production**
4. **Save** and **Redeploy**

### 6. Test Email Sending

**Test welcome email**:
```bash
# Sign up as a new user
# Visit /dashboard
# Check server logs for: "✅ Email sent: welcome to user@example.com"
```

**Preview templates locally**:
```bash
npx react-email dev
# Opens http://localhost:3000 with live preview
```

---

## Email Addresses Configured

### hello@synaptic.study
**From address** for:
- Welcome emails
- Subscription confirmations
- Payment receipts
- Usage warnings
- Study reminders

### support@synaptic.study
**From address** for:
- Payment failure alerts

**Reply-to address** for:
- All automated emails

---

## Email Flow Summary

| Event | Email Type | From Address | When Sent |
|-------|-----------|--------------|-----------|
| User signs up | Welcome | hello@synaptic.study | Immediately on profile creation |
| User subscribes | Subscription Confirmed | hello@synaptic.study | After Stripe checkout |
| Monthly payment | Payment Receipt | hello@synaptic.study | Each recurring payment |
| Payment fails | Payment Failed | support@synaptic.study | When payment declines |
| 80% usage limit | Usage Warning | hello@synaptic.study | When hitting limits |

---

## Setting Up Actual Inboxes (Optional)

You have two options for receiving emails sent TO hello@/support@:

### Option A: Cloudflare Email Routing (FREE)
**Best for**: Simple forwarding to your personal email

1. Cloudflare dashboard → Email → **Email Routing**
2. Enable Email Routing
3. Add routes:
   - `hello@synaptic.study` → your personal Gmail
   - `support@synaptic.study` → your personal Gmail
4. Configure Gmail "Send mail as" to reply FROM @synaptic.study

**Total cost**: $0/month

### Option B: Google Workspace ($6/month)
**Best for**: Professional dedicated inboxes

1. Sign up at [workspace.google.com](https://workspace.google.com)
2. Add synaptic.study domain
3. Create accounts: `hello@`, `support@`
4. Verify domain with TXT record
5. Configure MX records

**Total cost**: $6/user/month

---

## Monitoring & Analytics

### Resend Dashboard
- **Emails sent**: Track daily/monthly volume
- **Delivery rate**: Should be >99%
- **Bounce rate**: Should be <2%
- **Spam reports**: Should be <0.1%

### Email Performance Metrics
```
Open Rate Target: >40% (transactional emails)
Click Rate Target: >20% (on CTAs)
Bounce Rate Target: <2%
Spam Rate Target: <0.1%
```

### Cost Tracking
```
Free tier: 100 emails/day, 3,000 emails/month
Paid tier: $20/month for 50,000 emails/month

Estimated usage:
- 100 signups/day × 30 days = 3,000 welcome emails
- 50 subscriptions/month = 50 confirmation emails
- 50 renewals/month = 50 receipt emails
Total: ~3,100 emails/month (just over free tier)
```

---

## Testing Checklist

- [ ] Resend API key set in environment variables
- [ ] Domain verified (green checkmark in Resend)
- [ ] SPF record added (`v=spf1 include:resend.com ~all`)
- [ ] DKIM record added (CNAME)
- [ ] Welcome email sends on new signup
- [ ] Subscription email sends on Stripe checkout
- [ ] Payment receipt sends on recurring payment
- [ ] Payment failure email sends on declined payment
- [ ] All emails have correct From address
- [ ] Reply-to is support@synaptic.study
- [ ] Emails render correctly in Gmail/Outlook/Apple Mail

---

## Troubleshooting

### "Email not sent (RESEND_API_KEY not configured)"
**Fix**: Add `RESEND_API_KEY` to `.env.local` and restart dev server

### "Domain not verified"
**Fix**:
1. Check DNS records are correct (exact match)
2. Wait 5-60 minutes for DNS propagation
3. Use [DNS Checker](https://dnschecker.org) to verify propagation
4. Click "Verify" in Resend dashboard

### Emails going to spam
**Fix**:
1. Verify SPF and DKIM records
2. Warm up domain (send small volume first)
3. Avoid spam trigger words
4. Include unsubscribe link

### Wrong email sender
**Fix**: Check From address in `lib/email/client.ts` and `lib/email/send.ts`

---

## Production Deployment

### Pre-launch Checklist
- [ ] Domain verified in Resend (production domain)
- [ ] API key added to Vercel production environment
- [ ] Test all email types in production
- [ ] Set up email monitoring/alerts
- [ ] Add physical address to email footer (CAN-SPAM)
- [ ] Configure email preferences in user settings

### Post-launch Monitoring
- [ ] Check Resend dashboard daily for first week
- [ ] Monitor bounce/spam rates
- [ ] Track open/click rates
- [ ] Adjust templates based on performance

---

## Next Steps

1. **Set up Resend account** (5 minutes)
2. **Verify domain** (5-60 minutes)
3. **Add API key to environment** (2 minutes)
4. **Test welcome email** (1 minute)
5. **Deploy to production** (5 minutes)

**Total setup time**: ~20 minutes + DNS propagation

---

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Components](https://react.email/docs/components/html)
- [Email Strategy Doc](./EMAIL-STRATEGY.md) - Full email implementation details
- [Stripe Email Testing](https://stripe.com/docs/webhooks/test)
