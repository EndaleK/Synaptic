/**
 * Test script to complete open sessions and verify statistics
 * Run with: npx tsx scripts/test-session-completion.ts
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

  console.log('🔍 Finding incomplete sessions...\n')

  // Get all incomplete sessions
  const { data: incompleteSessions, error: fetchError } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('completed', false)
    .order('start_time', { ascending: false })

  if (fetchError) {
    console.error('❌ Error fetching sessions:', fetchError)
    return
  }

  console.log(`Found ${incompleteSessions?.length || 0} incomplete sessions\n`)

  if (incompleteSessions && incompleteSessions.length > 0) {
    console.log('📝 Completing open sessions...\n')

    for (const session of incompleteSessions) {
      const startTime = new Date(session.start_time)
      const now = new Date()
      const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000)

      console.log(`  Session ${session.id} (${session.session_type}):`)
      console.log(`    Started: ${startTime.toISOString()}`)
      console.log(`    Duration: ${durationMinutes} minutes`)

      const { error: updateError } = await supabase
        .from('study_sessions')
        .update({
          end_time: now.toISOString(),
          duration_minutes: durationMinutes,
          completed: true
        })
        .eq('id', session.id)

      if (updateError) {
        console.log(`    ❌ Error: ${updateError.message}`)
      } else {
        console.log(`    ✅ Completed`)
      }
      console.log()
    }
  }

  // Get summary of all sessions
  const { data: allSessions, error: summaryError } = await supabase
    .from('study_sessions')
    .select('completed')

  if (!summaryError && allSessions) {
    const completed = allSessions.filter(s => s.completed).length
    const incomplete = allSessions.filter(s => !s.completed).length
    console.log('\n📊 Session Summary:')
    console.log(`  Total: ${allSessions.length}`)
    console.log(`  Completed: ${completed}`)
    console.log(`  Incomplete: ${incomplete}`)
  }

  console.log('\n✨ Done! Your statistics should now show data.')
}

main().catch(console.error)
