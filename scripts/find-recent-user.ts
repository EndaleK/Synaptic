/**
 * Find which user has the most recent activity
 * Run with: npx tsx scripts/find-recent-user.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔍 Finding user with most recent activity...\n')

  // Get the most recent session
  const { data: recentSession } = await supabase
    .from('study_sessions')
    .select('user_id, start_time, session_type, completed')
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (!recentSession) {
    console.log('⚠️  No sessions found!')
    return
  }

  // Get the user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', recentSession.user_id)
    .single()

  if (!profile) {
    console.log('⚠️  User profile not found!')
    return
  }

  console.log('👤 Most recent user activity:')
  console.log(`   Email: ${profile.email || 'N/A'}`)
  console.log(`   Clerk ID: ${profile.clerk_user_id}`)
  console.log(`   User ID: ${profile.id}`)
  console.log(`   Last activity: ${new Date(recentSession.start_time).toLocaleString()}`)
  console.log(`   Session type: ${recentSession.session_type}`)
  console.log(`   Status: ${recentSession.completed ? 'Completed' : 'Incomplete'}`)

  // Get all sessions for this user
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('completed, duration_minutes')
    .eq('user_id', recentSession.user_id)

  const completed = sessions?.filter(s => s.completed).length || 0
  const totalMinutes = sessions?.filter(s => s.completed).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0

  console.log(`\n📊 This user's statistics:`)
  console.log(`   Total sessions: ${sessions?.length || 0}`)
  console.log(`   Completed: ${completed}`)
  console.log(`   Total study time: ${totalMinutes} minutes (${Math.round(totalMinutes / 60)} hours)`)
  console.log(`   Average session: ${completed > 0 ? Math.round(totalMinutes / completed) : 0} minutes`)

  console.log(`\n💡 This is the user who should see data on production.`)
  console.log(`   If you're logged in as a different user, that would explain the 0's.`)
}

main().catch(console.error)
