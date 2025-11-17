/**
 * Google OAuth Authorization Route
 *
 * Initiates Google OAuth flow for Docs and Calendar access
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGoogleAuthUrl, isGoogleConfigured } from '@/lib/google/config'

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if Google integration is configured
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: 'Google integration not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.' },
        { status: 503 }
      )
    }

    // Get return URL from query params
    const returnTo = req.nextUrl.searchParams.get('returnTo') || '/dashboard'

    // Generate authorization URL with state parameter
    const state = JSON.stringify({ userId, returnTo })
    const authUrl = getGoogleAuthUrl(state)

    return NextResponse.json({
      authUrl,
      message: 'Redirect to this URL to authorize Google access',
    })

  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate Google authorization' },
      { status: 500 }
    )
  }
}
