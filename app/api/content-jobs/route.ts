/**
 * API Route: GET /api/content-jobs
 *
 * Returns content generation jobs for the authenticated user.
 *
 * Query params:
 * - documentId: Filter by specific document
 * - status: Filter by job status (pending, processing, completed, failed)
 * - limit: Max number of jobs to return (default 20)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')
    const status = searchParams.get('status')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10), 1), 100)

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

    // Build query
    let query = supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('user_id', profile.id)
      .order('queued_at', { ascending: false })
      .limit(limit)

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      console.error('[ContentJobs] Error fetching jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    // Transform to camelCase
    const transformedJobs = (jobs || []).map((job) => ({
      id: job.id,
      documentId: job.document_id,
      userId: job.user_id,
      contentType: job.content_type,
      status: job.status,
      progressPercent: job.progress_percent,
      resultId: job.result_id,
      errorMessage: job.error_message,
      queuedAt: job.queued_at,
      completedAt: job.completed_at,
    }))

    return NextResponse.json({
      jobs: transformedJobs,
      total: transformedJobs.length,
    })
  } catch (error) {
    console.error('[ContentJobs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get content jobs' },
      { status: 500 }
    )
  }
}
