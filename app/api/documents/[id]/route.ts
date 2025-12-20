import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { deleteDocument as deleteDocumentFromSupabase, getDocumentById } from '@/lib/supabase/documents-server'
import { validateUUIDParam } from '@/lib/validation/uuid'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/documents/[id]
 * Get a single document by ID with retry logic for transient errors
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const MAX_RETRIES = 2
  let lastError: Error | null = null

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

    // Retry logic for transient database errors
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { document, error } = await getDocumentById(id, userId)

        if (error) {
          // Check if error is transient (connection issues)
          const isTransient = error.toLowerCase().includes('timeout') ||
                             error.toLowerCase().includes('connection') ||
                             error.toLowerCase().includes('network')

          if (isTransient && attempt < MAX_RETRIES) {
            console.warn(`GET /api/documents/[id] transient error (attempt ${attempt}):`, error)
            await new Promise(resolve => setTimeout(resolve, 500 * attempt)) // Backoff
            continue
          }

          return NextResponse.json(
            { error: `Failed to fetch document: ${error}` },
            { status: 404 }
          )
        }

        return NextResponse.json({ document })
      } catch (retryError) {
        lastError = retryError instanceof Error ? retryError : new Error(String(retryError))
        console.warn(`GET /api/documents/[id] exception (attempt ${attempt}):`, lastError.message)

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
          continue
        }
      }
    }

    // All retries failed
    console.error('GET /api/documents/[id] failed after retries:', lastError?.message)
    return NextResponse.json(
      { error: 'Internal server error', details: lastError?.message },
      { status: 500 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('GET /api/documents/[id] error:', errorMessage, error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete a document
 */
export async function DELETE(
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

    // First get the document to retrieve storage path
    const { document, error: fetchError } = await getDocumentById(id, userId)

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete from storage and database
    const { success, error } = await deleteDocumentFromSupabase(
      id,
      userId,
      document.storage_path || ''
    )

    if (!success || error) {
      return NextResponse.json(
        { error: `Failed to delete document: ${error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/documents/[id]
 * Update document metadata (last_accessed_at, is_starred, tags, etc.)
 */
export async function PATCH(
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

    // Parse request body for updates
    const body = await request.json().catch(() => ({}))
    const { updateLastAccessed, is_starred, tags, folder_id } = body

    // Verify document ownership first
    const { document, error: fetchError } = await getDocumentById(id, userId)

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, any> = {}

    if (updateLastAccessed) {
      updates.last_accessed_at = new Date().toISOString()
    }

    if (typeof is_starred === 'boolean') {
      updates.is_starred = is_starred
    }

    if (Array.isArray(tags)) {
      updates.tags = tags
    }

    if (folder_id !== undefined) {
      updates.folder_id = folder_id // can be string or null
    }

    // If no updates, just return success
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, message: 'No updates provided' })
    }

    // Apply updates
    const supabase = await createClient()

    // Get user profile for RLS
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

    const { error: updateError } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .eq('user_id', profile.id)

    if (updateError) {
      console.error('PATCH /api/documents/[id] update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document updated successfully',
      updates
    })
  } catch (error) {
    console.error('PATCH /api/documents/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
