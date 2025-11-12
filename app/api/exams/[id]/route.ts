/**
 * API Route: Individual Exam Operations
 *
 * GET /api/exams/[id] - Fetch single exam with questions
 * PUT /api/exams/[id] - Update exam
 * DELETE /api/exams/[id] - Delete exam (and cascade delete questions/attempts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: examId } = await params

    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 2. Get query params
    const { searchParams } = new URL(request.url)
    const includeQuestions = searchParams.get('includeQuestions') === 'true'
    const includeAttempts = searchParams.get('includeAttempts') === 'true'

    // 3. Fetch exam
    let examSelect = `
      *,
      documents:document_id (
        id,
        file_name,
        file_type,
        file_size
      )
    `

    if (includeQuestions) {
      examSelect += `,
      exam_questions:exam_questions(
        id,
        question_text,
        question_type,
        correct_answer,
        options,
        explanation,
        source_reference,
        difficulty,
        topic,
        tags,
        question_order
      )
      `
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(examSelect)
      .eq('id', examId)
      .eq('user_id', profile.id)
      .single()

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Optionally fetch attempt history
    let attempts = null
    if (includeAttempts) {
      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', profile.id)
        .order('started_at', { ascending: false })

      attempts = attemptsData || []
    }

    logger.debug('Fetched exam', { userId, examId, includeQuestions, includeAttempts })

    return NextResponse.json({
      exam,
      attempts
    })

  } catch (error) {
    logger.error('GET /api/exams/[id] error', error, { userId, examId })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exam' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: examId } = await params

    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 2. Verify exam ownership
    const { data: existingExam } = await supabase
      .from('exams')
      .select('id, user_id')
      .eq('id', examId)
      .eq('user_id', profile.id)
      .single()

    if (!existingExam) {
      return NextResponse.json(
        { error: 'Exam not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Parse update data
    const body = await request.json()
    const {
      title,
      description,
      difficulty,
      time_limit_minutes,
      is_template,
      is_favorited,
      tags
    } = body

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (time_limit_minutes !== undefined) updateData.time_limit_minutes = time_limit_minutes
    if (is_template !== undefined) updateData.is_template = is_template
    if (is_favorited !== undefined) updateData.is_favorited = is_favorited
    if (tags !== undefined) updateData.tags = tags

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      )
    }

    // 4. Update exam
    const { data: updatedExam, error: updateError } = await supabase
      .from('exams')
      .update(updateData)
      .eq('id', examId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update exam', updateError, { userId, examId })
      return NextResponse.json({ error: 'Failed to update exam' }, { status: 500 })
    }

    logger.info('Exam updated', { userId, examId })

    return NextResponse.json({
      exam: updatedExam,
      message: 'Exam updated successfully'
    })

  } catch (error) {
    logger.error('PUT /api/exams/[id] error', error, { userId, examId })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update exam' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: examId } = await params

    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 2. Delete exam (cascade deletes questions, attempts, analytics via DB constraints)
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId)
      .eq('user_id', profile.id)

    if (error) {
      logger.error('Error deleting exam', error, { userId, examId })
      return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 })
    }

    logger.info('Exam deleted', { userId, examId })

    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully (including all questions and attempts)'
    })

  } catch (error) {
    logger.error('DELETE /api/exams/[id] error', error, { userId, examId })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete exam' },
      { status: 500 }
    )
  }
}
