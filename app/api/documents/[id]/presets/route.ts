/**
 * API Route: /api/documents/{id}/presets
 *
 * Manages topic selection presets for documents
 * Allows users to save and load favorite topic/page selections
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'

export const runtime = 'nodejs'
export const maxDuration = 10

// GET /api/documents/{id}/presets - List all presets for a document
export async function GET(
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

    // Validate UUID format
    try {
      validateUUIDParam(documentId, 'Document ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

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

    // 3. Fetch all presets for this document
    const { data: presets, error: presetsError } = await supabase
      .from('topic_selection_presets')
      .select('*')
      .eq('user_id', profile.id)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (presetsError) {
      console.error('Failed to fetch presets:', presetsError)
      return NextResponse.json(
        { error: 'Failed to fetch presets', details: presetsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      presets: presets || [],
      count: presets?.length || 0
    })

  } catch (error) {
    console.error('Presets GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch presets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/documents/{id}/presets - Save a new preset
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

    // Validate UUID format
    try {
      validateUUIDParam(documentId, 'Document ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

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

    // 3. Parse request body
    const body = await request.json()
    const { presetName, selectionData } = body

    if (!presetName || !selectionData) {
      return NextResponse.json(
        { error: 'Missing required fields: presetName, selectionData' },
        { status: 400 }
      )
    }

    // Validate preset name
    if (presetName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Preset name cannot be empty' },
        { status: 400 }
      )
    }

    if (presetName.length > 100) {
      return NextResponse.json(
        { error: 'Preset name too long (max 100 characters)' },
        { status: 400 }
      )
    }

    // Validate selection data structure
    if (!selectionData.type || !['pages', 'topic', 'full'].includes(selectionData.type)) {
      return NextResponse.json(
        { error: 'Invalid selection data: type must be pages, topic, or full' },
        { status: 400 }
      )
    }

    console.log(`💾 Saving preset "${presetName}" for document ${documentId}`)

    // 4. Save preset (upsert in case of duplicate name)
    const { data: preset, error: saveError } = await supabase
      .from('topic_selection_presets')
      .upsert({
        user_id: profile.id,
        document_id: documentId,
        preset_name: presetName.trim(),
        selection_data: selectionData
      }, {
        onConflict: 'user_id,document_id,preset_name'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save preset:', saveError)
      return NextResponse.json(
        { error: 'Failed to save preset', details: saveError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Preset saved successfully: ${preset.id}`)

    return NextResponse.json({
      success: true,
      preset,
      message: 'Preset saved successfully'
    })

  } catch (error) {
    console.error('Presets POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save preset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/{id}/presets?presetId={presetId} - Delete a preset
export async function DELETE(
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

    // Validate UUID format
    try {
      validateUUIDParam(documentId, 'Document ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const presetId = searchParams.get('presetId')

    if (!presetId) {
      return NextResponse.json(
        { error: 'Missing required parameter: presetId' },
        { status: 400 }
      )
    }

    // Validate preset ID UUID format
    try {
      validateUUIDParam(presetId, 'Preset ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid preset ID format' },
        { status: 400 }
      )
    }

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

    console.log(`🗑️ Deleting preset ${presetId}`)

    // 3. Delete preset (RLS will ensure user owns it)
    const { error: deleteError } = await supabase
      .from('topic_selection_presets')
      .delete()
      .eq('id', presetId)
      .eq('user_id', profile.id)
      .eq('document_id', documentId)

    if (deleteError) {
      console.error('Failed to delete preset:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete preset', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Preset deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'Preset deleted successfully'
    })

  } catch (error) {
    console.error('Presets DELETE error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete preset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
