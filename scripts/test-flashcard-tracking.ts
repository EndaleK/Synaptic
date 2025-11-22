/**
 * Test flashcard session tracking
 * Run with: npx tsx scripts/test-flashcard-tracking.ts
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

  console.log('🔍 Testing Flashcard Session Tracking...\n')

  // Get first user profile
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, email, clerk_user_id')
    .limit(1)

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No user profiles found!')
    return
  }

  const userProfileId = profiles[0].id
  console.log(`👤 Testing for user: ${profiles[0].email || profiles[0].clerk_user_id}\n`)

  // Check for 'review' type sessions (flashcards)
  const { data: reviewSessions, error: reviewError } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userProfileId)
    .eq('session_type', 'review')
    .order('start_time', { ascending: false })
    .limit(10)

  console.log('📊 Recent Flashcard Review Sessions (session_type = "review"):\n')

  if (reviewError) {
    console.error('❌ Error:', reviewError.message)
    return
  }

  if (!reviewSessions || reviewSessions.length === 0) {
    console.log('⚠️  No flashcard review sessions found!')
    console.log('\nPossible reasons:')
    console.log('1. User has not reviewed flashcards yet')
    console.log('2. Sessions are not being created (API issue)')
    console.log('3. Sessions are not being completed (completion API issue)')
    return
  }

  console.log(`Found ${reviewSessions.length} flashcard review sessions:\n`)

  reviewSessions.forEach((session, idx) => {
    const startTime = new Date(session.start_time)
    const endTime = session.end_time ? new Date(session.end_time) : null
    const duration = session.duration_minutes || 0
    const completed = session.completed ? '✅' : '⏳'

    console.log(`${idx + 1}. ${completed} Session ID: ${session.id}`)
    console.log(`   Started: ${startTime.toLocaleString()}`)
    console.log(`   Ended: ${endTime ? endTime.toLocaleString() : 'In progress'}`)
    console.log(`   Duration: ${duration} minutes`)
    console.log(`   Completed: ${session.completed}`)
    console.log(`   Document ID: ${session.document_id || 'N/A'}`)
    console.log('')
  })

  // Check statistics calculation
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentSessions } = await supabase
    .from('study_sessions')
    .select('start_time, duration_minutes, session_type, completed')
    .eq('user_id', userProfileId)
    .eq('completed', true)
    .gte('start_time', thirtyDaysAgo.toISOString())
    .order('start_time', { ascending: false })

  console.log('📈 Last 30 Days Summary:\n')

  if (!recentSessions || recentSessions.length === 0) {
    console.log('⚠️  No completed sessions in last 30 days')
    return
  }

  const reviewSessionsCount = recentSessions.filter(s => s.session_type === 'review').length
  const reviewMinutes = recentSessions
    .filter(s => s.session_type === 'review')
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  const totalSessionsCount = recentSessions.length
  const totalMinutes = recentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  console.log(`Total Sessions: ${totalSessionsCount}`)
  console.log(`Total Minutes: ${totalMinutes}`)
  console.log('')
  console.log(`Flashcard Review Sessions: ${reviewSessionsCount}`)
  console.log(`Flashcard Review Minutes: ${reviewMinutes}`)
  console.log('')

  // Session types breakdown
  const sessionTypeBreakdown = recentSessions.reduce((acc, s) => {
    const type = s.session_type || 'unknown'
    if (!acc[type]) {
      acc[type] = { count: 0, minutes: 0 }
    }
    acc[type].count++
    acc[type].minutes += s.duration_minutes || 0
    return acc
  }, {} as Record<string, { count: number, minutes: number }>)

  console.log('Session Types Breakdown:')
  Object.entries(sessionTypeBreakdown).forEach(([type, stats]) => {
    console.log(`  ${type}: ${stats.count} sessions, ${stats.minutes} minutes`)
  })

  // Check if sessions are being included in statistics API
  console.log('\n🔍 Verifying Statistics API Data...\n')

  // Calculate heatmap data (last 30 days)
  const now = new Date()
  const timezoneOffset = -420 // PST (adjust as needed)
  const userNow = new Date(now.getTime() + timezoneOffset * 60000)
  const todayStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate()))

  const heatmapDays = 30
  const heatmapStart = new Date(todayStart)
  heatmapStart.setUTCDate(heatmapStart.getUTCDate() - heatmapDays + 1)

  // Create date map
  const dateMap = new Map<string, number>()
  recentSessions.forEach(session => {
    const date = new Date(session.start_time).toISOString().split('T')[0]
    if (new Date(session.start_time) >= heatmapStart) {
      dateMap.set(date, (dateMap.get(date) || 0) + (session.duration_minutes || 0))
    }
  })

  // Build heatmap array
  const heatmapData: Array<{ date: string, minutes: number, hasReview: boolean }> = []
  for (let i = 0; i < heatmapDays; i++) {
    const date = new Date(heatmapStart)
    date.setUTCDate(date.getUTCDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const dayMinutes = dateMap.get(dateStr) || 0

    // Check if this day has review sessions
    const hasReview = recentSessions.some(s => {
      const sessionDate = new Date(s.start_time).toISOString().split('T')[0]
      return sessionDate === dateStr && s.session_type === 'review'
    })

    heatmapData.push({
      date: dateStr,
      minutes: dayMinutes,
      hasReview
    })
  }

  // Show days with flashcard activity
  const daysWithFlashcards = heatmapData.filter(d => d.hasReview)

  console.log(`Days with flashcard activity: ${daysWithFlashcards.length}`)
  console.log('')

  if (daysWithFlashcards.length > 0) {
    console.log('Recent days with flashcard reviews:')
    daysWithFlashcards.slice(-7).forEach(d => {
      console.log(`  ${d.date}: ${d.minutes} minutes`)
    })
  }

  console.log('\n✅ Diagnostic complete!')
  console.log('\nIf flashcard sessions show 0 minutes, possible causes:')
  console.log('1. Sessions are being created but not completed')
  console.log('2. Duration is not being recorded correctly')
  console.log('3. Session completion API is failing silently')
}

main().catch(console.error)
