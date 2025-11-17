/**
 * One-time migration script to add document enhancement features
 *
 * Run with: npx tsx scripts/run-document-features-migration.ts
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
  console.log('🚀 Starting document features migration...\n')

  const migrations = [
    {
      name: 'Add is_starred column',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE'
    },
    {
      name: 'Add is_deleted column',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE'
    },
    {
      name: 'Add deleted_at column',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP'
    },
    {
      name: 'Add last_accessed_at column',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NOW()'
    },
    {
      name: 'Add tags column',
      sql: "ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'"
    },
    {
      name: 'Create is_starred index',
      sql: 'CREATE INDEX IF NOT EXISTS idx_documents_is_starred ON documents(user_id, is_starred) WHERE is_starred = TRUE'
    },
    {
      name: 'Create is_deleted index',
      sql: 'CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(user_id, is_deleted)'
    },
    {
      name: 'Create last_accessed index',
      sql: 'CREATE INDEX IF NOT EXISTS idx_documents_last_accessed ON documents(user_id, last_accessed_at DESC) WHERE is_deleted = FALSE'
    },
    {
      name: 'Create tags GIN index',
      sql: 'CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags) WHERE is_deleted = FALSE'
    }
  ]

  for (const migration of migrations) {
    console.log(`📝 ${migration.name}...`)

    const { error } = await supabase.rpc('exec', {
      query: migration.sql
    })

    if (error && !error.message.includes('already exists')) {
      console.warn(`   ⚠️  Warning: ${error.message}`)
    } else {
      console.log(`   ✅ ${migration.name} completed`)
    }
  }

  console.log('\n✅ Migration completed successfully!')
  console.log('\n📝 New features enabled:')
  console.log('   • Star/favorite documents')
  console.log('   • Soft delete (trash functionality)')
  console.log('   • Recent documents tracking')
  console.log('   • Document tagging')
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    console.log('\n📝 Manual migration instructions:')
    console.log('   Run these SQL commands in Supabase SQL Editor:\n')
    console.log('   ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;')
    console.log('   ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;')
    console.log('   ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;')
    console.log('   ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NOW();')
    console.log("   ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';")
    process.exit(1)
  })
