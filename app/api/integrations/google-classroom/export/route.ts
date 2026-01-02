/**
 * API Route: /api/integrations/google-classroom/export
 *
 * POST: Export flashcards/materials to Google Classroom
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  createClassroomClient,
  exportFlashcardsToClassroom
} from '@/lib/integrations/google-classroom'

export const runtime = 'nodejs'

const config = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/google-classroom/callback`
}

interface ExportRequest {
  courseId: string
  documentId?: string
  title: string
  description?: string
  topicId?: string
  type: 'flashcards' | 'mindmap' | 'podcast' | 'exam'
}

/**
 * POST /api/integrations/google-classroom/export
 * Export content to Google Classroom as a material
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExportRequest = await req.json()
    const { courseId, documentId, title, description, topicId, type } = body

    if (!courseId || !title || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, type' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile with Google tokens
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, google_classroom_access_token, google_classroom_refresh_token')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!profile.google_classroom_access_token) {
      return NextResponse.json(
        { error: 'Google Classroom not connected' },
        { status: 400 }
      )
    }

    // Create Classroom client
    const classroom = createClassroomClient(
      config,
      profile.google_classroom_access_token,
      profile.google_classroom_refresh_token || undefined
    )

    // Generate shareable URL for the content
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'
    let contentUrl: string

    switch (type) {
      case 'flashcards':
        contentUrl = documentId
          ? `${baseUrl}/dashboard?mode=flashcards&document=${documentId}`
          : `${baseUrl}/dashboard?mode=flashcards`
        break
      case 'mindmap':
        contentUrl = documentId
          ? `${baseUrl}/dashboard?mode=mindmap&document=${documentId}`
          : `${baseUrl}/dashboard?mode=mindmap`
        break
      case 'podcast':
        contentUrl = documentId
          ? `${baseUrl}/dashboard?mode=podcast&document=${documentId}`
          : `${baseUrl}/dashboard?mode=podcast`
        break
      case 'exam':
        contentUrl = documentId
          ? `${baseUrl}/dashboard?mode=exam&document=${documentId}`
          : `${baseUrl}/dashboard?mode=exam`
        break
      default:
        contentUrl = `${baseUrl}/dashboard`
    }

    // Export to Google Classroom
    const result = await exportFlashcardsToClassroom(classroom, {
      courseId,
      flashcardsUrl: contentUrl,
      title,
      description: description || `Study materials from Synaptic - ${type}`,
      topicId
    })

    // Log the export
    await supabase.from('integration_exports').insert({
      user_id: profile.id,
      integration_type: 'google_classroom',
      content_type: type,
      document_id: documentId || null,
      external_id: result.id,
      external_url: result.alternateLink,
      metadata: {
        courseId,
        title,
        topicId
      }
    })

    return NextResponse.json({
      success: true,
      id: result.id,
      alternateLink: result.alternateLink,
      message: `Successfully exported to Google Classroom`
    })
  } catch (error) {
    console.error('[Google Classroom Export] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export to Google Classroom' },
      { status: 500 }
    )
  }
}
