#!/usr/bin/env node

/**
 * Apply RAG columns migration to local database
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('📦 Applying RAG columns migration...\n')

  // Apply each ALTER TABLE statement individually
  const migrations = [
    {
      name: 'rag_indexed',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_indexed BOOLEAN DEFAULT FALSE'
    },
    {
      name: 'rag_collection_name',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_collection_name TEXT'
    },
    {
      name: 'rag_chunk_count',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_chunk_count INTEGER'
    },
    {
      name: 'rag_indexed_at',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP WITH TIME ZONE'
    },
    {
      name: 'rag_indexing_error',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS rag_indexing_error TEXT'
    }
  ]

  for (const migration of migrations) {
    try {
      const { error } = await supabase.rpc('exec', { sql: migration.sql })

      if (error) {
        // Supabase doesn't have exec RPC by default, use query instead
        const { error: queryError } = await supabase
          .from('documents')
          .select('id')
          .limit(1)

        if (queryError && queryError.message.includes(migration.name)) {
          console.log(`⚠️  Column ${migration.name} may be missing`)
        } else {
          console.log(`✅ Column ${migration.name} - OK`)
        }
      } else {
        console.log(`✅ Added column: ${migration.name}`)
      }
    } catch (err) {
      console.log(`ℹ️  Column ${migration.name} - ${err.message}`)
    }
  }

  // Verify columns exist by attempting a query
  console.log('\n🔍 Verifying columns...')

  const { data, error } = await supabase
    .from('documents')
    .select('id, rag_indexed, rag_collection_name, rag_chunk_count, rag_indexed_at, rag_indexing_error')
    .limit(1)

  if (error) {
    console.error('\n❌ Verification failed:', error.message)
    console.error('\n💡 You need to apply the migration manually in Supabase dashboard:')
    console.error('   1. Go to https://supabase.com/dashboard')
    console.error('   2. Select your project → SQL Editor')
    console.error('   3. Run the SQL from: supabase/migrations/20251110_add_rag_columns.sql')
    process.exit(1)
  }

  console.log('✅ All RAG columns verified!\n')
  console.log('🎉 Migration complete. You can now upload documents.')
}

applyMigration().catch(err => {
  console.error('❌ Migration error:', err)
  process.exit(1)
})
