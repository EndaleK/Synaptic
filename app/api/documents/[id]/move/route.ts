/**
 * API Route: POST /api/documents/{id}/move
 *
 * Moves a document to a different folder (or root)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

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

    // 3. Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 4. Parse request body
    const body = await request.json()
    const { folderId } = body

    // folderId can be null (move to root) or a UUID
    if (folderId !== null && typeof folderId !== 'string') {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 })
    }

    // 5. If moving to a folder, verify folder exists and belongs to user
    if (folderId) {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', profile.id)
        .single()

      if (folderError) {
        // If table doesn't exist yet (migration not run), return helpful error
        if (folderError.code === '42P01' || folderError.message.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Folders feature not available yet. Please run the database migration first.' },
            { status: 503 }
          )
        }
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }
    }

    console.log(`📦 Moving document ${documentId} to folder ${folderId || 'root'}`)

    // 6. Update document folder
    const { error: updateError } = await supabase
      .from('documents')
      .update({ folder_id: folderId })
      .eq('id', documentId)
      .eq('user_id', profile.id)

    if (updateError) {
      console.error('Failed to move document:', updateError)
      return NextResponse.json(
        { error: 'Failed to move document', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Document moved successfully`)

    return NextResponse.json({
      success: true,
      message: 'Document moved successfully'
    })

  } catch (error) {
    console.error('Document move error:', error)
    return NextResponse.json(
      {
        error: 'Failed to move document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
