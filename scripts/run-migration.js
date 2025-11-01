const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const migrationPath = path.join(__dirname, '../supabase/migrations/add_stripe_subscription_id.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  console.log('Running migration...')
  console.log(migrationSQL)

  // Split by semicolons to execute each statement separately
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    console.log('\nExecuting:', statement.substring(0, 100) + '...')
    const { error } = await supabase.rpc('exec_sql', { sql: statement })

    if (error) {
      // Try direct SQL execution as fallback
      const { error: directError } = await supabase.from('_raw_sql').select('*').sql(statement)
      if (directError) {
        console.error('Error executing statement:', directError)
        process.exit(1)
      }
    }
    console.log('✓ Success')
  }

  console.log('\n✓ Migration completed successfully!')
  process.exit(0)
}

runMigration()
