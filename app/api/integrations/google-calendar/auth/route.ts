import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/google-calendar/auth
 * Initiates Google Calendar OAuth flow
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated Google Calendar auth request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if Google OAuth credentials are configured
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`

    if (!clientId || !clientSecret) {
      logger.error('Google OAuth credentials not configured')
      return NextResponse.json({
        error: "Google Calendar integration is not configured. Please contact support.",
        configured: false
      }, { status: 500 })
    }

    // Build OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ]

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes.join(' '))
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', userId) // Pass userId in state for security

    const duration = Date.now() - startTime
    logger.api('GET', '/api/integrations/google-calendar/auth', 200, duration, { userId })

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString()
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Google Calendar auth error', error)
    logger.api('GET', '/api/integrations/google-calendar/auth', 500, duration, { error: error.message })

    return NextResponse.json(
      { error: error.message || "Failed to initiate Google Calendar authentication" },
      { status: 500 }
    )
  }
}
