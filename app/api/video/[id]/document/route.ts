import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { id } = await params

    // Validate UUID format
    try {
      validateUUIDParam(id, 'Video ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get video
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', profile.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Check if video has transcript
    if (!video.transcript || video.transcript.length === 0) {
      return NextResponse.json(
        { error: 'Video has no transcript' },
        { status: 400 }
      )
    }

    const transcriptText = video.transcript.map((line: any) => line.text).join(' ')
    const cleanTitle = video.title.replace(/[^\w\s-]/g, '').trim()
    const libraryFileName = `Video: ${cleanTitle}`

    // Check if document already exists (by library file name)
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', profile.id)
      .eq('file_name', libraryFileName)
      .single()

    if (existingDoc) {
      return NextResponse.json(existingDoc)
    }

    // Create virtual document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: profile.id,
        file_name: libraryFileName,
        file_type: 'video',
        file_size: 0,
        extracted_text: transcriptText.slice(0, 50000),
        document_summary: video.summary,
        processing_status: 'completed'
      })
      .select()
      .single()

    if (docError) {
      throw docError
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error getting video document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get video document' },
      { status: 500 }
    )
  }
}
