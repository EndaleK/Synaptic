import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface RecentContentItem {
  id: string
  type: 'document' | 'flashcards' | 'podcast' | 'mindmap' | 'exam'
  title: string
  documentName?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

/**
 * GET /api/recent-content
 * Fetch user's recent content activity across all content types
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userProfileId = profile.id

    // Fetch recent content from multiple tables in parallel
    const [documentsResult, flashcardsResult, podcastsResult, mindmapsResult] = await Promise.all([
      // Recent documents
      supabase
        .from('documents')
        .select('id, file_name, created_at, updated_at')
        .eq('user_id', userProfileId)
        .order('updated_at', { ascending: false })
        .limit(limit),

      // Recent flashcard sets (grouped by document)
      supabase
        .from('flashcards')
        .select('id, document_id, created_at, updated_at, documents(file_name)')
        .eq('user_id', userProfileId)
        .order('updated_at', { ascending: false })
        .limit(limit),

      // Recent podcasts
      supabase
        .from('podcasts')
        .select('id, title, document_id, created_at, updated_at, documents(file_name)')
        .eq('user_id', userProfileId)
        .order('updated_at', { ascending: false })
        .limit(limit),

      // Recent mindmaps
      supabase
        .from('mindmaps')
        .select('id, title, document_id, created_at, updated_at, documents(file_name)')
        .eq('user_id', userProfileId)
        .order('updated_at', { ascending: false })
        .limit(limit),
    ])

    const recentContent: RecentContentItem[] = []

    // Process documents
    if (documentsResult.data) {
      for (const doc of documentsResult.data) {
        recentContent.push({
          id: doc.id,
          type: 'document',
          title: doc.file_name,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
        })
      }
    }

    // Process flashcard sets (deduplicate by document)
    if (flashcardsResult.data) {
      const seenDocuments = new Set<string>()
      for (const fc of flashcardsResult.data) {
        if (fc.document_id && !seenDocuments.has(fc.document_id)) {
          seenDocuments.add(fc.document_id)
          const docData = fc.documents as { file_name: string } | null
          recentContent.push({
            id: fc.document_id,
            type: 'flashcards',
            title: 'Flashcards',
            documentName: docData?.file_name,
            createdAt: fc.created_at,
            updatedAt: fc.updated_at,
          })
        }
      }
    }

    // Process podcasts
    if (podcastsResult.data) {
      for (const podcast of podcastsResult.data) {
        const docData = podcast.documents as { file_name: string } | null
        recentContent.push({
          id: podcast.id,
          type: 'podcast',
          title: podcast.title || 'Podcast',
          documentName: docData?.file_name,
          createdAt: podcast.created_at,
          updatedAt: podcast.updated_at,
        })
      }
    }

    // Process mindmaps
    if (mindmapsResult.data) {
      for (const mindmap of mindmapsResult.data) {
        const docData = mindmap.documents as { file_name: string } | null
        recentContent.push({
          id: mindmap.id,
          type: 'mindmap',
          title: mindmap.title || 'Mind Map',
          documentName: docData?.file_name,
          createdAt: mindmap.created_at,
          updatedAt: mindmap.updated_at,
        })
      }
    }

    // Sort by updated_at and limit
    recentContent.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    const limitedContent = recentContent.slice(0, limit)

    const duration = Date.now() - startTime
    logger.api('GET', '/api/recent-content', 200, duration, {
      userId,
      itemCount: limitedContent.length
    })

    return NextResponse.json({
      success: true,
      content: limitedContent,
      total: limitedContent.length
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Recent content fetch error', error)
    logger.api('GET', '/api/recent-content', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || 'Failed to fetch recent content' },
      { status: 500 }
    )
  }
}
