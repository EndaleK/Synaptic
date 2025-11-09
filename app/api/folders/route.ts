/**
 * API Route: /api/folders
 *
 * Manages folder organization for documents
 * GET: List all folders for user (hierarchical structure)
 * POST: Create new folder
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 10

// GET /api/folders - List all folders with document counts
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // 3. Fetch all folders for this user
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', profile.id)
      .order('position', { ascending: true })

    if (foldersError) {
      console.error('Failed to fetch folders:', foldersError)

      // If table doesn't exist yet (migration not run), return empty folders gracefully
      if (foldersError.code === '42P01' || foldersError.message.includes('does not exist')) {
        console.log('ℹ️ Folders table not found - migration not yet applied. Returning empty folders.')
        return NextResponse.json({
          success: true,
          folders: [],
          totalCount: 0
        })
      }

      return NextResponse.json(
        { error: 'Failed to fetch folders', details: foldersError.message },
        { status: 500 }
      )
    }

    // 4. Get document counts for each folder
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('folder_id')
      .eq('user_id', profile.id)

    const documentCounts: Record<string, number> = {}
    documents?.forEach(doc => {
      if (doc.folder_id) {
        documentCounts[doc.folder_id] = (documentCounts[doc.folder_id] || 0) + 1
      }
    })

    // 5. Build hierarchical structure
    const foldersWithCounts = folders?.map(folder => ({
      ...folder,
      documentCount: documentCounts[folder.id] || 0
    }))

    // Build tree structure
    const folderMap = new Map(foldersWithCounts?.map(f => [f.id, { ...f, children: [] }]))
    const rootFolders: any[] = []

    foldersWithCounts?.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!

      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id)
        if (parent) {
          parent.children.push(folderNode)
        } else {
          // Parent not found, treat as root
          rootFolders.push(folderNode)
        }
      } else {
        rootFolders.push(folderNode)
      }
    })

    return NextResponse.json({
      success: true,
      folders: rootFolders,
      totalCount: foldersWithCounts?.length || 0
    })

  } catch (error) {
    console.error('Folders GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch folders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/folders - Create new folder
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { name, color, icon, parentFolderId, position } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Folder name too long (max 100 characters)' },
        { status: 400 }
      )
    }

    console.log(`📁 Creating folder "${name}" for user ${userId}`)

    // 4. Create folder
    const { data: folder, error: createError } = await supabase
      .from('folders')
      .insert({
        user_id: profile.id,
        name: name.trim(),
        color: color || '#3B82F6',
        icon: icon || '📁',
        parent_folder_id: parentFolderId || null,
        position: position || 0
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create folder:', createError)

      // If table doesn't exist yet (migration not run), return helpful error
      if (createError.code === '42P01' || createError.message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Folders feature not available yet. Please run the database migration first.' },
          { status: 503 }
        )
      }

      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A folder with this name already exists in this location' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create folder', details: createError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Folder created successfully: ${folder.id}`)

    return NextResponse.json({
      success: true,
      folder,
      message: 'Folder created successfully'
    })

  } catch (error) {
    console.error('Folders POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
