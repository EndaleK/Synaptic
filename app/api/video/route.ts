import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Get filter from query params
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'all', 'favorites', 'recent'

    let query = supabase
      .from('videos')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    // Apply filter
    if (filter === 'favorites') {
      query = query.eq('is_favorited', true)
    }

    const { data: videos, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(videos || [])
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
