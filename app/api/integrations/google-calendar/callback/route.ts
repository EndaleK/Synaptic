import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/google-calendar/callback
 * Handles Google OAuth callback and exchanges code for tokens
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // userId
    const error = searchParams.get('error')

    if (error) {
      logger.warn('Google OAuth error', { error })
      return NextResponse.redirect(
        new URL('/dashboard/study/calendar?error=oauth_denied', req.url)
      )
    }

    if (!code || !state) {
      logger.warn('Missing code or state in OAuth callback')
      return NextResponse.redirect(
        new URL('/dashboard/study/calendar?error=invalid_callback', req.url)
      )
    }

    const userId = state

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured')
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`)
    }

    const tokens = await tokenResponse.json()

    // Store tokens in Supabase
    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Store integration
    const { error: upsertError } = await supabase
      .from('calendar_integrations')
      .upsert({
        user_id: profile.id,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        is_active: true
      }, {
        onConflict: 'user_id,provider'
      })

    if (upsertError) {
      throw new Error(`Failed to store tokens: ${upsertError.message}`)
    }

    // Trigger initial import
    await fetch(new URL('/api/integrations/google-calendar/import', req.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    const duration = Date.now() - startTime
    logger.api('GET', '/api/integrations/google-calendar/callback', 200, duration, { userId })

    // Redirect back to calendar with success message
    return NextResponse.redirect(
      new URL('/dashboard/study/calendar?success=calendar_connected', req.url)
    )

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Google Calendar callback error', error)
    logger.api('GET', '/api/integrations/google-calendar/callback', 500, duration, { error: error.message })

    // Redirect back to calendar with error
    return NextResponse.redirect(
      new URL('/dashboard/study/calendar?error=connection_failed', req.url)
    )
  }
}
