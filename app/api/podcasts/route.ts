/**
 * API Route: GET /api/podcasts
 *
 * Retrieves existing podcasts for a user
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

    // 4. Build query with documents join for file_name
    let query = supabase
      .from('podcasts')
      .select('*, documents(file_name)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by document if specified
    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data: podcasts, error: podcastsError } = await query

    if (podcastsError) {
      console.error('Failed to fetch podcasts:', podcastsError)
      return NextResponse.json(
        { error: 'Failed to fetch podcasts', details: podcastsError.message },
        { status: 500 }
      )
    }

    // 5. Parse script JSON for each podcast (with error handling)
    const podcastsWithParsedScript = podcasts?.map(podcast => {
      try {
        return {
          ...podcast,
          script: typeof podcast.script === 'string' && podcast.script
            ? JSON.parse(podcast.script)
            : podcast.script || null
        }
      } catch (parseError) {
        console.warn('Failed to parse podcast script for podcast', podcast.id, parseError)
        return {
          ...podcast,
          script: null // Return null if parsing fails
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      podcasts: podcastsWithParsedScript,
      count: podcastsWithParsedScript.length,
      documentId: documentId || null
    })

  } catch (error) {
    console.error('Podcasts GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch podcasts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
