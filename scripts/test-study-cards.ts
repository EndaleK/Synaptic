/**
 * Test study progress cards data
 * Run with: npx tsx scripts/test-study-cards.ts
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

  console.log('🔍 Testing Study Progress Cards Data...\n')

  // Get all user profiles
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

  // Get completed sessions
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('start_time, duration_minutes, session_type, completed')
    .eq('user_id', userProfileId)
    .eq('completed', true)
    .order('start_time', { ascending: false })

  if (!sessions || sessions.length === 0) {
    console.log('❌ No completed sessions found!')
    console.log('   This is why the cards show 0.')
    console.log('   User needs to study to generate data.\n')
    return
  }

  console.log(`📊 Found ${sessions.length} completed sessions\n`)

  // Calculate heatmap data (last 30 days)
  const now = new Date()
  const timezoneOffset = -420 // PST
  const userNow = new Date(now.getTime() + timezoneOffset * 60000)
  const todayStart = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate()))

  const heatmapDays = 30
  const heatmapStart = new Date(todayStart)
  heatmapStart.setUTCDate(heatmapStart.getUTCDate() - heatmapDays + 1)

  // Create date map
  const dateMap = new Map<string, number>()
  sessions.forEach(session => {
    const date = new Date(session.start_time).toISOString().split('T')[0]
    if (new Date(session.start_time) >= heatmapStart) {
      dateMap.set(date, (dateMap.get(date) || 0) + (session.duration_minutes || 0))
    }
  })

  // Build heatmap array
  const heatmapData: Array<{ date: string, minutes: number }> = []
  for (let i = 0; i < heatmapDays; i++) {
    const date = new Date(heatmapStart)
    date.setUTCDate(date.getUTCDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    heatmapData.push({
      date: dateStr,
      minutes: dateMap.get(dateStr) || 0
    })
  }

  // Calculate card values
  const avgMinutes = heatmapData.reduce((sum, d) => sum + d.minutes, 0) / heatmapData.length
  const peakDay = Math.max(...heatmapData.map(d => d.minutes))
  const activeDays = heatmapData.filter(d => d.minutes > 0).length

  console.log('📈 Study Progress Cards Should Show:\n')
  console.log(`   Average: ${Math.round(avgMinutes)} min`)
  console.log(`   Peak Day: ${peakDay} min`)
  console.log(`   Active Days: ${activeDays}`)
  console.log('')

  // Show heatmap breakdown
  console.log('📅 Heatmap Data (last 7 days):')
  heatmapData.slice(-7).forEach(d => {
    const bar = '█'.repeat(Math.min(Math.floor(d.minutes / 10), 20))
    console.log(`   ${d.date}: ${bar} ${d.minutes} min`)
  })

  console.log('\n✅ Cards should be working if these numbers appear on the dashboard!')
  console.log('   If showing 0, check browser console for errors.')
}

main().catch(console.error)
