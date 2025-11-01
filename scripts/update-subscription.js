const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function updateSubscription() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const clerkUserId = 'user_34FCZFApy9IN42J8qq66C6814Tr'

  console.log('Updating subscription for user:', clerkUserId)

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: 'premium',
      subscription_status: 'active',
      stripe_subscription_id: 'sub_1SOhbgFjlulH6DEo5eftHVKD',
      updated_at: new Date().toISOString()
    })
    .eq('clerk_user_id', clerkUserId)
    .select()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  if (data && data.length > 0) {
    console.log('✓ Successfully updated to Premium!')
    console.log(data[0])
  } else {
    console.log('No rows updated - user profile may not exist')
  }

  process.exit(0)
}

updateSubscription()
