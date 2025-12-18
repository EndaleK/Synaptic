import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDocumentById } from '@/lib/supabase/documents-server'
import { validateUUIDParam } from '@/lib/validation/uuid'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/documents/[id]/download
 * Download a document file from storage
 */
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

    const { id } = await params

    // Validate UUID format
    try {
      validateUUIDParam(id, 'document ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      )
    }

    // Get document and verify ownership
    const { document, error: fetchError } = await getDocumentById(id, userId)

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (!document.storage_path) {
      return NextResponse.json(
        { error: 'Document has no file in storage' },
        { status: 400 }
      )
    }

    // Download file from Supabase Storage
    const supabase = await createClient()

    const { data, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !data) {
      console.error('Storage download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download file from storage' },
        { status: 500 }
      )
    }

    // Return file as response with appropriate headers
    const arrayBuffer = await data.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': document.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(document.file_name)}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Document download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
