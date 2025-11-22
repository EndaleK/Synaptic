/**
 * Check flashcard count for specific user
 * Run with: npx tsx scripts/check-flashcard-count.ts
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

  const clerkUserId = 'user_34FCZFApy9IN42J8qq66C6814Tr'

  console.log('🔍 Checking flashcard data for current user...\n')

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, clerk_user_id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (profileError || !profile) {
    console.log('❌ Profile not found for:', clerkUserId)
    console.log('Error:', profileError?.message)
    return
  }

  console.log(`👤 User: ${profile.email}`)
  console.log(`📋 Profile ID: ${profile.id}\n`)

  // Count total flashcards
  const { count: totalFlashcards, error: countError } = await supabase
    .from('flashcards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)

  if (countError) {
    console.log('❌ Error counting flashcards:', countError.message)
    return
  }

  console.log(`🃏 Total flashcards in database: ${totalFlashcards}\n`)

  // Get flashcards grouped by document
  const { data: flashcards } = await supabase
    .from('flashcards')
    .select('id, document_id, question, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (flashcards && flashcards.length > 0) {
    // Group by document
    const byDocument = flashcards.reduce((acc: any, f: any) => {
      const docId = f.document_id || 'no-document'
      if (!acc[docId]) {
        acc[docId] = []
      }
      acc[docId].push(f)
      return acc
    }, {})

    console.log('📚 Flashcards by document:\n')
    Object.entries(byDocument).forEach(([docId, cards]: [string, any]) => {
      console.log(`  Document ${docId}:`)
      console.log(`    ${cards.length} flashcards`)
      console.log(`    Most recent: ${new Date(cards[0].created_at).toLocaleString()}`)
      console.log('')
    })
  }

  // Check usage widget calculation
  console.log('🔢 Usage Widget Check:\n')

  // Get documents
  const { count: documentsCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)

  console.log(`Documents: ${documentsCount}`)

  // Get flashcard sets (might be different from individual flashcards)
  const { data: flashcardSets } = await supabase
    .from('flashcards')
    .select('document_id')
    .eq('user_id', profile.id)

  const uniqueDocuments = new Set(flashcardSets?.map(f => f.document_id).filter(Boolean))
  console.log(`Flashcard sets (unique documents with flashcards): ${uniqueDocuments.size}`)
  console.log(`Total flashcard cards: ${totalFlashcards}`)

  // Check review sessions
  console.log('\n📊 Recent Flashcard Review Sessions:\n')

  const { data: reviewSessions } = await supabase
    .from('study_sessions')
    .select('id, start_time, end_time, duration_minutes, completed')
    .eq('user_id', profile.id)
    .eq('session_type', 'review')
    .order('start_time', { ascending: false })
    .limit(10)

  if (!reviewSessions || reviewSessions.length === 0) {
    console.log('⚠️  No review sessions found')
  } else {
    reviewSessions.forEach((session, idx) => {
      const completed = session.completed ? '✅' : '⏳'
      const duration = session.duration_minutes || 0
      console.log(`${idx + 1}. ${completed} ${new Date(session.start_time).toLocaleString()} - ${duration} min`)
    })
  }

  // Check if statistics API would show flashcards
  console.log('\n📈 Statistics Summary (Last 30 Days):\n')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentSessions } = await supabase
    .from('study_sessions')
    .select('session_type, duration_minutes')
    .eq('user_id', profile.id)
    .eq('completed', true)
    .gte('start_time', thirtyDaysAgo.toISOString())

  if (recentSessions && recentSessions.length > 0) {
    const modeBreakdown: Record<string, number> = {
      flashcards: 0,
      chat: 0,
      mindmap: 0,
      podcast: 0,
      video: 0,
      writing: 0,
      exam: 0,
      other: 0
    }

    recentSessions.forEach(session => {
      const minutes = session.duration_minutes || 0
      const type = session.session_type

      if (type === 'review') {
        modeBreakdown.flashcards += minutes
      } else if (type === 'chat') {
        modeBreakdown.chat += minutes
      } else if (type === 'mindmap') {
        modeBreakdown.mindmap += minutes
      } else if (type === 'podcast') {
        modeBreakdown.podcast += minutes
      } else if (type === 'video') {
        modeBreakdown.video += minutes
      } else if (type === 'writing') {
        modeBreakdown.writing += minutes
      } else if (type === 'exam') {
        modeBreakdown.exam += minutes
      } else {
        modeBreakdown.other += minutes
      }
    })

    console.log('Mode Breakdown (minutes):')
    Object.entries(modeBreakdown).forEach(([mode, minutes]) => {
      if (minutes > 0) {
        console.log(`  ${mode}: ${minutes} minutes`)
      }
    })
  }

  console.log('\n✅ Diagnostic complete!')
}

main().catch(console.error)
