const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function resetStripeCustomers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('Clearing Stripe customer IDs...')

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ stripe_customer_id: null })
    .not('stripe_customer_id', 'is', null)
    .select()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log(`✓ Cleared ${data.length} Stripe customer ID(s)`)
  process.exit(0)
}

resetStripeCustomers()
