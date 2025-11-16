import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/essays/[id] - Get a specific essay by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user profile to get user_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Fetch essay
    const { data: essay, error } = await supabase
      .from('essays')
      .select('*')
      .eq('id', id)
      .eq('user_id', profile.id)
      .single()

    if (error) {
      console.error('Error fetching essay:', error)
      return NextResponse.json(
        { error: 'Essay not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ essay })
  } catch (error) {
    console.error('Unexpected error in GET /api/essays/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/essays/[id] - Delete a specific essay by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user profile to get user_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Delete essay (verify user owns it first)
    const { error } = await supabase
      .from('essays')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id)

    if (error) {
      console.error('Error deleting essay:', error)
      return NextResponse.json(
        { error: 'Failed to delete essay' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Essay deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/essays/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
