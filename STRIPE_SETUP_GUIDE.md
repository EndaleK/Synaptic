# 💳 Stripe Payment System Setup Guide

Complete guide to set up subscriptions for Synaptic Learning Platform.

---

## 📋 Prerequisites

- [x] Stripe account (free to create)
- [x] Supabase database access
- [x] Clerk authentication working
- [x] Code deployed (for webhooks)

---

## 🚀 Step 1: Create Stripe Account (5 min)

1. Go to https://dashboard.stripe.com/register
2. Fill in:
   - Email
   - Full name
   - Country
   - Password
3. Verify your email
4. **Stay in Test Mode** (top-left toggle) while setting up

---

## 🔑 Step 2: Get API Keys (2 min)

### For Development (Test Mode):

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy these values:

```bash
# Add to .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
```

**⚠️ IMPORTANT:**
- `pk_test_` = Publishable key (safe to expose in browser)
- `sk_test_` = Secret key (NEVER commit to git, server-side only)

---

## 🛍️ Step 3: Create Product & Price (5 min)

### Option A: Using Stripe Dashboard (Recommended for beginners)

1. Go to https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**
3. Fill in:
   - **Name:** `Synaptic Premium`
   - **Description:** `Unlimited AI-powered learning with all features`
   - **Upload image** (optional but recommended)
4. Under **Pricing**:
   - **Pricing model:** Standard pricing
   - **Price:** `9.99`
   - **Billing period:** Monthly
   - **Currency:** USD
5. Click **"Save product"**
6. **Copy the Price ID** (e.g., `price_1Abc123...`)

### Option B: Using Stripe CLI (Advanced)

```bash
stripe products create \
  --name="Synaptic Premium" \
  --description="Unlimited AI-powered learning"

stripe prices create \
  --product=prod_xxx \
  --unit-amount=999 \
  --currency=usd \
  --recurring[interval]=month
```

---

## 🎯 Step 4: Update Pricing Page (2 min)

Open `app/(marketing)/pricing/page.tsx` and update the Premium tier:

```typescript
{
  name: "Premium",
  price: "$9.99",
  period: "/month",
  // ADD THIS LINE with your actual Price ID:
  priceId: "price_1Abc123YourActualPriceID",
  // ... rest of config
}
```

Then update the "Start Free Trial" button's `onClick`:

```typescript
<button
  onClick={async () => {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'price_1Abc123YourActualPriceID', // Your Price ID
        tier: 'premium'
      })
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }}
>
  Start Free Trial
</button>
```

---

## 🪝 Step 5: Set Up Webhooks (CRITICAL!)

Webhooks notify your app when payments succeed/fail. **Without this, subscriptions won't activate!**

### Development (Local Testing):

1. Install Stripe CLI:
   ```bash
   # Mac
   brew install stripe/stripe-cli/stripe

   # Windows
   scoop install stripe

   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to localhost:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret** (starts with `whsec_...`):
   ```bash
   # Add to .env.local
   STRIPE_WEBHOOK_SECRET=whsec_abc123...
   ```

5. **Keep this terminal running** while testing!

### Production (After Deployment):

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"+ Add endpoint"**
3. Set **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.payment_succeeded`
5. Click **"Add endpoint"**
6. Click **"Reveal"** under **Signing secret**
7. Copy and add to your production `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_prod_abc123...
   ```

---

## 🗄️ Step 6: Run Database Migration (1 min)

Apply the Stripe subscription column migration:

```bash
# If using Supabase CLI
supabase db push

# OR run the SQL directly in Supabase dashboard
# Copy contents of: supabase/migrations/003_add_stripe_subscription_id.sql
# Paste into SQL Editor at: https://app.supabase.com/project/YOUR_PROJECT/sql
```

---

## 🧪 Step 7: Test the Payment Flow (10 min)

### Test Cards (Always use these in Test Mode):

| Scenario | Card Number | CVC | Date |
|----------|-------------|-----|------|
| ✅ **Success** | `4242 4242 4242 4242` | Any 3 digits | Future date |
| ❌ **Decline** | `4000 0000 0000 0002` | Any 3 digits | Future date |
| 🔐 **3D Secure** | `4000 0025 0000 3155` | Any 3 digits | Future date |

### Testing Steps:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Start Stripe webhook listener** (separate terminal):
   ```bash
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   ```

3. **Go to pricing page:**
   ```
   http://localhost:3000/pricing
   ```

4. **Click "Start Free Trial"**

5. **Fill in Stripe Checkout:**
   - Email: test@example.com
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - Name: Test User

6. **Click "Subscribe"**

7. **Verify in terminal:**
   - Webhook listener should show:
     ```
     [200] POST /api/webhooks/stripe [evt_abc123]
     ```
   - Dev server should show:
     ```
     User upgraded to premium: user_abc123
     ```

8. **Check database:**
   ```sql
   SELECT clerk_user_id, subscription_tier, subscription_status, stripe_customer_id
   FROM user_profiles
   WHERE clerk_user_id = 'YOUR_USER_ID';
   ```

   Should show:
   ```
   subscription_tier: "premium"
   subscription_status: "active"
   stripe_customer_id: "cus_..."
   ```

9. **Test Customer Portal:**
   - Go to `/dashboard`
   - Click "Manage Subscription"
   - Should open Stripe Customer Portal
   - Try canceling subscription
   - Verify downgrade to free tier

---

## ✅ Verification Checklist

Before going live, verify:

- [  ] Checkout flow creates Stripe customer
- [  ] Payment success upgrades user to premium
- [  ] Webhook signature verification works
- [  ] Database updates correctly
- [  ] Customer Portal opens
- [  ] Subscription cancellation downgrades to free
- [  ] Failed payments mark user as past_due
- [  ] Usage limits respect subscription tier

---

## 🚀 Going Live (Production)

When ready to accept real payments:

### 1. Activate your Stripe account
- Complete business details
- Add bank account for payouts
- Verify identity (may take 1-2 days)

### 2. Switch to Live Mode
- Toggle to **Live Mode** in Stripe Dashboard
- Get new API keys from https://dashboard.stripe.com/apikeys
- Update production environment variables:
  ```bash
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_SECRET_KEY=sk_live_...
  ```

### 3. Create Live Product
- Repeat Step 3 in Live Mode
- Get new Price ID
- Update pricing page

### 4. Set up Live Webhooks
- Repeat Step 5 for production domain
- Use production webhook secret

### 5. Test with real card
- Use small amount ($0.50) for first test
- Verify money appears in Stripe dashboard
- Cancel and verify refund

---

## 💰 Pricing Recommendations

### Current Setup:
- **Free:** 10 docs/month, 50 flashcards, 5 podcasts, 10 mind maps
- **Premium:** $9.99/month - Unlimited everything

### Alternative Pricing Strategies:

**Option 1: Add Annual Plan (Most common for SaaS)**
```
Premium Monthly: $9.99/month
Premium Annual: $99/year (save $20 - 17% off)
```

**Option 2: Freemium + Two Paid Tiers**
```
Free: 5 docs/month
Pro: $7.99/month - 50 docs/month
Premium: $14.99/month - Unlimited
```

**Option 3: Usage-Based (Advanced)**
```
Free: 10 docs/month
Pay-as-you-go: $0.99 per document
Premium: $9.99/month unlimited
```

---

## 🐛 Troubleshooting

### "Webhook signature verification failed"
- ✅ Check `STRIPE_WEBHOOK_SECRET` is correct
- ✅ Restart dev server after adding secret
- ✅ Use `stripe listen --forward-to` for local dev

### "No subscription found"
- ✅ Check webhook fired (see terminal)
- ✅ Verify `stripe_customer_id` in database
- ✅ Check Supabase logs for errors

### "Payment succeeded but user not upgraded"
- ✅ Check webhook endpoint is reachable
- ✅ Verify metadata in Stripe Checkout session
- ✅ Check database for `subscription_tier = 'premium'`

### "Test card declined"
- ✅ Use `4242 4242 4242 4242` exactly
- ✅ Toggle to Test Mode in Stripe Dashboard
- ✅ Check you're using test API keys (pk_test_, sk_test_)

---

## 📚 Resources

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook Events](https://stripe.com/docs/api/events/types)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)

---

## 🎉 Next Steps

After setup is complete:

1. Add subscription status to dashboard UI
2. Show usage limits with progress bars
3. Add "Upgrade" modal when limits reached
4. Send email notifications for payment failures
5. Add analytics tracking for conversions
6. Consider adding annual plans for better retention

**Your payment system is now ready! 🚀**
