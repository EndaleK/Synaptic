import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/essays - Get user's essays
 * Query params:
 *  - limit: number of essays to return (default 10)
 *  - sort: field to sort by (default: updated_at)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const sort = searchParams.get('sort') || 'updated_at'

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

    // Fetch essays
    const { data: essays, error } = await supabase
      .from('essays')
      .select('*')
      .eq('user_id', profile.id)
      .order(sort, { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching essays:', error)
      return NextResponse.json({ error: 'Failed to fetch essays' }, { status: 500 })
    }

    return NextResponse.json({ essays })
  } catch (error) {
    console.error('Unexpected error in GET /api/essays:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/essays - Create a new essay
 * Body:
 *  - title: string
 *  - content: string (optional)
 *  - writing_type: string (optional)
 *  - citation_style: string (optional)
 *  - document_id: string (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title = 'Untitled Essay',
      content = '',
      writing_type = 'academic',
      citation_style = 'APA',
      document_id = null,
      word_count = 0,
      status = 'draft'
    } = body

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

    // Create essay
    const { data: essay, error } = await supabase
      .from('essays')
      .insert({
        user_id: profile.id,
        document_id,
        title,
        content,
        writing_type,
        citation_style,
        word_count,
        status
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating essay:', error)
      return NextResponse.json(
        {
          error: 'Failed to create essay',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ essay }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/essays:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
