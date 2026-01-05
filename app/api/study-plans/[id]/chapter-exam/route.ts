/**
 * API Route: /api/study-plans/[id]/chapter-exam
 *
 * GET: Get existing chapter exam
 * POST: Generate a new chapter completion exam
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'
import { generateChapterExam, getChapterExam } from '@/lib/session-exam-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 180 // 3 minutes for comprehensive exam generation

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/study-plans/[id]/chapter-exam
 * Get existing chapter exam
 *
 * Query params:
 * - chapterId: string - The chapter ID
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await context.params
    const { searchParams } = new URL(req.url)
    const chapterId = searchParams.get('chapterId')

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    if (!chapterId) {
      return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })
    }

    try {
      validateUUIDParam(planId, 'plan ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
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

    // Get existing exam
    const exam = await getChapterExam(planId, chapterId, profile.id.toString())

    if (!exam) {
      return NextResponse.json(
        { error: 'No exam found for this chapter' },
        { status: 404 }
      )
    }

    return NextResponse.json(exam)
  } catch (error) {
    console.error('[ChapterExam] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get chapter exam' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study-plans/[id]/chapter-exam
 * Generate a new chapter completion exam
 *
 * Body:
 * - chapterId: string - The chapter ID
 * - chapterTitle: string - The chapter title
 * - questionCount?: number - Number of questions (default: 25, max: 40)
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId } = await context.params
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    try {
      validateUUIDParam(planId, 'plan ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { chapterId, chapterTitle, questionCount = 25 } = body

    if (!chapterId) {
      return NextResponse.json(
        { error: 'chapterId is required' },
        { status: 400 }
      )
    }

    if (!chapterTitle) {
      return NextResponse.json(
        { error: 'chapterTitle is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
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

    // Verify plan ownership
    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('id, title, documents')
      .eq('id', planId)
      .eq('user_id', profile.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Study plan not found' },
        { status: 404 }
      )
    }

    // Check if exam already exists
    const existingExam = await getChapterExam(planId, chapterId, profile.id.toString())
    if (existingExam) {
      return NextResponse.json(existingExam)
    }

    // Get document ID from plan documents or chapter sessions
    const planDocs = plan.documents as Array<{ documentId: string }> | null
    let documentId = planDocs?.[0]?.documentId

    if (!documentId) {
      // Try to get from a session in this chapter
      const { data: session } = await supabase
        .from('study_plan_sessions')
        .select('document_id')
        .eq('plan_id', planId)
        .eq('chapter_id', chapterId)
        .not('document_id', 'is', null)
        .limit(1)
        .single()

      documentId = session?.document_id
    }

    if (!documentId) {
      return NextResponse.json(
        { error: 'No document associated with this chapter' },
        { status: 400 }
      )
    }

    // Generate the exam
    const exam = await generateChapterExam({
      studyPlanId: planId,
      userId: profile.id.toString(),
      chapterId,
      chapterTitle,
      documentId,
      questionCount: Math.min(Math.max(questionCount, 15), 40), // 15-40 questions
    })

    return NextResponse.json(exam)
  } catch (error) {
    console.error('[ChapterExam] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate chapter exam' },
      { status: 500 }
    )
  }
}
