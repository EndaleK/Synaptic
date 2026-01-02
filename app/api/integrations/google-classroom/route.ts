/**
 * API Route: /api/integrations/google-classroom
 *
 * GET: Get Google Classroom connection status and courses
 * POST: Connect to Google Classroom (initiate OAuth)
 * DELETE: Disconnect Google Classroom
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  createClassroomClient,
  getCourses,
  getAuthUrl
} from '@/lib/integrations/google-classroom'

export const runtime = 'nodejs'

const config = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/google-classroom/callback`
}

/**
 * GET /api/integrations/google-classroom
 * Get connection status and available courses
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Google Classroom is configured
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json({
        connected: false,
        configured: false,
        message: 'Google Classroom integration not configured'
      })
    }

    const supabase = await createClient()

    // Get user profile with Google tokens
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, google_classroom_access_token, google_classroom_refresh_token, google_classroom_token_expiry')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if connected
    if (!profile.google_classroom_access_token) {
      return NextResponse.json({
        connected: false,
        configured: true,
        authUrl: getAuthUrl(config)
      })
    }

    // Check if token is expired
    const isExpired = profile.google_classroom_token_expiry
      ? new Date(profile.google_classroom_token_expiry) < new Date()
      : false

    if (isExpired && !profile.google_classroom_refresh_token) {
      return NextResponse.json({
        connected: false,
        configured: true,
        authUrl: getAuthUrl(config),
        message: 'Token expired, please reconnect'
      })
    }

    try {
      // Create Classroom client and fetch courses
      const classroom = createClassroomClient(
        config,
        profile.google_classroom_access_token,
        profile.google_classroom_refresh_token || undefined
      )

      const courses = await getCourses(classroom)

      return NextResponse.json({
        connected: true,
        configured: true,
        courses
      })
    } catch (error) {
      console.error('[Google Classroom] API error:', error)

      // Token might be invalid, prompt reconnection
      return NextResponse.json({
        connected: false,
        configured: true,
        authUrl: getAuthUrl(config),
        message: 'Connection expired, please reconnect'
      })
    }
  } catch (error) {
    console.error('[Google Classroom] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get Google Classroom status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/google-classroom
 * Initiate OAuth connection
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: 'Google Classroom integration not configured' },
        { status: 400 }
      )
    }

    const authUrl = getAuthUrl(config)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('[Google Classroom] Connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations/google-classroom
 * Disconnect Google Classroom
 */
export async function DELETE(req: NextRequest) {
  try {
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

    // Clear Google tokens
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        google_classroom_access_token: null,
        google_classroom_refresh_token: null,
        google_classroom_token_expiry: null
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[Google Classroom] Disconnect error:', updateError)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Google Classroom] Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
