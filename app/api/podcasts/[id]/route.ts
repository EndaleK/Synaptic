/**
 * API Route: DELETE /api/podcasts/[id]
 *
 * Deletes a podcast by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { validateUUIDParam } from '@/lib/validation/uuid'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: podcastId } = await params

    // Validate UUID format
    try {
      validateUUIDParam(podcastId, 'podcast ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid podcast ID format' },
        { status: 400 }
      )
    }

    // 2. Get user profile
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. Verify podcast belongs to user
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('id, user_id')
      .eq('id', podcastId)
      .eq('user_id', profile.id) // Use query filter instead of post-check
      .single()

    if (fetchError || !podcast) {
      logger.warn('Podcast not found for deletion or access denied', {
        userId,
        podcastId,
        profileId: profile.id,
        error: fetchError?.message
      })
      return NextResponse.json({
        error: 'Podcast not found or access denied'
      }, { status: 404 })
    }

    // 4. Delete podcast
    const { error: deleteError } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', podcastId)

    if (deleteError) {
      logger.error('Failed to delete podcast', deleteError, { userId, podcastId })
      return NextResponse.json(
        { error: 'Failed to delete podcast' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.info('Podcast deleted successfully', { userId, podcastId, duration })

    return NextResponse.json({
      success: true,
      message: 'Podcast deleted successfully'
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('DELETE /api/podcasts/[id] error', error, { duration })
    return NextResponse.json(
      {
        error: 'Failed to delete podcast',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
