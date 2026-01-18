// API Route: /api/documents/[id]/share
// Handles document sharing functionality (generate token, toggle visibility)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST - Generate or get share token
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { id } = await context.params

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

    // Check if document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, share_token, is_public')
      .eq('id', id)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // If share token already exists, return it
    if (document.share_token) {
      return NextResponse.json({
        shareToken: document.share_token,
        isPublic: document.is_public || false,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'}/shared/document/${document.share_token}`
      })
    }

    // Generate new share token
    const shareToken = nanoid(12)

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        share_token: shareToken,
        is_public: false // Default to private
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error generating share token:', updateError)
      return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 })
    }

    return NextResponse.json({
      shareToken,
      isPublic: false,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'}/shared/document/${shareToken}`
    })
  } catch (error) {
    console.error('POST /api/documents/[id]/share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update visibility settings
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { id } = await context.params

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

    // Update document visibility
    const { data, error } = await supabase
      .from('documents')
      .update({ is_public: isPublic })
      .eq('id', id)
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
    console.error('PATCH /api/documents/[id]/share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get share info
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth()
    const { id } = await context.params

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

    // Get document share info
    const { data: document, error } = await supabase
      .from('documents')
      .select('id, share_token, is_public, share_count')
      .eq('id', id)
      .eq('user_id', profile.id)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      shareToken: document.share_token,
      isPublic: document.is_public || false,
      shareCount: document.share_count || 0,
      shareUrl: document.share_token
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://synaptic.study'}/shared/document/${document.share_token}`
        : null
    })
  } catch (error) {
    console.error('GET /api/documents/[id]/share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
