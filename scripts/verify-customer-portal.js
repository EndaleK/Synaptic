const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')
require('dotenv').config({ path: '.env.local' })

async function verifyCustomerPortal() {
  console.log('🔍 Verifying Stripe Customer Portal Configuration...\n')

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Get a user with a stripe_customer_id
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('clerk_user_id, stripe_customer_id, subscription_tier')
      .not('stripe_customer_id', 'is', null)
      .limit(1)

    if (userError) {
      console.error('❌ Error fetching user:', userError.message)
      process.exit(1)
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users with Stripe customers found.')
      console.log('   Please complete a test purchase first.\n')
      process.exit(0)
    }

    const user = users[0]
    console.log('📋 Testing with user:', user.clerk_user_id)
    console.log('   Stripe Customer ID:', user.stripe_customer_id)
    console.log('   Subscription Tier:', user.subscription_tier)
    console.log('')

    // Try to create a customer portal session
    console.log('🔄 Attempting to create Customer Portal session...\n')

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: 'http://localhost:3000/dashboard',
    })

    console.log('✅ SUCCESS! Customer Portal is properly configured!\n')
    console.log('   Portal URL:', session.url)
    console.log('   Session ID:', session.id)
    console.log('')
    console.log('✨ The "Manage Subscription" button should work now.\n')

  } catch (error) {
    if (error.message.includes('No configuration provided')) {
      console.log('❌ FAILED: Customer Portal is NOT configured\n')
      console.log('📝 To fix this:\n')
      console.log('   1. Go to: https://dashboard.stripe.com/test/settings/billing/portal')
      console.log('   2. Click "Activate test link" or "Turn on Customer Portal"')
      console.log('   3. Configure settings:')
      console.log('      ✅ Allow customers to cancel subscriptions')
      console.log('      ✅ Allow customers to update payment methods')
      console.log('      ✅ Show invoice history')
      console.log('   4. Click "Save changes"')
      console.log('   5. Run this script again to verify\n')
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  }

  process.exit(0)
}

verifyCustomerPortal()
