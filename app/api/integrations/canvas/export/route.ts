/**
 * API Route: /api/integrations/canvas/export
 *
 * POST: Export flashcards/materials to Canvas as a page
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCanvasClient,
  exportFlashcardsToCanvas
} from '@/lib/integrations/canvas-lms'

export const runtime = 'nodejs'

interface ExportRequest {
  courseId: number
  documentId?: string
  title: string
  type: 'flashcards' | 'mindmap' | 'podcast' | 'exam'
  moduleId?: number
  flashcardIds?: string[]
}

/**
 * POST /api/integrations/canvas/export
 * Export content to Canvas as a page
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExportRequest = await req.json()
    const { courseId, documentId, title, type, moduleId, flashcardIds } = body

    if (!courseId || !title || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, type' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile with Canvas credentials
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, canvas_base_url, canvas_access_token')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!profile.canvas_access_token || !profile.canvas_base_url) {
      return NextResponse.json(
        { error: 'Canvas not connected' },
        { status: 400 }
      )
    }

    // Create Canvas client
    const canvas = createCanvasClient({
      baseUrl: profile.canvas_base_url,
      accessToken: profile.canvas_access_token
    })

    // For flashcards, fetch the actual flashcard data
    if (type === 'flashcards') {
      let flashcardsQuery = supabase
        .from('flashcards')
        .select('id, front, back, tags')
        .eq('user_id', profile.id)

      if (flashcardIds && flashcardIds.length > 0) {
        flashcardsQuery = flashcardsQuery.in('id', flashcardIds)
      } else if (documentId) {
        flashcardsQuery = flashcardsQuery.eq('document_id', documentId)
      }

      const { data: flashcards, error: flashcardsError } = await flashcardsQuery

      if (flashcardsError || !flashcards || flashcards.length === 0) {
        return NextResponse.json(
          { error: 'No flashcards found to export' },
          { status: 404 }
        )
      }

      // Export flashcards to Canvas
      const result = await exportFlashcardsToCanvas(canvas, {
        courseId,
        title,
        flashcards: flashcards.map(f => ({
          front: f.front,
          back: f.back,
          tags: f.tags || []
        })),
        moduleId
      })

      // Log the export
      await supabase.from('integration_exports').insert({
        user_id: profile.id,
        integration_type: 'canvas',
        content_type: type,
        document_id: documentId || null,
        external_id: result.page.url,
        external_url: result.page.html_url,
        metadata: {
          courseId,
          title,
          moduleId,
          flashcardCount: flashcards.length
        }
      })

      return NextResponse.json({
        success: true,
        page: {
          url: result.page.url,
          title: result.page.title,
          htmlUrl: result.page.html_url
        },
        moduleItem: result.moduleItem ? {
          id: result.moduleItem.id,
          title: result.moduleItem.title
        } : undefined,
        message: `Successfully exported ${flashcards.length} flashcards to Canvas`
      })
    }

    // For other types, create a link page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'
    let contentUrl: string
    let description: string

    switch (type) {
      case 'mindmap':
        contentUrl = documentId
          ? `${baseUrl}/dashboard?mode=mindmap&document=${documentId}`
          : `${baseUrl}/dashboard?mode=mindmap`
        description = 'Interactive mind map from Synaptic'
        break
      case 'podcast':
        contentUrl = documentId
          ? `${baseUrl}/dashboard?mode=podcast&document=${documentId}`
          : `${baseUrl}/dashboard?mode=podcast`
        description = 'Audio podcast from Synaptic'
        break
      case 'exam':
        contentUrl = documentId
          ? `${baseUrl}/dashboard?mode=exam&document=${documentId}`
          : `${baseUrl}/dashboard?mode=exam`
        description = 'Practice exam from Synaptic'
        break
      default:
        contentUrl = `${baseUrl}/dashboard`
        description = 'Study materials from Synaptic'
    }

    // Create a page with a link
    const page = await canvas.createPage(courseId, {
      title,
      body: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
          <h2>${title}</h2>
          <p>${description}</p>
          <p>
            <a href="${contentUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
              Open in Synaptic →
            </a>
          </p>
          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            Created with <a href="https://synaptic.study" style="color: #667eea;">Synaptic</a>
          </p>
        </div>
      `,
      published: true
    })

    // Optionally add to module
    let moduleItem
    if (moduleId) {
      moduleItem = await canvas.addModuleItem(courseId, moduleId, {
        title,
        type: 'Page',
        page_url: page.url
      })
    }

    // Log the export
    await supabase.from('integration_exports').insert({
      user_id: profile.id,
      integration_type: 'canvas',
      content_type: type,
      document_id: documentId || null,
      external_id: page.url,
      external_url: page.html_url,
      metadata: {
        courseId,
        title,
        moduleId,
        contentUrl
      }
    })

    return NextResponse.json({
      success: true,
      page: {
        url: page.url,
        title: page.title,
        htmlUrl: page.html_url
      },
      moduleItem: moduleItem ? {
        id: moduleItem.id,
        title: moduleItem.title
      } : undefined,
      message: `Successfully exported to Canvas`
    })
  } catch (error) {
    console.error('[Canvas Export] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export to Canvas' },
      { status: 500 }
    )
  }
}
