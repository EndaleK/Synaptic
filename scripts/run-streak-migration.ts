/**
 * Run the streak tracking migration manually
 * Run with: npx tsx scripts/run-streak-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔄 Running streak tracking migration...\n')

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/003_add_streak_tracking.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  console.log('📄 Migration SQL:')
  console.log(migrationSQL)
  console.log('\n🚀 Executing migration...\n')

  // Execute the migration
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  })

  if (error) {
    // Try direct execution if RPC doesn't work
    console.log('⚠️  RPC method failed, trying direct execution...\n')

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))

    for (const statement of statements) {
      if (statement) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement })
          if (stmtError) {
            console.log(`❌ Error executing: ${statement.substring(0, 50)}...`)
            console.error(stmtError)
          } else {
            console.log(`✅ Executed: ${statement.substring(0, 50)}...`)
          }
        } catch (e) {
          console.error(`❌ Error:`, e)
        }
      }
    }
  } else {
    console.log('✅ Migration executed successfully!')
  }

  // Verify the columns exist
  console.log('\n🔍 Verifying columns...\n')

  const { data: profiles, error: checkError } = await supabase
    .from('user_profiles')
    .select('id, last_login_date, current_streak, longest_streak')
    .limit(1)

  if (checkError) {
    console.error('❌ Verification failed:', checkError)
    console.log('\n💡 You may need to run this migration manually in Supabase SQL Editor:')
    console.log('   1. Go to https://supabase.com/dashboard')
    console.log('   2. Select your project')
    console.log('   3. Go to SQL Editor')
    console.log('   4. Paste and run the migration from: supabase/migrations/003_add_streak_tracking.sql')
  } else {
    console.log('✅ Columns verified successfully!')
    console.log('   - last_login_date')
    console.log('   - current_streak')
    console.log('   - longest_streak')
    console.log('\n🎉 Streak tracking is now enabled!')
  }
}

main().catch(console.error)
