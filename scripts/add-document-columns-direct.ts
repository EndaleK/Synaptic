/**
 * Direct SQL execution to add document columns
 *
 * Run with: npx tsx scripts/add-document-columns-direct.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function addColumns() {
  console.log('🚀 Adding document columns directly...\n')

  const sqlStatements = [
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NOW();`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';`,
    `CREATE INDEX IF NOT EXISTS idx_documents_is_starred ON documents(user_id, is_starred) WHERE is_starred = TRUE;`,
    `CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(user_id, is_deleted);`,
    `CREATE INDEX IF NOT EXISTS idx_documents_last_accessed ON documents(user_id, last_accessed_at DESC) WHERE is_deleted = FALSE;`,
    `CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags) WHERE is_deleted = FALSE;`
  ]

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i]
    console.log(`${i + 1}. Executing: ${sql.substring(0, 80)}...`)

    try {
      // Use raw SQL execution via Supabase
      const { data, error } = await supabase.rpc('exec_sql', { sql })

      if (error) {
        // Try alternative method - direct query
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ sql })
        })

        if (!response.ok) {
          console.log(`   ⚠️ Warning: ${error.message}`)
        } else {
          console.log('   ✅ Success')
        }
      } else {
        console.log('   ✅ Success')
      }
    } catch (err) {
      console.log(`   ⚠️ Warning: ${err}`)
    }
  }

  console.log('\n✅ All SQL statements executed!')
  console.log('\n📝 Please run this in Supabase SQL Editor if the above failed:')
  console.log('\n' + sqlStatements.join('\n'))
}

addColumns()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })
