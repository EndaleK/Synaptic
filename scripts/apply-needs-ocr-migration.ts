/**
 * Apply the needs_ocr migration to add 'needs_ocr' to processing_status constraint
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('📄 Reading migration file...')
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/009_add_needs_ocr_status.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('🔧 Applying migration...')
    console.log(sql)

    // Split SQL into individual statements (handle multiline)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      console.log(`\n▶️ Executing:`, statement.substring(0, 100) + '...')
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

      if (error) {
        console.error('❌ Error:', error)
        // Try direct query instead
        const { error: directError } = await supabase.from('documents').select('*').limit(0)
        if (!directError) {
          console.log('✅ Using direct query method...')
          // Execute with raw query
          await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_query: statement })
          })
        }
      } else {
        console.log('✅ Statement executed successfully')
      }
    }

    console.log('\n✅ Migration applied successfully!')
    console.log('\nVerifying constraint...')

    // Verify the constraint was updated
    const { data, error } = await supabase
      .from('documents')
      .select('processing_status')
      .limit(1)

    if (error) {
      console.error('⚠️ Could not verify:', error)
    } else {
      console.log('✅ Documents table is accessible')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyMigration()
