import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET specific essay
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: essayId } = await params

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

    // Fetch essay
    const { data: essay, error } = await supabase
      .from('essays')
      .select('*')
      .eq('id', essayId)
      .eq('user_id', profile.id)
      .single()

    if (error || !essay) {
      return NextResponse.json(
        { error: 'Essay not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ essay })
  } catch (error) {
    console.error('Get essay error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch essay' },
      { status: 500 }
    )
  }
}

// DELETE specific essay
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: essayId } = await params

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

    // Delete essay (verifying ownership)
    const { error } = await supabase
      .from('essays')
      .delete()
      .eq('id', essayId)
      .eq('user_id', profile.id)

    if (error) {
      console.error('Error deleting essay:', error)
      return NextResponse.json({ error: 'Failed to delete essay' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Essay deleted successfully' })
  } catch (error) {
    console.error('Delete essay error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete essay' },
      { status: 500 }
    )
  }
}
