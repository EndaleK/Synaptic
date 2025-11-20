/**
 * Test script to debug statistics API
 * Run with: npx tsx scripts/test-statistics-api.ts
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

  console.log('🔍 Testing statistics calculation...\n')

  // Get all completed sessions
  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('start_time, duration_minutes, completed, session_type')
    .eq('completed', true)
    .order('start_time', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`📊 Total completed sessions: ${sessions?.length || 0}\n`)

  if (!sessions || sessions.length === 0) {
    console.log('⚠️  No completed sessions found!')
    return
  }

  // Simulate what the API does with timezone offset
  const timezoneOffset = -420 // PST (UTC-7)
  const now = new Date()
  const userNow = new Date(now.getTime() + timezoneOffset * 60000)
  const todayStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate()))

  console.log('🕐 Date calculations:')
  console.log(`   Server now (UTC): ${now.toISOString()}`)
  console.log(`   User now (with offset): ${userNow.toISOString()}`)
  console.log(`   Today start (UTC): ${todayStart.toISOString()}`)

  // Calculate week and month ranges
  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())

  const monthStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), 1))

  console.log(`   Week start: ${weekStart.toISOString()}`)
  console.log(`   Month start: ${monthStart.toISOString()}\n`)

  // Filter sessions by time range
  const todaySessions = sessions.filter(s => new Date(s.start_time) >= todayStart)
  const weekSessions = sessions.filter(s => new Date(s.start_time) >= weekStart)
  const monthSessions = sessions.filter(s => new Date(s.start_time) >= monthStart)

  console.log('📈 Session counts:')
  console.log(`   Today: ${todaySessions.length}`)
  console.log(`   This week: ${weekSessions.length}`)
  console.log(`   This month: ${monthSessions.length}\n`)

  // Calculate statistics
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const monthMinutes = monthSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  console.log('⏱️  Total minutes:')
  console.log(`   All time: ${totalMinutes} min`)
  console.log(`   Today: ${todayMinutes} min`)
  console.log(`   This week: ${weekMinutes} min`)
  console.log(`   This month: ${monthMinutes} min\n`)

  // Show recent sessions with dates
  console.log('📋 Recent sessions (last 10):')
  sessions.slice(0, 10).forEach((s, idx) => {
    const date = new Date(s.start_time)
    const isToday = date >= todayStart
    const marker = isToday ? '📍' : '  '
    console.log(`   ${marker} ${date.toLocaleString()} - ${s.session_type} - ${s.duration_minutes}min`)
  })

  // Check heatmap data
  const heatmapDays = 7
  const heatmapStart = new Date(todayStart)
  heatmapStart.setUTCDate(heatmapStart.getUTCDate() - heatmapDays + 1)

  console.log(`\n📅 Heatmap range (last ${heatmapDays} days):`)
  console.log(`   Start: ${heatmapStart.toISOString()}`)
  console.log(`   End: ${todayStart.toISOString()}`)

  const heatmapSessions = sessions.filter(s => new Date(s.start_time) >= heatmapStart)
  console.log(`   Sessions in range: ${heatmapSessions.length}`)
}

main().catch(console.error)
