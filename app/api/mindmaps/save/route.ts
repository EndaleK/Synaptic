import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const maxDuration = 30

/**
 * POST /api/mindmaps/save
 * Save a generated mind map to the database
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
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

    // Parse request body
    const body = await req.json()
    const { documentId, title, mapType, nodes, edges, layoutData, documentText } = body

    // Validate required fields
    if (!documentId || !title || !mapType || !nodes || !edges) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, title, mapType, nodes, edges' },
        { status: 400 }
      )
    }

    // Validate mapType
    const validMapTypes = ['hierarchical', 'radial', 'concept']
    if (!validMapTypes.includes(mapType)) {
      return NextResponse.json(
        { error: `Invalid mapType. Must be one of: ${validMapTypes.join(', ')}` },
        { status: 400 }
      )
    }

    logger.debug('Saving mind map to database', {
      userId,
      documentId,
      title,
      mapType,
      nodeCount: nodes.length,
      edgeCount: edges.length
    })

    // Save to database
    const { data: savedMindMap, error: dbError} = await supabase
      .from('mindmaps')
      .insert({
        user_id: profile.id,
        document_id: documentId,
        title,
        map_type: mapType,
        nodes,
        edges,
        layout_data: layoutData || {},
        document_text: documentText || null // Include document text for node expansion feature
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Database save error for mind map', dbError, {
        userId,
        documentId,
        userProfileId: profile.id,
        userProfileIdType: typeof profile.id,
        errorCode: dbError.code,
        errorMessage: dbError.message,
        errorDetails: dbError.details,
        errorHint: dbError.hint
      })
      // Also log to console for immediate visibility
      console.error('❌ Mind map save error:', {
        errorCode: dbError.code,
        errorMessage: dbError.message,
        userProfileId: profile.id,
        documentId
      })
      return NextResponse.json(
        { error: 'Failed to save mind map to database', details: dbError.message },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/mindmaps/save', 200, duration, {
      userId,
      documentId,
      mindMapId: savedMindMap.id,
      mapType,
      nodeCount: nodes.length
    })

    return NextResponse.json({
      success: true,
      mindMap: savedMindMap
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Mind map save error', error, { duration: `${duration}ms` })

    return NextResponse.json(
      { error: error?.message || 'Failed to save mind map' },
      { status: 500 }
    )
  }
}
