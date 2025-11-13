/**
 * Emergency endpoint to fix documents stuck in "processing" state
 * Usage: POST /api/documents/fix-stuck with { documentId: "..." }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 })
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

    // Verify ownership and update
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        processing_status: 'completed',
        metadata: {
          fixed_from_stuck_state: true,
          fixed_at: new Date().toISOString()
        }
      })
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (updateError || !document) {
      return NextResponse.json(
        { error: 'Failed to update document or not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document unstuck! Now click "Index Document" to extract text.',
      document: {
        id: document.id,
        file_name: document.file_name,
        processing_status: document.processing_status
      }
    })

  } catch (error) {
    console.error('Fix stuck document error:', error)
    return NextResponse.json(
      { error: 'Failed to fix document' },
      { status: 500 }
    )
  }
}
