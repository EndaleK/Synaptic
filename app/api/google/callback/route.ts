/**
 * Google OAuth Callback Route
 *
 * Handles OAuth callback and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleOAuth2Client } from '@/lib/google/config'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')
    const error = req.nextUrl.searchParams.get('error')

    // Handle authorization errors
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_auth_denied`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_auth_missing_code`
      )
    }

    // Parse state
    let userId: string
    let returnTo = '/dashboard'

    if (state) {
      try {
        const parsed = JSON.parse(state)
        userId = parsed.userId
        returnTo = parsed.returnTo || '/dashboard'
      } catch {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_auth_invalid_state`
        )
      }
    } else {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_auth_missing_state`
      )
    }

    // Exchange code for tokens
    const oauth2Client = getGoogleOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_auth_no_token`
      )
    }

    // Store tokens in database
    const supabase = await createClient()

    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || null,
        google_token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_user_id', userId)

    if (dbError) {
      console.error('Error storing Google tokens:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_auth_storage_failed`
      )
    }

    // Redirect back to the original page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}${returnTo}?google_connected=true`
    )

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_auth_failed`
    )
  }
}
