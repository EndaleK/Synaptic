/**
 * Show what statistics should display for a specific user
 * Run with: npx tsx scripts/show-user-stats.ts <user_id>
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const userId = process.argv[2] || '3' // Default to user 3 (most active)

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log(`🔍 Showing statistics for user ID: ${userId}\n`)

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    console.log('⚠️  User not found!')
    return
  }

  console.log('👤 User Profile:')
  console.log(`   Email: ${profile.email || 'N/A'}`)
  console.log(`   Clerk ID: ${profile.clerk_user_id}\n`)

  // Get all completed sessions
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('start_time, duration_minutes, session_type')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('start_time', { ascending: false })

  if (!sessions || sessions.length === 0) {
    console.log('⚠️  No completed sessions for this user!')
    console.log('   This user would see 0 on the statistics page.\n')
    return
  }

  console.log(`📊 Total completed sessions: ${sessions.length}\n`)

  // Calculate date ranges (PST timezone offset)
  const timezoneOffset = -420
  const now = new Date()
  const userNow = new Date(now.getTime() + timezoneOffset * 60000)
  const todayStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate()))
  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
  const monthStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), 1))

  // Filter sessions
  const todaySessions = sessions.filter(s => new Date(s.start_time) >= todayStart)
  const weekSessions = sessions.filter(s => new Date(s.start_time) >= weekStart)
  const monthSessions = sessions.filter(s => new Date(s.start_time) >= monthStart)

  // Calculate minutes
  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const monthMinutes = monthSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  console.log('📈 What this user should see:')
  console.log(`\n   Today:`)
  console.log(`     Sessions: ${todaySessions.length}`)
  console.log(`     Total time: ${todayMinutes} minutes`)
  console.log(`     Average: ${todaySessions.length > 0 ? Math.round(todayMinutes / todaySessions.length) : 0} min/session`)

  console.log(`\n   This Week:`)
  console.log(`     Sessions: ${weekSessions.length}`)
  console.log(`     Total time: ${weekMinutes} minutes (${Math.round(weekMinutes / 60)} hours)`)

  console.log(`\n   This Month:`)
  console.log(`     Sessions: ${monthSessions.length}`)
  console.log(`     Total time: ${monthMinutes} minutes (${Math.round(monthMinutes / 60)} hours)`)

  console.log(`\n   All Time:`)
  console.log(`     Sessions: ${sessions.length}`)
  console.log(`     Total time: ${totalMinutes} minutes (${Math.round(totalMinutes / 60)} hours)`)
  console.log(`     Average: ${Math.round(totalMinutes / sessions.length)} min/session`)

  // Show recent sessions
  console.log(`\n📋 Recent sessions (last 5):`)
  sessions.slice(0, 5).forEach((s, idx) => {
    const date = new Date(s.start_time)
    console.log(`   ${idx + 1}. ${date.toLocaleString()} - ${s.session_type} - ${s.duration_minutes}min`)
  })
}

main().catch(console.error)
