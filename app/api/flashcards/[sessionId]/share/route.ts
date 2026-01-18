// API Route: /api/flashcards/[sessionId]/share
// Handles flashcard deck sharing functionality (generate token, toggle visibility)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

// POST - Generate or get share token for a flashcard deck
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { sessionId } = await context.params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if generation session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('flashcard_generation_sessions')
      .select('id, share_token, is_public, document_id')
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Flashcard deck not found' }, { status: 404 })
    }

    // If share token already exists, return it
    if (session.share_token) {
      return NextResponse.json({
        shareToken: session.share_token,
        isPublic: session.is_public || false,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'}/shared/flashcards/${session.share_token}`
      })
    }

    // Generate new share token
    const shareToken = nanoid(12)

    const { error: updateError } = await supabase
      .from('flashcard_generation_sessions')
      .update({
        share_token: shareToken,
        is_public: false // Default to private
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error generating share token:', updateError)
      return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 })
    }

    return NextResponse.json({
      shareToken,
      isPublic: false,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'}/shared/flashcards/${shareToken}`
    })
  } catch (error) {
    console.error('POST /api/flashcards/[sessionId]/share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update visibility settings
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { sessionId } = await context.params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isPublic } = body

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Update session visibility
    const { data, error } = await supabase
      .from('flashcard_generation_sessions')
      .update({ is_public: isPublic })
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .select('id, share_token, is_public')
      .single()

    if (error) {
      console.error('Error updating visibility:', error)
      return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 })
    }

    return NextResponse.json({
      shareToken: data.share_token,
      isPublic: data.is_public
    })
  } catch (error) {
    console.error('PATCH /api/flashcards/[sessionId]/share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get share info
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { sessionId } = await context.params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get session share info
    const { data: session, error } = await supabase
      .from('flashcard_generation_sessions')
      .select('id, share_token, is_public, share_count')
      .eq('id', sessionId)
      .eq('user_id', profile.id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Flashcard deck not found' }, { status: 404 })
    }

    return NextResponse.json({
      shareToken: session.share_token,
      isPublic: session.is_public || false,
      shareCount: session.share_count || 0,
      shareUrl: session.share_token
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'}/shared/flashcards/${session.share_token}`
        : null
    })
  } catch (error) {
    console.error('GET /api/flashcards/[sessionId]/share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
