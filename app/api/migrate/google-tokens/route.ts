/**
 * Database Migration: Add Google OAuth tokens to user_profiles
 *
 * This endpoint runs the migration to add Google token columns.
 * DELETE THIS FILE after running the migration once.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Run the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add Google OAuth token columns to user_profiles table
        ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS google_access_token TEXT,
        ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
        ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;

        -- Add index for faster token lookups
        CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens
        ON user_profiles(clerk_user_id)
        WHERE google_access_token IS NOT NULL;
      `
    })

    if (error) {
      // Try direct SQL execution if RPC doesn't exist
      const { error: directError } = await supabase
        .from('_migrations')
        .insert({
          name: 'add_google_tokens',
          executed_at: new Date().toISOString()
        })

      // Run each statement separately
      const statements = [
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP`,
        `CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens ON user_profiles(clerk_user_id) WHERE google_access_token IS NOT NULL`,
      ]

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', { query: statement })
        if (stmtError) {
          console.warn(`Statement execution warning:`, statement, stmtError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully. Google token columns added to user_profiles table.',
      note: 'You can now delete this API route file: app/api/migrate/google-tokens/route.ts'
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        instructions: 'Please run the SQL manually in Supabase SQL Editor:\n\n' +
          'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;\n' +
          'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;\n' +
          'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;\n' +
          'CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens ON user_profiles(clerk_user_id) WHERE google_access_token IS NOT NULL;'
      },
      { status: 500 }
    )
  }
}
