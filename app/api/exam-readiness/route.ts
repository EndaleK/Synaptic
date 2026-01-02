import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateExamReadiness,
  saveReadinessSnapshot
} from '@/lib/exam-readiness-calculator'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * GET /api/exam-readiness
 * Calculate and return exam readiness score with factors
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const examId = searchParams.get('examId') || undefined
    const documentId = searchParams.get('documentId') || undefined

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Calculate readiness
    const result = await calculateExamReadiness(supabase, {
      userId: profile.id,
      examId,
      documentId
    })

    // Save snapshot for trend tracking (async, don't wait)
    saveReadinessSnapshot(supabase, profile.id, result, examId).catch(err => {
      console.error('Failed to save readiness snapshot:', err)
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating exam readiness:', error)
    return NextResponse.json(
      { error: 'Failed to calculate exam readiness' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/exam-readiness/history
 * Get historical readiness scores for trend visualization
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { examId, days = 30 } = body

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch historical snapshots
    let query = supabase
      .from('exam_readiness_snapshots')
      .select('readiness_score, calculated_at, factors')
      .eq('user_id', profile.id)
      .gte('calculated_at', startDate.toISOString())
      .order('calculated_at', { ascending: true })

    if (examId) {
      query = query.eq('exam_id', examId)
    }

    const { data: snapshots, error } = await query

    if (error) {
      console.error('Error fetching readiness history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch readiness history' },
        { status: 500 }
      )
    }

    // Format for chart visualization
    const history = (snapshots || []).map(snapshot => ({
      date: snapshot.calculated_at,
      score: snapshot.readiness_score,
      factors: snapshot.factors
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching exam readiness history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch readiness history' },
      { status: 500 }
    )
  }
}
