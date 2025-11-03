import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, writingType, citationStyle } = body

    // Allow empty content for new essays
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

    // Calculate word count (handle empty content)
    const plainText = (content || '').replace(/<[^>]*>/g, '').trim()
    const wordCount = plainText ? plainText.split(/\s+/).filter((w: string) => w.length > 0).length : 0

    // Generate UUID for new essay
    const essayId = uuidv4()

    // Create initial version entry
    const initialVersion = {
      version: 1,
      content,
      timestamp: new Date().toISOString(),
      changes: 'Initial creation'
    }

    // Create new essay
    const { data: newEssay, error: createError } = await supabase
      .from('essays')
      .insert({
        id: essayId,
        user_id: profile.id,
        title: title || 'Untitled Essay',
        content,
        word_count: wordCount,
        writing_type: writingType || 'academic',
        citation_style: citationStyle || 'APA',
        version_history: [initialVersion],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating essay:', createError)
      return NextResponse.json({ error: 'Failed to create essay' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      essay: newEssay,
      versionNumber: 1
    })
  } catch (error) {
    console.error('Create essay error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create essay' },
      { status: 500 }
    )
  }
}
