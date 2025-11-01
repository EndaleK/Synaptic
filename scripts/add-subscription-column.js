const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function addColumn() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('Adding stripe_subscription_id column to user_profiles...\n')

  // We need to use raw SQL via a Supabase RPC or direct connection
  // Since we can't execute DDL directly via the JS client, we'll check if the column exists first

  // Try to update a test record to see if column exists
  const { error: testError } = await supabase
    .from('user_profiles')
    .update({ stripe_subscription_id: 'test' })
    .eq('clerk_user_id', 'nonexistent')

  if (testError && testError.message.includes('stripe_subscription_id')) {
    console.log('❌ Column does not exist yet.')
    console.log('\nPlease run this SQL in Supabase SQL Editor:\n')
    console.log('─'.repeat(60))
    console.log(`
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription_id
ON user_profiles(stripe_subscription_id);
    `)
    console.log('─'.repeat(60))
    console.log('\nGo to: https://supabase.com/dashboard')
    console.log('1. Select your project')
    console.log('2. Click "SQL Editor" in sidebar')
    console.log('3. Click "New Query"')
    console.log('4. Paste the SQL above')
    console.log('5. Click "Run"')
  } else {
    console.log('✓ Column already exists or check was successful!')
  }

  process.exit(0)
}

addColumn()
