/**
 * API Route: /api/integrations/google-classroom/callback
 *
 * GET: OAuth callback handler for Google Classroom
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/integrations/google-classroom'

export const runtime = 'nodejs'

const config = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/google-classroom/callback`
}

/**
 * GET /api/integrations/google-classroom/callback
 * Handle OAuth callback from Google
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      // Redirect to sign in if not authenticated
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('[Google Classroom Callback] OAuth error:', error)
      return NextResponse.redirect(
        new URL('/dashboard?integration=google-classroom&error=oauth_denied', req.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?integration=google-classroom&error=no_code', req.url)
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(config, code)

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.redirect(
        new URL('/dashboard?integration=google-classroom&error=no_profile', req.url)
      )
    }

    // Save tokens to user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        google_classroom_access_token: tokens.accessToken,
        google_classroom_refresh_token: tokens.refreshToken || null,
        google_classroom_token_expiry: tokens.expiryDate
          ? new Date(tokens.expiryDate).toISOString()
          : null
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[Google Classroom Callback] Save error:', updateError)
      return NextResponse.redirect(
        new URL('/dashboard?integration=google-classroom&error=save_failed', req.url)
      )
    }

    // Redirect to dashboard with success
    return NextResponse.redirect(
      new URL('/dashboard?integration=google-classroom&success=true', req.url)
    )
  } catch (error) {
    console.error('[Google Classroom Callback] Error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?integration=google-classroom&error=unknown', req.url)
    )
  }
}
