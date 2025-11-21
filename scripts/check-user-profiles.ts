/**
 * Check user profiles and their sessions
 * Run with: npx tsx scripts/check-user-profiles.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔍 Checking user profiles and sessions...\n')

  // Get all user profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, clerk_user_id, email, created_at')

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError)
    return
  }

  console.log(`👥 Total user profiles: ${profiles?.length || 0}\n`)

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No user profiles found!')
    return
  }

  // For each profile, count their sessions
  for (const profile of profiles) {
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('id, completed, duration_minutes')
      .eq('user_id', profile.id)

    const completed = sessions?.filter(s => s.completed).length || 0
    const incomplete = sessions?.filter(s => !s.completed).length || 0
    const totalMinutes = sessions?.filter(s => s.completed).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0

    console.log(`📊 Profile: ${profile.email || profile.clerk_user_id}`)
    console.log(`   ID: ${profile.id}`)
    console.log(`   Clerk ID: ${profile.clerk_user_id}`)
    console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`)
    console.log(`   Sessions: ${sessions?.length || 0} total (${completed} completed, ${incomplete} incomplete)`)
    console.log(`   Study time: ${totalMinutes} minutes (${Math.round(totalMinutes / 60)} hours)`)
    console.log()
  }
}

main().catch(console.error)
