/**
 * Debug script to check production sessions
 * Run with: npx tsx scripts/check-production-sessions.ts
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

  console.log('🔍 Checking production database sessions...\n')

  // Get all sessions (completed and incomplete)
  const { data: allSessions, error: allError } = await supabase
    .from('study_sessions')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(50)

  if (allError) {
    console.error('❌ Error fetching sessions:', allError)
    return
  }

  console.log(`📊 Total sessions in database: ${allSessions?.length || 0}\n`)

  if (allSessions && allSessions.length > 0) {
    // Group by completion status
    const completed = allSessions.filter(s => s.completed)
    const incomplete = allSessions.filter(s => !s.completed)

    console.log(`✅ Completed sessions: ${completed.length}`)
    console.log(`⏸️  Incomplete sessions: ${incomplete.length}\n`)

    // Show recent sessions
    console.log('📋 Last 10 sessions:')
    allSessions.slice(0, 10).forEach((session, idx) => {
      const status = session.completed ? '✅' : '⏸️ '
      const duration = session.duration_minutes || 'N/A'
      const startDate = new Date(session.start_time).toLocaleString()
      console.log(`  ${idx + 1}. ${status} ${session.session_type} - ${duration}min - ${startDate}`)
    })

    // Check date ranges
    if (completed.length > 0) {
      const dates = completed.map(s => new Date(s.start_time))
      const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
      const latest = new Date(Math.max(...dates.map(d => d.getTime())))

      console.log(`\n📅 Completed sessions date range:`)
      console.log(`   Earliest: ${earliest.toLocaleDateString()}`)
      console.log(`   Latest: ${latest.toLocaleDateString()}`)
      console.log(`   Today: ${new Date().toLocaleDateString()}`)
    }

    // Calculate stats
    if (completed.length > 0) {
      const totalMinutes = completed.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
      const avgMinutes = Math.round(totalMinutes / completed.length)
      console.log(`\n📈 Statistics:`)
      console.log(`   Total study time: ${totalMinutes} minutes (${Math.round(totalMinutes / 60)} hours)`)
      console.log(`   Average session: ${avgMinutes} minutes`)
    }

    // Check for unrealistic durations
    const unrealistic = completed.filter(s => s.duration_minutes && s.duration_minutes > 120)
    if (unrealistic.length > 0) {
      console.log(`\n⚠️  Found ${unrealistic.length} sessions with >120 minutes (may need recalculation)`)
    }

  } else {
    console.log('ℹ️  No sessions found in database')
  }
}

main().catch(console.error)
