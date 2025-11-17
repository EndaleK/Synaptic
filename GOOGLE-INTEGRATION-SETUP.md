# Google Integration Setup Guide

This guide explains how to set up Google Docs import and Google Calendar sync for Synaptic™.

## Features

### 1. Google Docs Import
- Import documents directly from Google Docs
- Preserves text content and formatting
- Accessible from the Documents upload interface
- Automatically creates a document in Synaptic™ database

### 2. Google Calendar Sync
- Add study sessions to your Google Calendar
- Sync from the calendar/scheduler interface
- Set reminders for study sessions
- Automatic timezone handling

## Prerequisites

- Google Cloud Platform account
- Synaptic™ instance running locally or deployed

## Setup Steps

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Synaptic Integration")
4. Click "Create"

### Step 2: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google Docs API**
   - **Google Calendar API**
   - **Google Drive API** (for file listing)

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: External
   - **App name**: Synaptic
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **Scopes**: Add these scopes:
     - `https://www.googleapis.com/auth/documents.readonly`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/drive.readonly`
   - **Test users**: Add your email for testing
   - Click **Save and Continue**

4. Back in **Credentials**, click **"Create Credentials"** → **"OAuth client ID"**
5. **Application type**: Web application
6. **Name**: Synaptic OAuth Client
7. **Authorized redirect URIs**: Add both:
   - `http://localhost:3000/api/google/callback` (for local development)
   - `https://yourdomain.com/api/google/callback` (for production)
8. Click **Create**
9. **Copy the Client ID and Client Secret** (you'll need these next)

### Step 4: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Step 5: Update Database Schema

Run the migration to add Google token storage:

```bash
# Using Supabase CLI
supabase migration up

# Or manually execute the SQL:
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/add_google_tokens.sql
```

### Step 6: Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test Google Docs Import**:
   - Navigate to `/dashboard`
   - Go to the document upload section
   - Look for "Import from Google Docs"
   - Click "Connect Google Account"
   - Authorize the app
   - Paste a Google Docs URL and import

3. **Test Google Calendar Sync**:
   - Navigate to the calendar/scheduler section
   - Create a study event
   - Click "Add to Google Calendar"
   - If not connected, it will prompt you to connect
   - Verify event appears in your Google Calendar

## Usage

### Importing Google Docs

```typescript
import GoogleDocsImport from '@/components/GoogleDocsImport'

function MyComponent() {
  return (
    <GoogleDocsImport
      onImportComplete={(documentId) => {
        console.log('Imported document:', documentId)
        // Redirect to document or refresh list
      }}
    />
  )
}
```

### Syncing to Google Calendar

```typescript
import GoogleCalendarSync from '@/components/GoogleCalendarSync'

function MyComponent() {
  const studySession = {
    summary: "Study Session: Biology Chapter 5",
    description: "Review flashcards and notes",
    start: "2025-01-20T14:00:00",
    end: "2025-01-20T15:30:00",
  }

  return (
    <GoogleCalendarSync
      eventData={studySession}
      onSyncComplete={(eventId, eventUrl) => {
        console.log('Event created:', eventId)
        console.log('View at:', eventUrl)
      }}
    />
  )
}
```

## API Routes

### GET /api/google/auth

Initiates Google OAuth flow.

**Query Parameters:**
- `returnTo` (optional): URL to redirect after authorization

**Example:**
```javascript
const response = await fetch('/api/google/auth?returnTo=/dashboard')
const { authUrl } = await response.json()
window.location.href = authUrl
```

### GET /api/google/callback

Handles OAuth callback and stores tokens (automatically called by Google).

### POST /api/google/docs/import

Import a Google Docs document.

**Request Body:**
```json
{
  "url": "https://docs.google.com/document/d/DOCUMENT_ID/edit",
  "documentId": "DOCUMENT_ID" // Optional if URL is provided
}
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "title": "My Document",
    "content": "...",
    "source_url": "https://docs.google.com/document/d/..."
  }
}
```

### POST /api/google/calendar/sync

Sync events with Google Calendar.

**Request Body:**
```json
{
  "action": "create",
  "event": {
    "summary": "Study Session",
    "description": "Review flashcards",
    "start": "2025-01-20T14:00:00",
    "end": "2025-01-20T15:30:00"
  }
}
```

**Actions:**
- `create`: Create new event
- `update`: Update existing event (requires `eventId`)
- `delete`: Delete event (requires `eventId`)

**Response:**
```json
{
  "success": true,
  "eventId": "event_abc123",
  "eventUrl": "https://calendar.google.com/calendar/event?eid=..."
}
```

## Security Considerations

### OAuth Scopes

The app requests these scopes:
- `documents.readonly`: Read Google Docs content
- `calendar`: Full calendar access (create, update, delete events)
- `drive.readonly`: List files from Google Drive

### Token Storage

- Access tokens are stored in the `user_profiles` table
- Tokens are encrypted at rest (Supabase RLS)
- Tokens are user-specific (cannot access other users' tokens)
- Refresh tokens allow renewing access without re-authentication

### Best Practices

1. **Use HTTPS in production**: OAuth requires HTTPS for redirect URIs
2. **Restrict API keys**: In Google Cloud Console, restrict keys to specific APIs
3. **Monitor usage**: Check Google Cloud Console for quota usage
4. **Handle token expiry**: Implement token refresh logic (currently tokens last ~1 hour)

## Troubleshooting

### "Google integration not configured" error

**Cause**: Missing `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`

**Solution**: Add credentials to `.env.local`

### "Redirect URI mismatch" error

**Cause**: OAuth redirect URI doesn't match configured URI in Google Cloud

**Solution**:
1. Check your current domain/port
2. Add exact URI to Google Cloud Console → Credentials → OAuth Client → Authorized redirect URIs
3. Format: `http://localhost:3000/api/google/callback` (dev) or `https://yourdomain.com/api/google/callback` (prod)

### "Access denied" error

**Cause**: User hasn't granted required permissions

**Solution**: Reconnect Google account and accept all permissions

### "Google account not connected" error

**Cause**: User's access token is missing or expired

**Solution**: Click "Connect Google Account" button to re-authenticate

### Document import fails

**Possible causes:**
1. Document is private (user doesn't have access)
2. Invalid document ID/URL
3. Access token expired

**Solution**:
1. Ensure you have "View" or "Edit" access to the document
2. Verify the URL is a Google Docs URL
3. Reconnect your Google account

### Calendar sync fails

**Possible causes:**
1. Invalid date format (must be ISO 8601)
2. Access token expired
3. Calendar API quota exceeded

**Solution**:
1. Ensure dates are in format: `2025-01-20T14:00:00`
2. Reconnect your Google account
3. Check Google Cloud Console quota limits

## Rate Limits

### Google API Quotas (Free Tier)

- **Google Docs API**: 60 requests/minute per user
- **Google Calendar API**: 100 requests/minute per user
- **Google Drive API**: 1000 requests/100 seconds per user

### Handling Quota Limits

The integration automatically handles rate limits by:
1. Showing error messages when limits are hit
2. Suggesting retry after waiting

For high-volume usage, consider:
1. Request quota increase in Google Cloud Console
2. Implement request batching
3. Cache document content to reduce API calls

## Advanced Configuration

### Custom OAuth Scopes

To request additional scopes, edit `lib/google/config.ts`:

```typescript
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.readonly',
  // Add more scopes here
]
```

### Token Refresh

Implement automatic token refresh by adding to `lib/google/config.ts`:

```typescript
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getGoogleOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}
```

## Production Deployment

### Vercel

1. Add environment variables in Vercel dashboard
2. Ensure redirect URI includes production domain
3. Update OAuth consent screen with production URL

### Environment Variables

```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### OAuth Consent Screen

Before going public:
1. Complete OAuth consent screen verification
2. Add privacy policy URL
3. Add terms of service URL
4. Submit for Google verification (if publishing publicly)

## Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Docs API Documentation](https://developers.google.com/docs/api)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
