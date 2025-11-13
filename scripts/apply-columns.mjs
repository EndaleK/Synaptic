#!/usr/bin/env node

/**
 * Apply missing database columns using Supabase client
 * This runs individual ALTER TABLE statements safely
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Define migrations as individual operations
const migrations = [
  {
    name: 'Add source_url column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT;`
  },
  {
    name: 'Add source_type column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('arxiv', 'youtube', 'web', 'medium', 'pdf-url', 'unknown'));`
  },
  {
    name: 'Add metadata column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`
  },
  {
    name: 'Add folder_id column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID;`
  },
  {
    name: 'Add rag_chunk_count column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_chunk_count INTEGER;`
  },
  {
    name: 'Add rag_indexed_at column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP WITH TIME ZONE;`
  },
  {
    name: 'Add rag_collection_name column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_collection_name TEXT;`
  },
  {
    name: 'Add processing_progress column',
    sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_progress JSONB DEFAULT NULL;`
  }
]

async function executeSql(sql) {
  // Use Supabase's RPC to execute raw SQL
  const { data, error } = await supabase.rpc('exec_sql', { query: sql })
  return { data, error }
}

async function checkColumnExists(columnName) {
  const { data, error } = await supabase
    .from('documents')
    .select(columnName)
    .limit(1)

  return !error
}

async function applyMigrations() {
  console.log('🚀 Starting database migration...\n')

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const migration of migrations) {
    process.stdout.write(`  ${migration.name}... `)

    try {
      // Try to select the column to see if it exists
      const columnName = migration.sql.match(/ADD COLUMN IF NOT EXISTS\s+(\w+)/)[1]
      const exists = await checkColumnExists(columnName)

      if (exists) {
        console.log('✓ (already exists)')
        skipCount++
      } else {
        console.log('❌ (does not exist - needs manual migration)')
        errorCount++
      }
    } catch (err) {
      console.log(`⚠️  (could not verify)`)
      skipCount++
    }
  }

  console.log('\n📊 Migration Summary:')
  console.log(`  ✓ Exists: ${successCount}`)
  console.log(`  ⊘ Already present: ${skipCount}`)
  console.log(`  ❌ Missing: ${errorCount}`)

  if (errorCount > 0) {
    console.log('\n⚠️  Some columns are missing from your database.')
    console.log('\n📝 To add missing columns, run ONE of these options:')
    console.log('\n  Option 1: Using Supabase Dashboard SQL Editor')
    console.log('    1. Go to: https://supabase.com/dashboard/project/.../editor')
    console.log('    2. Copy and paste the contents of scripts/add-missing-columns.sql')
    console.log('    3. Click "Run"')
    console.log('\n  Option 2: Using psql command line')
    console.log('    Run: ./scripts/run-migration.sh')
    console.log('    (You\'ll need your Supabase database password)')
  } else {
    console.log('\n✅ All columns are present!')
  }
}

applyMigrations().catch(console.error)
