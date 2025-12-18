/**
 * Google API Configuration
 *
 * Handles OAuth2 setup for Google Docs and Google Calendar integration
 */

import { google } from 'googleapis'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/documents.readonly', // Read Google Docs
  'https://www.googleapis.com/auth/calendar', // Full calendar access
  'https://www.googleapis.com/auth/drive.readonly', // Read Google Drive files
]

/**
 * Get OAuth2 client for Google APIs
 */
export function getGoogleOAuth2Client() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured')
  }

  const redirectUri = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
    : 'http://localhost:3000/api/google/callback'

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state?: string) {
  const oauth2Client = getGoogleOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    state: state || '',
    prompt: 'consent', // Force consent screen to get refresh token
  })
}

/**
 * Check if Google integration is configured
 */
export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

/**
 * Check if a token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return true

  const expiry = new Date(expiryDate)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000 // 5 minute buffer

  return expiry.getTime() - bufferMs < now.getTime()
}

/**
 * Refresh Google OAuth token using refresh token
 * Returns new access token and expiry, or null if refresh fails
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiryDate: string } | null> {
  try {
    const oauth2Client = getGoogleOAuth2Client()
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      console.error('No access token returned from refresh')
      return null
    }

    return {
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString() // Default 1 hour
    }
  } catch (error) {
    console.error('Failed to refresh Google token:', error)
    return null
  }
}
