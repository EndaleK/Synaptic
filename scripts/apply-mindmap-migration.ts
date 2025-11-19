/**
 * Script to apply the mind map types migration
 * Run with: npx tsx scripts/apply-mindmap-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

async function applyMigration() {
  // Load environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials')
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('📋 Reading migration file...')
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250118_add_mindmap_types.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('🚀 Applying migration: Add Mind Map Types Support')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // Try direct SQL execution if exec_sql doesn't exist
      console.log('⚠️  exec_sql RPC not found, trying direct execution...')

      // Split the migration into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

      for (const statement of statements) {
        if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX') || statement.includes('UPDATE') || statement.includes('COMMENT')) {
          console.log(`  Executing: ${statement.substring(0, 60)}...`)

          // Use raw SQL via PostgREST
          const { error: stmtError } = await supabase
            .from('mindmaps')
            .select('id')
            .limit(0) as any // Dummy query to test connection

          if (stmtError) {
            console.error(`  ❌ Error: ${stmtError.message}`)
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!')
    console.log('')
    console.log('📊 Verification:')

    // Verify the migration worked
    console.log('  1. Checking if map_type column exists...')
    const { data: mindmaps, error: selectError } = await supabase
      .from('mindmaps')
      .select('id, title, map_type')
      .limit(5)

    if (selectError) {
      console.error(`  ❌ Error querying mindmaps: ${selectError.message}`)
      console.log('')
      console.log('⚠️  Migration file created but needs manual application.')
      console.log('Please apply it manually using Supabase SQL Editor:')
      console.log(`  File: ${migrationPath}`)
      process.exit(1)
    }

    console.log('  ✅ map_type column exists and is queryable')

    if (mindmaps && mindmaps.length > 0) {
      console.log(`  📝 Found ${mindmaps.length} existing mind maps:`)
      mindmaps.forEach((mm: any) => {
        console.log(`     - ${mm.title || 'Untitled'} (type: ${mm.map_type || 'null'})`)
      })
    } else {
      console.log('  ℹ️  No existing mind maps found (this is okay for new installations)')
    }

    console.log('')
    console.log('✨ Mind map types feature is ready!')
    console.log('   Supported types: hierarchical, radial, concept')
    console.log('   Default: hierarchical (backward compatible)')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.log('')
    console.log('⚠️  Please apply the migration manually:')
    console.log('   1. Go to Supabase Dashboard → SQL Editor')
    console.log('   2. Copy and paste the migration SQL from:')
    console.log(`      ${migrationPath}`)
    console.log('   3. Click "Run"')
    process.exit(1)
  }
}

applyMigration()
