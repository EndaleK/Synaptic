# Setup Guide: AI Learning Platform

This guide will help you set up the development environment for the AI Learning Platform.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git installed
- Accounts on: Supabase, Clerk, OpenAI, Stripe (optional for payments)

## Step 1: Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd flashcard-generator

# Install dependencies
npm install
```

## Step 2: Set Up Supabase

1. **Create a Supabase Project**:
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and anon key

2. **Run Database Migration**:
   - In Supabase Dashboard, go to SQL Editor
   - Copy the contents of `supabase/schema.sql`
   - Paste and execute the SQL script
   - This creates all tables, indexes, and RLS policies

3. **Create Storage Buckets** (via Supabase Dashboard):
   - Navigate to Storage
   - Create three buckets:
     - `documents` (for uploaded files)
     - `podcasts` (for generated audio)
     - `exports` (for exported content)
   - Set appropriate access policies for each bucket

## Step 3: Set Up Clerk Authentication

1. **Create a Clerk Application**:
   - Go to https://clerk.com
   - Create a new application
   - Choose "Next.js" as your framework
   - Note your Publishable Key and Secret Key

2. **Configure Clerk**:
   - In Clerk Dashboard → "Paths"
   - Set sign-in path: `/sign-in`
   - Set sign-up path: `/sign-up`
   - Set redirect after sign-in: `/dashboard`

3. **Connect Clerk to Supabase** (Optional but Recommended):
   - In Clerk Dashboard → "JWT Templates"
   - Create a new template for Supabase
   - Add claims for `sub` (user ID)
   - Copy the JWKS endpoint

## Step 4: Set Up OpenAI API

1. **Get API Key**:
   - Go to https://platform.openai.com
   - Create an API key
   - Ensure you have credits available

## Step 5: Set Up Stripe (Optional - for Monetization)

1. **Create Stripe Account**:
   - Go to https://stripe.com
   - Create an account
   - Get your publishable and secret keys (start with test keys)

2. **Create Products**:
   - In Stripe Dashboard → Products
   - Create "Premium" subscription product
   - Set price (e.g., $9.99/month)
   - Note the Price ID

3. **Configure Webhook**:
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Note the webhook secret

## Step 6: Configure Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in all values**:
   ```bash
   # OpenAI
   OPENAI_API_KEY=sk-...

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ... # (Found in Supabase Dashboard → Settings → API)

   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

   # Stripe (Optional)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Step 7: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 8: Test the Setup

1. **Test Authentication**:
   - Navigate to `/sign-up`
   - Create a test account
   - Verify you're redirected to `/dashboard`

2. **Test Database Connection**:
   - Open browser console
   - Check for any Supabase connection errors
   - Verify user profile is created in Supabase

3. **Test OpenAI Integration**:
   - Upload a simple text document
   - Generate flashcards
   - Verify AI responses in chat

## Common Issues

### Issue: "Missing environment variables"
**Solution**: Ensure all required variables are in `.env.local` and restart the dev server.

### Issue: "Supabase RLS policies preventing access"
**Solution**: Check that:
- User is authenticated via Clerk
- `clerk_user_id` in user_profiles table matches Clerk user ID
- RLS policies reference `auth.jwt()->>'sub'` correctly

### Issue: "Clerk redirect loop"
**Solution**:
- Verify `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard` is set
- Check middleware.ts is protecting the right routes

### Issue: "OpenAI API errors"
**Solution**:
- Verify API key is correct
- Check you have available credits
- Ensure you're not hitting rate limits

## Next Steps

After successful setup:

1. **Customize the Landing Page**: Edit `app/page.tsx`
2. **Create Learning Style Quiz**: Follow Phase 2 implementation guide
3. **Deploy to Vercel**: Connect your GitHub repo to Vercel
4. **Set Up Production Keys**: Switch from test to production keys for Clerk and Stripe

## MCP Server Setup (Optional)

For enhanced AI-assisted development:

1. **Install Supabase MCP Server**:
   - Follow https://supabase.com/docs/guides/getting-started/mcp
   - Connect to your Supabase project
   - Enable read/write access for development

2. **Configure in Claude Code**:
   - The MCP server allows natural language database queries
   - Useful for rapid prototyping and debugging

## Support

For issues or questions:
- Check the CLAUDE.md file for architecture details
- Review the Supabase logs in the dashboard
- Check Clerk logs for authentication issues
- Review OpenAI API usage dashboard

## Production Deployment Checklist

Before deploying to production:

- [ ] Switch Clerk to production keys
- [ ] Switch Stripe to production keys
- [ ] Update environment variables in Vercel
- [ ] Configure production webhook URLs
- [ ] Enable Supabase database backups
- [ ] Set up monitoring and error tracking
- [ ] Test all features in production environment
- [ ] Configure custom domain (optional)
