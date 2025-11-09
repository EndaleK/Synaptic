/**
 * API Route: Exam CRUD Operations
 *
 * GET /api/exams - Fetch all exams for user
 * POST /api/exams - Create a new exam
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import type { ExamInsert } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Initialize Supabase client
    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. Get query params for filtering
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const limit = searchParams.get('limit')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const isTemplate = searchParams.get('isTemplate')
    const includeAttempts = searchParams.get('includeAttempts') === 'true'

    // 4. Build query
    let query = supabase
      .from('exams')
      .select(`
        *,
        documents:document_id (
          id,
          file_name,
          file_type
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    if (isTemplate !== null && isTemplate !== undefined) {
      query = query.eq('is_template', isTemplate === 'true')
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    // 5. Fetch exams
    const { data: exams, error: examsError } = await query

    if (examsError) {
      logger.error('Error fetching exams', examsError, { userId })
      return NextResponse.json(
        { error: 'Failed to fetch exams' },
        { status: 500 }
      )
    }

    logger.debug('Fetched exams', { userId, count: exams?.length || 0 })

    // 6. If includeAttempts, fetch attempt statistics for each exam
    let examsWithAttempts = exams || []

    if (includeAttempts && exams && exams.length > 0) {
      const examIds = exams.map(e => e.id)

      // Fetch all attempts for these exams
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('*')
        .in('exam_id', examIds)
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      // Calculate statistics for each exam
      examsWithAttempts = exams.map(exam => {
        const examAttempts = attempts?.filter(a => a.exam_id === exam.id) || []

        const attemptCount = examAttempts.length
        const bestScore = attemptCount > 0
          ? Math.max(...examAttempts.map(a => a.score || 0))
          : undefined
        const latestAttempt = examAttempts.length > 0 ? examAttempts[0] : undefined

        return {
          ...exam,
          attempt_count: attemptCount,
          best_score: bestScore,
          latest_attempt: latestAttempt
        }
      })
    }

    return NextResponse.json({
      exams: examsWithAttempts
    })

  } catch (error) {
    logger.error('GET /api/exams error', error, { userId })
    return NextResponse.json(
      {
        error: 'Failed to fetch exams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Initialize Supabase client
    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. Parse request body
    const body = await request.json()
    const {
      title,
      description,
      document_id,
      question_source,
      question_count,
      difficulty = 'mixed',
      time_limit_minutes,
      is_template = false,
      tags = []
    } = body

    // 4. Validate required fields
    if (!title || !question_source || !question_count) {
      return NextResponse.json(
        { error: 'Missing required fields: title, question_source, question_count' },
        { status: 400 }
      )
    }

    // Validate question source requires document_id for certain sources
    if ((question_source === 'document' || question_source === 'flashcards') && !document_id) {
      return NextResponse.json(
        { error: 'document_id is required for document and flashcards question sources' },
        { status: 400 }
      )
    }

    // If document_id provided, verify ownership
    if (document_id) {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, user_id')
        .eq('id', document_id)
        .eq('user_id', profile.id)
        .single()

      if (docError || !document) {
        return NextResponse.json(
          { error: 'Document not found or access denied' },
          { status: 404 }
        )
      }
    }

    // 5. Create exam record
    const examData: ExamInsert = {
      user_id: profile.id,
      title,
      description: description || null,
      document_id: document_id || null,
      question_source,
      question_count,
      difficulty,
      time_limit_minutes: time_limit_minutes || null,
      is_template,
      tags: tags || []
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert(examData)
      .select()
      .single()

    if (examError || !exam) {
      logger.error('Failed to create exam', examError, { userId, title })
      return NextResponse.json(
        { error: 'Failed to create exam' },
        { status: 500 }
      )
    }

    logger.info('Exam created', { userId, examId: exam.id, title })

    return NextResponse.json({
      exam,
      message: 'Exam created successfully'
    })

  } catch (error) {
    logger.error('POST /api/exams error', error, { userId })
    return NextResponse.json(
      {
        error: 'Failed to create exam',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
