import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { essayId, title, content, writingType, citationStyle } = body

    if (!essayId || !content) {
      return NextResponse.json(
        { error: 'Essay ID and content are required' },
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
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Fetch current essay to verify ownership and get version history
    const { data: currentEssay, error: fetchError } = await supabase
      .from('essays')
      .select('*')
      .eq('id', essayId)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !currentEssay) {
      return NextResponse.json(
        { error: 'Essay not found or access denied' },
        { status: 404 }
      )
    }

    // Calculate word count
    const plainText = content.replace(/<[^>]*>/g, '').trim()
    const wordCount = plainText.split(/\s+/).filter((w: string) => w.length > 0).length

    // Get existing version history
    const versionHistory = Array.isArray(currentEssay.version_history)
      ? currentEssay.version_history
      : []

    // Create new version entry
    const newVersion = {
      version: versionHistory.length + 1,
      content,
      timestamp: new Date().toISOString(),
      changes: `Updated ${title || 'essay'}`
    }

    // Add new version to history
    const updatedVersionHistory = [...versionHistory, newVersion]

    // Update essay
    const { data: updatedEssay, error: updateError } = await supabase
      .from('essays')
      .update({
        title: title || currentEssay.title,
        content,
        word_count: wordCount,
        writing_type: writingType || currentEssay.writing_type,
        citation_style: citationStyle || currentEssay.citation_style,
        version_history: updatedVersionHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', essayId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating essay:', updateError)
      return NextResponse.json({ error: 'Failed to save essay' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      essay: updatedEssay,
      versionNumber: newVersion.version
    })
  } catch (error) {
    console.error('Save essay error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save essay' },
      { status: 500 }
    )
  }
}
