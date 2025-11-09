/**
 * API Route: /api/folders/{id}
 *
 * Manages individual folder operations
 * PUT: Update folder (rename, change color/icon, move)
 * DELETE: Delete folder (moves documents to root)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 10

// PUT /api/folders/{id} - Update folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: folderId } = await params

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

    // 3. Verify folder ownership
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
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

    // 4. Parse request body
    const body = await request.json()
    const { name, color, icon, parentFolderId, position } = body

    const updates: any = {}

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 })
      }
      if (name.length > 100) {
        return NextResponse.json({ error: 'Folder name too long (max 100 characters)' }, { status: 400 })
      }
      updates.name = name.trim()
    }

    if (color !== undefined) updates.color = color
    if (icon !== undefined) updates.icon = icon
    if (position !== undefined) updates.position = position

    // Handle moving folder
    if (parentFolderId !== undefined) {
      // Prevent moving folder into itself
      if (parentFolderId === folderId) {
        return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 })
      }

      // Prevent moving folder into its own descendant
      if (parentFolderId) {
        const { data: descendants } = await supabase.rpc('get_folder_descendants', { folder_id: folderId })
        if (descendants?.includes(parentFolderId)) {
          return NextResponse.json({ error: 'Cannot move folder into its own descendant' }, { status: 400 })
        }
      }

      updates.parent_folder_id = parentFolderId
    }

    console.log(`📝 Updating folder ${folderId}:`, updates)

    // 5. Update folder
    const { data: updatedFolder, error: updateError } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update folder:', updateError)

      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A folder with this name already exists in this location' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update folder', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Folder updated successfully: ${folderId}`)

    return NextResponse.json({
      success: true,
      folder: updatedFolder,
      message: 'Folder updated successfully'
    })

  } catch (error) {
    console.error('Folder PUT error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/folders/{id} - Delete folder
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

    const { id: folderId } = await params

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

    console.log(`🗑️ Deleting folder ${folderId}`)

    // 3. Delete folder (cascade will handle subfolders, documents moved to NULL by ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', profile.id)

    if (deleteError) {
      console.error('Failed to delete folder:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete folder', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Folder deleted successfully: ${folderId}`)

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    })

  } catch (error) {
    console.error('Folder DELETE error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
