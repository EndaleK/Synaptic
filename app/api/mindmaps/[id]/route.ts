/**
 * API Route: /api/mindmaps/[id]
 *
 * GET: Fetch a specific mind map
 * PATCH: Update a mind map (for saving manual edits)
 * DELETE: Delete a mindmap by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { validateUUIDParam } from '@/lib/validation/uuid'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mindmapId } = await params

    // Validate UUID format
    try {
      validateUUIDParam(mindmapId, 'mindmap ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid mindmap ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: mindmap, error } = await supabase
      .from('mindmaps')
      .select(`
        *,
        documents (
          id,
          file_name,
          file_type
        )
      `)
      .eq('id', mindmapId)
      .eq('user_id', profile.id)
      .single()

    if (error || !mindmap) {
      logger.warn('Mind map not found', { userId, mindmapId, error: error?.message })
      return NextResponse.json({ error: 'Mind map not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, mindmap })
  } catch (error) {
    logger.error('GET /api/mindmaps/[id] error', error)
    return NextResponse.json(
      { error: 'Failed to fetch mind map' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mindmapId } = await params

    // Validate UUID format
    try {
      validateUUIDParam(mindmapId, 'mindmap ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid mindmap ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('mindmaps')
      .select('id')
      .eq('id', mindmapId)
      .eq('user_id', profile.id)
      .single()

    if (!existing) {
      logger.warn('Mind map not found for update or access denied', { userId, mindmapId })
      return NextResponse.json({ error: 'Mind map not found' }, { status: 404 })
    }

    // Update mind map
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.nodes !== undefined) updateData.nodes = body.nodes
    if (body.edges !== undefined) updateData.edges = body.edges
    if (body.layout_data !== undefined) updateData.layout_data = body.layout_data

    const { data: updated, error } = await supabase
      .from('mindmaps')
      .update(updateData)
      .eq('id', mindmapId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error) {
      logger.error('Mind map update error', error, { userId, mindmapId })
      return NextResponse.json({ error: 'Failed to update mind map' }, { status: 500 })
    }

    const duration = Date.now() - startTime
    logger.info('Mind map updated successfully', { userId, mindmapId, duration })

    return NextResponse.json({ success: true, mindmap: updated })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('PATCH /api/mindmaps/[id] error', error, { duration })
    return NextResponse.json(
      { error: 'Failed to update mind map' },
      { status: 500 }
    )
  }
}

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

    const { id: mindmapId } = await params

    // Validate UUID format
    try {
      validateUUIDParam(mindmapId, 'mindmap ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid mindmap ID format' },
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

    // 3. Verify mindmap belongs to user
    const { data: mindmap, error: fetchError } = await supabase
      .from('mindmaps')
      .select('id, user_id')
      .eq('id', mindmapId)
      .eq('user_id', profile.id) // Use query filter instead of post-check
      .single()

    if (fetchError || !mindmap) {
      logger.warn('Mindmap not found for deletion or access denied', {
        userId,
        mindmapId,
        profileId: profile.id,
        error: fetchError?.message
      })
      return NextResponse.json({
        error: 'Mind map not found or access denied'
      }, { status: 404 })
    }

    // 4. Delete mindmap
    const { error: deleteError } = await supabase
      .from('mindmaps')
      .delete()
      .eq('id', mindmapId)

    if (deleteError) {
      logger.error('Failed to delete mindmap', deleteError, { userId, mindmapId })
      return NextResponse.json(
        { error: 'Failed to delete mindmap' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.info('Mindmap deleted successfully', { userId, mindmapId, duration })

    return NextResponse.json({
      success: true,
      message: 'Mindmap deleted successfully'
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('DELETE /api/mindmaps/[id] error', error, { duration })
    return NextResponse.json(
      {
        error: 'Failed to delete mindmap',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
