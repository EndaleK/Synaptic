# Google Calendar Integration Setup Guide

This guide will walk you through setting up Google Calendar integration for the Study Calendar feature.

## Overview

The Google Calendar integration allows users to:
- Import events from their Google Calendar into the study calendar
- View all calendar events in one unified view
- Automatically categorize imported events (study sessions, exams, assignments, etc.)
- Maintain sync with Google Calendar

## Prerequisites

- A Google Cloud account
- A deployed or locally running instance of the app
- Admin access to your Google Cloud project

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Enter a project name (e.g., "Synaptic Study App")
4. Click **Create**

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, navigate to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on **Google Calendar API**
4. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** user type
   - Fill in the required fields:
     - App name: "Synaptic"
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue**
   - Skip the Scopes section (click **Save and Continue**)
   - Add test users if needed
   - Click **Save and Continue**

4. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: "Synaptic Calendar Integration"
   - **Authorized redirect URIs**: Add the following:
     - Development: `http://localhost:3000/api/integrations/google-calendar/callback`
     - Production: `https://your-domain.com/api/integrations/google-calendar/callback`
   - Click **Create**

5. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Optional: Custom redirect URI (defaults to NEXT_PUBLIC_APP_URL + callback path)
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback

# Make sure NEXT_PUBLIC_APP_URL is set correctly
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

## Step 5: Run Database Migration

Run the database migration to create the necessary tables:

```bash
# If using Supabase SQL Editor:
# 1. Go to your Supabase project dashboard
# 2. Navigate to SQL Editor
# 3. Copy and paste the contents of supabase/migrations/20250127_calendar_integrations.sql
# 4. Click "Run"

# Or if you have psql installed:
psql -h your-supabase-host -U postgres -d postgres < supabase/migrations/20250127_calendar_integrations.sql
```

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard/study/calendar`

3. Click the **Import Google Calendar** button

4. You'll be redirected to Google's OAuth consent screen

5. Grant the necessary permissions:
   - View events on all your calendars
   - View events and event details on your calendars

6. After authorization, you'll be redirected back to the calendar page

7. Your events will be automatically imported

## How It Works

### OAuth Flow

1. User clicks "Import Google Calendar"
2. App redirects to Google OAuth consent screen
3. User grants permissions
4. Google redirects back with authorization code
5. App exchanges code for access token and refresh token
6. Tokens are stored securely in database
7. Events are imported from Google Calendar

### Event Import

- Events are imported for the next 90 days
- Events are automatically categorized based on keywords:
  - **Exam**: Contains "exam", "test", or "quiz"
  - **Assignment**: Contains "assignment", "homework", or "project"
  - **Review**: Contains "review" or "revision"
  - **Study Session**: Contains "study" or "learning"
  - **Break**: Contains "break" or "rest"
  - **Other**: Everything else

### Token Refresh

- Access tokens expire after 1 hour
- Refresh tokens are used automatically to get new access tokens
- No user interaction required for token refresh

## Security Considerations

1. **Never commit credentials**: Keep `.env.local` out of version control
2. **Use environment variables**: Store sensitive data in environment variables
3. **OAuth scopes**: Only request read-only calendar access
4. **Token storage**: Tokens are encrypted in the database with Row-Level Security
5. **User isolation**: Each user can only access their own tokens (enforced by RLS)

## Troubleshooting

### "Google Calendar integration is not configured"

- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local`
- Restart your development server after adding environment variables

### "OAuth redirect URI mismatch"

- Ensure the redirect URI in Google Cloud Console exactly matches:
  - `http://localhost:3000/api/integrations/google-calendar/callback` (development)
  - `https://your-domain.com/api/integrations/google-calendar/callback` (production)
- No trailing slashes
- Protocol must match (http vs https)

### "Failed to import events"

- Check that Google Calendar API is enabled in Google Cloud Console
- Verify that the OAuth scopes include calendar read permissions
- Check browser console for detailed error messages

### Token expired errors

- The app should automatically refresh tokens
- If refresh fails, user needs to reconnect their calendar
- Check that refresh token is stored in database

## API Endpoints

### `GET /api/integrations/google-calendar/auth`
Initiates OAuth flow and returns authorization URL.

### `GET /api/integrations/google-calendar/callback`
Handles OAuth callback, exchanges code for tokens, and triggers initial import.

### `POST /api/integrations/google-calendar/import`
Imports events from Google Calendar (can be called manually to re-sync).

## Database Schema

### `calendar_integrations` table
Stores OAuth tokens and integration status.

```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to user_profiles)
- provider: TEXT ('google', 'outlook', 'apple')
- access_token: TEXT
- refresh_token: TEXT
- token_expiry: TIMESTAMPTZ
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `study_schedule` table additions
Added `google_event_id` to track imported events.

```sql
- google_event_id: TEXT (nullable)
```

## Future Enhancements

- Two-way sync (create events in Google Calendar from the app)
- Sync with multiple calendars (personal, work, school)
- Outlook Calendar integration
- Apple Calendar integration
- Automatic periodic sync (every hour)
- Event conflict detection
- Smart event recommendations based on study patterns

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify environment variables are correctly set
4. Ensure database migration ran successfully
5. Check Google Cloud Console for API quota limits

## Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
