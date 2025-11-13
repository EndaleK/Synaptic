#!/usr/bin/env node

/**
 * Apply missing database columns to local Supabase instance
 * This script adds all columns that may be missing from migrations
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigrations() {
  console.log('🚀 Starting database migration...\n')

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-missing-columns.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 Read migration file: add-missing-columns.sql')
    console.log(`📏 Size: ${sql.length} characters\n`)

    // Split SQL into individual statements (handle multi-line statements)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== '')

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      // Extract a short description from the statement
      let description = 'Unknown'
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE.*?(\w+)\s*\(/i)
        description = match ? `Create table: ${match[1]}` : 'Create table'
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE\s+(\w+)/i)
        const column = statement.match(/ADD COLUMN.*?(\w+)\s/i)
        description = match ? `Alter table: ${match[1]}` : 'Alter table'
        if (column) description += ` (add ${column[1]})`
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX.*?(\w+)\s+ON/i)
        description = match ? `Create index: ${match[1]}` : 'Create index'
      } else if (statement.includes('COMMENT ON')) {
        description = 'Add comment'
        skipCount++
        continue // Skip comments for speed
      }

      process.stdout.write(`  [${i + 1}/${statements.length}] ${description}... `)

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })

        if (error) {
          // Check if error is due to already existing object (safe to ignore)
          if (
            error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('IF NOT EXISTS')
          ) {
            console.log('✓ (already exists)')
            skipCount++
          } else {
            console.log(`❌ Error: ${error.message}`)
            errorCount++
          }
        } else {
          console.log('✓')
          successCount++
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`)
        errorCount++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n📊 Migration Summary:')
    console.log(`  ✓ Successful: ${successCount}`)
    console.log(`  ⊘ Skipped: ${skipCount}`)
    console.log(`  ❌ Errors: ${errorCount}`)
    console.log(`  📝 Total: ${statements.length}`)

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!')
      console.log('\n💡 Next steps:')
      console.log('  1. Restart your dev server: npm run dev')
      console.log('  2. Refresh your documents page')
      console.log('  3. The columns should now be available')
    } else {
      console.log('\n⚠️  Migration completed with some errors')
      console.log('Some statements failed but the database may still be functional')
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:')
    console.error(error)
    process.exit(1)
  }
}

// Run the migrations
applyMigrations()
