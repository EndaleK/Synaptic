import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Fetch user's essays
    const { data: essays, error } = await supabase
      .from('essays')
      .select('id, title, content, word_count, writing_type, citation_style, created_at, updated_at')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching essays:', error)
      return NextResponse.json({ error: 'Failed to fetch essays' }, { status: 500 })
    }

    return NextResponse.json({ essays: essays || [] })
  } catch (error) {
    console.error('List essays error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch essays' },
      { status: 500 }
    )
  }
}
