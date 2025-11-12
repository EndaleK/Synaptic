/**
 * API Route: GET /api/mindmaps
 *
 * Retrieves existing mind maps for a user
 * Query params:
 * - documentId (optional): Filter by specific document
 * - limit (optional): Number of results (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 3. Get user profile
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 4. Build query (without join to avoid schema cache issues)
    let query = supabase
      .from('mindmaps')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by document if specified
    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data: mindmaps, error: mindmapsError } = await query

    if (mindmapsError) {
      console.error('Failed to fetch mind maps:', mindmapsError)
      return NextResponse.json(
        { error: 'Failed to fetch mind maps', details: mindmapsError.message },
        { status: 500 }
      )
    }

    // 5. Calculate statistics for each mind map
    const mindmapsWithStats = mindmaps?.map(mindmap => ({
      ...mindmap,
      nodeCount: Array.isArray(mindmap.nodes) ? mindmap.nodes.length : 0,
      edgeCount: Array.isArray(mindmap.edges) ? mindmap.edges.length : 0
    })) || []

    return NextResponse.json({
      success: true,
      mindmaps: mindmapsWithStats,
      count: mindmapsWithStats.length,
      documentId: documentId || null
    })

  } catch (error) {
    console.error('Mind maps GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch mind maps',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
