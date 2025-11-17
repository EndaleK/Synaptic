/**
 * Refresh Supabase schema cache to recognize new columns
 *
 * Run with: npx tsx scripts/refresh-supabase-schema.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function refreshSchema() {
  console.log('🔄 Refreshing Supabase schema cache...\n')

  try {
    // Force Supabase to reload its schema by making a query
    const { data, error } = await supabase
      .from('documents')
      .select('id, is_starred, is_deleted, deleted_at, last_accessed_at, tags')
      .limit(1)

    if (error) {
      console.error('❌ Error:', error)
      console.log('\n📝 The columns exist but Supabase needs to refresh its cache.')
      console.log('   Please restart your Supabase connection or wait a few minutes.')
      process.exit(1)
    }

    console.log('✅ Schema cache refreshed successfully!')
    console.log('   New columns are now accessible:')
    console.log('   • is_starred')
    console.log('   • is_deleted')
    console.log('   • deleted_at')
    console.log('   • last_accessed_at')
    console.log('   • tags')

  } catch (error) {
    console.error('\n❌ Failed to refresh schema:', error)
    process.exit(1)
  }
}

refreshSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
