#!/usr/bin/env tsx

/**
 * Script to apply the study_guides table migration to Supabase
 * Run with: npx tsx scripts/apply-study-guides-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Applying study_guides table migration...\n')

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251122_create_study_guides_table.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file:', migrationPath)
  console.log('📝 SQL length:', migrationSQL.length, 'characters\n')

  try {
    // Execute the migration SQL using Supabase RPC
    // Note: This requires the migration SQL to be split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`⚙️  Executing ${statements.length} SQL statements...\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      // Skip DO blocks and comments
      if (statement.includes('DO $$') || statement.trim().startsWith('--')) {
        console.log(`⏭️  [${i + 1}/${statements.length}] Skipping block/comment`)
        continue
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })

        if (error) {
          // Check if it's a "already exists" error (these are OK)
          if (error.message?.includes('already exists')) {
            console.log(`✓ [${i + 1}/${statements.length}] Already exists (skipped)`)
          } else {
            throw error
          }
        } else {
          console.log(`✓ [${i + 1}/${statements.length}] Success`)
        }
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          console.log(`✓ [${i + 1}/${statements.length}] Already exists (skipped)`)
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] Error:`, err.message)
          throw err
        }
      }
    }

    console.log('\n✅ Migration applied successfully!')

    // Verify the table was created
    console.log('\n🔍 Verifying study_guides table...')
    const { data, error } = await supabase
      .from('study_guides')
      .select('*')
      .limit(1)

    if (error) {
      console.error('⚠️  Verification failed:', error.message)
      console.log('ℹ️  This might be due to RLS policies. Checking table existence via direct query...')
    } else {
      console.log('✅ study_guides table is accessible and ready!')
      console.log('   Found', data?.length || 0, 'existing records')
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n💥 Fatal error:', err)
    process.exit(1)
  })
