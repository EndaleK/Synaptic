# Stripe Payment Integration

Complete guide for the Stripe subscription payment system implemented in this application.

## Overview

This integration provides:
- **Premium Subscriptions** - $9.99/month recurring billing
- **Stripe Checkout** - Hosted payment page
- **Customer Portal** - Self-service subscription management
- **Webhook Events** - Automatic status updates
- **Usage Limits** - Free tier: 10 documents/month, Premium: Unlimited

## Files Structure

```
app/
├── api/
│   ├── stripe/
│   │   ├── create-checkout-session/route.ts  # Creates payment sessions
│   │   └── create-portal-session/route.ts    # Customer portal access
│   └── webhooks/
│       └── stripe/route.ts                    # Webhook event handler
├── (marketing)/
│   └── pricing/page.tsx                       # Public pricing page
components/
├── SubscriptionStatus.tsx                     # Dashboard subscription widget
└── UpgradeModal.tsx                          # Free tier limit modal
supabase/
├── schema.sql                                # Database schema (updated)
└── migrations/
    └── add_stripe_subscription_id.sql        # Migration to add subscription ID column
scripts/
├── reset-stripe-customers.js                 # Clear customer IDs (dev only)
├── update-subscription-simple.js             # Manual subscription update (dev only)
├── verify-customer-portal.js                 # Verify Customer Portal configuration
└── add-subscription-column.js                # Check subscription_id column exists
```

## Environment Variables

Required in `.env.local`:

```bash
# Stripe Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...                     # Test mode secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # Test mode publishable key
STRIPE_WEBHOOK_SECRET=whsec_...                   # Webhook signing secret

# For production, use live keys:
# STRIPE_SECRET_KEY=sk_live_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Database Setup

### Add Missing Column

Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription_id
ON user_profiles(stripe_subscription_id);
```

### Schema

The `user_profiles` table includes:
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Stripe subscription ID
- `subscription_tier` - 'free' | 'premium' | 'enterprise'
- `subscription_status` - 'active' | 'inactive' | 'canceled' | 'past_due'

## Stripe Configuration

### 1. Create Product in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click "Add Product"
3. Set:
   - Name: **Premium**
   - Description: **Unlimited documents and all features**
   - Pricing Model: **Standard pricing**
   - Price: **$9.99 USD**
   - Billing Period: **Monthly**
4. Click "Save Product"
5. Copy the **Price ID** (e.g., `price_1SOPreFjlulH6DEomqvyyxZQ`)

### 2. Update Price ID in Code

Update in these 3 files:

**app/(marketing)/pricing/page.tsx** (line 14):
```typescript
const STRIPE_PRICE_ID = 'price_YOUR_ACTUAL_PRICE_ID_HERE'
```

**components/UpgradeModal.tsx** (line 52):
```typescript
const STRIPE_PRICE_ID = 'price_YOUR_ACTUAL_PRICE_ID_HERE'
```

**components/SubscriptionStatus.tsx** (line 60):
```typescript
const STRIPE_PRICE_ID = 'price_YOUR_ACTUAL_PRICE_ID_HERE'
```

### 3. Set Up Webhook Endpoint

**For Development:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward events to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (starts with `whsec_`) and add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

**For Production:**

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add Endpoint"
3. Set URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Add to production environment variables

### 4. Configure Customer Portal (Required)

The Customer Portal allows users to manage their subscriptions (cancel, update payment method, view invoices).

**For Test Mode:**

1. Go to https://dashboard.stripe.com/test/settings/billing/portal
2. Click **"Activate test link"** or **"Turn on Customer Portal"**
3. Configure the following settings:
   - ✅ **Allow customers to cancel subscriptions** - Enable this
   - ✅ **Allow customers to update payment methods** - Enable this
   - ✅ **Allow customers to switch plans** - Optional (enable for multi-tier pricing)
   - ✅ **Show invoice history** - Enable this
   - Set **Cancellation behavior**: "Cancel immediately" or "At period end" (recommended)
4. Click **"Save changes"**

**For Production:**

Repeat the same steps at https://dashboard.stripe.com/settings/billing/portal (without `/test/`)

**Verification:**

After configuration, test using the verification script:

```bash
node scripts/verify-customer-portal.js
```

Or test manually by clicking the "Manage Subscription" button on the dashboard. It should redirect to the Stripe Customer Portal without errors.

## Payment Flow

### Upgrade Flow

1. User clicks "Upgrade to Premium" on dashboard or pricing page
2. Frontend calls `/api/stripe/create-checkout-session`
3. API creates Stripe customer (if needed) and checkout session
4. User redirected to Stripe Checkout page
5. User enters payment details
6. Stripe processes payment
7. Stripe sends webhook events to `/api/webhooks/stripe`
8. Webhook handler updates `user_profiles` table
9. User redirected back to dashboard with `?upgrade=success`
10. Dashboard shows Premium status

### Webhook Events

The webhook handler processes these events:

- **checkout.session.completed** - Updates user to Premium after successful checkout
- **customer.subscription.updated** - Updates subscription status (active/past_due/canceled)
- **invoice.payment_succeeded** - Logs successful payment
- **invoice.payment_failed** - Sets subscription to past_due

## Testing

### Test Cards

Use these cards in test mode:

- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

Any future expiry date, any 3-digit CVC.

### Test Webhook Locally

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start webhook listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger test event
stripe trigger checkout.session.completed
```

### End-to-End Test

1. Start dev server: `npm run dev`
2. Start webhook listener: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Open http://localhost:3000/dashboard
4. Click "Upgrade to Premium"
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Verify Premium status shows on dashboard

## Troubleshooting

### "Please configure your Stripe Price ID first" Alert

**Problem**: Alert appears even after updating Price ID

**Solution**: Ensure you updated the Price ID in all 3 files and it's not set to the placeholder `price_YOUR_ACTUAL_PRICE_ID`

### "No such customer" or "No such price" Errors

**Problem**: Mixing test and live mode

**Solution**:
- Use test mode keys (`sk_test_`, `pk_test_`) with test mode Price IDs
- Use live mode keys (`sk_live_`, `pk_live_`) with live mode Price IDs
- Never mix test and live resources

### Webhook Not Receiving Events

**Problem**: Webhook endpoint not reachable

**Solutions**:
1. Check webhook secret is correct in `.env.local`
2. Ensure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. For production, verify webhook URL is publicly accessible
4. Check webhook endpoint in Stripe Dashboard shows "Succeeded" status

### Database Column Missing Error

**Problem**: `Could not find the 'stripe_subscription_id' column`

**Solution**: Run the migration SQL in Supabase SQL Editor (see Database Setup section above)

### "Failed to create portal session" Error

**Problem**: "No configuration provided and your test mode default configuration has not been created"

**Root Cause**: Customer Portal has not been configured in Stripe Dashboard

**Solution**:
1. Go to https://dashboard.stripe.com/test/settings/billing/portal
2. Click "Activate test link" or "Turn on Customer Portal"
3. Enable customer options (cancel subscriptions, update payment methods, view invoices)
4. Click "Save changes"

See the "Configure Customer Portal" section above for detailed instructions.

## Going to Production

### Pre-Launch Checklist

**Test Mode (Complete First):**
- [ ] Configure Customer Portal in test mode
- [ ] Test upgrade flow with test card
- [ ] Test "Manage Subscription" button
- [ ] Verify webhook events process correctly

**Production:**
- [ ] Create live mode product and price in Stripe
- [ ] Update Price IDs to live mode IDs
- [ ] Replace test API keys with live keys
- [ ] Set up production webhook endpoint
- [ ] Configure Customer Portal in live mode
- [ ] Test with real credit card (small amount)
- [ ] Verify webhooks are working in production
- [ ] Configure invoice settings
- [ ] Set up tax collection (if applicable)

### Switch to Live Mode

1. Go to https://dashboard.stripe.com (without `/test/`)
2. Create new product and price
3. Copy live mode Price ID
4. Update `.env` with live keys:
```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from live mode webhook)
```
5. Update Price IDs in code
6. Deploy to production
7. Test with real payment method

## Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

For implementation questions:
- Check server logs for detailed error messages
- Review webhook events in Stripe Dashboard
- Test locally with Stripe CLI before deploying
