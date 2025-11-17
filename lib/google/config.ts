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
