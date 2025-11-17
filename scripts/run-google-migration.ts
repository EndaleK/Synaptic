/**
 * One-time migration script to add Google OAuth columns
 *
 * Run with: npx tsx scripts/run-google-migration.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🚀 Starting Google OAuth migration...\n')

  try {
    // Add google_access_token column
    console.log('1️⃣  Adding google_access_token column...')
    const { error: error1 } = await supabase.rpc('exec', {
      query: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT'
    })
    if (error1 && !error1.message.includes('already exists')) {
      console.warn('   Warning:', error1.message)
    } else {
      console.log('   ✅ google_access_token column added')
    }

    // Add google_refresh_token column
    console.log('2️⃣  Adding google_refresh_token column...')
    const { error: error2 } = await supabase.rpc('exec', {
      query: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT'
    })
    if (error2 && !error2.message.includes('already exists')) {
      console.warn('   Warning:', error2.message)
    } else {
      console.log('   ✅ google_refresh_token column added')
    }

    // Add google_token_expiry column
    console.log('3️⃣  Adding google_token_expiry column...')
    const { error: error3 } = await supabase.rpc('exec', {
      query: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP'
    })
    if (error3 && !error3.message.includes('already exists')) {
      console.warn('   Warning:', error3.message)
    } else {
      console.log('   ✅ google_token_expiry column added')
    }

    // Create index
    console.log('4️⃣  Creating index...')
    const { error: error4 } = await supabase.rpc('exec', {
      query: 'CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens ON user_profiles(clerk_user_id) WHERE google_access_token IS NOT NULL'
    })
    if (error4 && !error4.message.includes('already exists')) {
      console.warn('   Warning:', error4.message)
    } else {
      console.log('   ✅ Index created')
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Test Google Docs import at http://localhost:3001/dashboard/documents')
    console.log('   2. Click "Google Docs" button to import a document')
    console.log('   3. Delete this script: scripts/run-google-migration.ts')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.log('\n📝 Manual migration instructions:')
    console.log('   Run these SQL commands in Supabase SQL Editor:\n')
    console.log('   ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;')
    console.log('   ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;')
    console.log('   ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;')
    console.log('   CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens ON user_profiles(clerk_user_id) WHERE google_access_token IS NOT NULL;')
    process.exit(1)
  }
}

runMigration()
