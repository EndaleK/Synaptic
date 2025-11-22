import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate UUID format
    try {
      validateUUIDParam(params.id, 'video ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid video ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', profile.id)
      .single()

    if (error || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error fetching video:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate UUID format
    try {
      validateUUIDParam(params.id, 'video ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid video ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const supabase = await createClient()

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

    // Validate that the video belongs to the user
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', profile.id)
      .single()

    if (!existingVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Build update object (only allow specific fields)
    const updateData: Partial<{ is_favorited: boolean }> = {}
    const { is_favorited } = body

    if (is_favorited !== undefined) updateData.is_favorited = is_favorited

    // Update video
    const { data: video, error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error updating video:', error)
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate UUID format
    try {
      validateUUIDParam(params.id, 'video ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid video ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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

    // Delete video (will cascade to related records if foreign keys are set up)
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', params.id)
      .eq('user_id', profile.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    )
  }
}
