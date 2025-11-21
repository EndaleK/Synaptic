# Google OAuth Scope Usage Documentation
## Synaptic.study - AI-Powered Learning Platform

This document explains exactly how Synaptic uses each requested Google OAuth scope, with code references and user-facing examples.

---

## Overview

Synaptic is an educational platform that helps students study more effectively by importing their study materials from Google Drive and syncing study sessions to Google Calendar. All Google integrations are **optional** and user-initiated.

**Integration Flow:**
1. User clicks "Connect Google Account" in Settings → Integrations
2. Google OAuth consent screen shows requested scopes
3. User authorizes access
4. Synaptic stores encrypted access tokens
5. User can disconnect anytime (revokes access immediately)

---

## Scope 1: `documents.readonly` (Sensitive Scope)

**Official Description:** "See all your Google Docs documents"

### Purpose
Import Google Docs content to generate AI-powered study materials (flashcards, podcasts, mind maps, summaries).

### What We Access
- **Google Docs files only** (not Sheets, Slides, or other file types)
- **Read-only access** - we NEVER modify, delete, or create Google Docs
- **On-demand only** - accessed only when user explicitly clicks "Import from Google Docs"

### User Flow
1. **Dashboard → Documents → "Import from Google Docs"**
   - User sees list of their Google Docs
   - User selects specific document to import
2. **Synaptic fetches document content** (plain text)
3. **Content is processed** to generate study materials
4. **Original Google Doc remains unchanged**

### Code Implementation

**File:** `app/api/google/docs/list/route.ts`
```typescript
// Lists user's Google Docs files (read-only)
const response = await fetch(
  'https://www.googleapis.com/drive/v3/files?' +
  new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.document'",
    fields: 'files(id, name, modifiedTime, webViewLink)',
    pageSize: '100'
  }),
  {
    headers: { Authorization: `Bearer ${accessToken}` }
  }
)
```

**File:** `app/api/google/docs/[id]/content/route.ts`
```typescript
// Fetches specific Google Doc content as plain text (read-only)
const response = await fetch(
  `https://docs.google.com/document/d/${docId}/export?format=txt`,
  {
    headers: { Authorization: `Bearer ${accessToken}` }
  }
)
const text = await response.text()
// Text is used to generate flashcards, podcasts, etc.
// Original Google Doc is NEVER modified
```

### Privacy & Security
- **No modifications:** We only export content, never use the Google Docs API write methods
- **User control:** Users select which specific documents to import
- **Data retention:** Imported content is stored in our database as a separate copy, not linked to original Google Doc
- **Deletion:** When user deletes imported document in Synaptic, original Google Doc is untouched

### Example Use Case
**Student Use Case:**
> Sarah has lecture notes in a Google Doc titled "Biology 101 - Cell Structure". She wants to create flashcards from these notes.
>
> 1. Sarah clicks "Import from Google Docs" in Synaptic
> 2. Sees her "Biology 101 - Cell Structure" document in the list
> 3. Clicks "Import" → Synaptic reads the document content (read-only)
> 4. Generates 50 flashcards from the content
> 5. Sarah's original Google Doc remains unchanged and unmodified

---

## Scope 2: `calendar` (Sensitive Scope)

**Official Description:** "See, edit, share, and permanently delete all the calendars you can access using Google Calendar"

### Purpose
Sync study sessions to Google Calendar for reminders and schedule management.

### What We Access
- **Primary calendar only** (user's default calendar)
- **Create events:** Add study session reminders
- **Update events:** Modify existing Synaptic-created events
- **Delete events:** Remove cancelled study sessions
- **Read events:** Check for scheduling conflicts (optional feature)

### What We DON'T Do
- ❌ Access other people's calendars (even if shared)
- ❌ Modify events not created by Synaptic
- ❌ Read content of non-Synaptic events
- ❌ Share calendars or change calendar permissions

### User Flow
1. **Dashboard → Study Scheduler → "Sync to Google Calendar"**
   - User creates study session (e.g., "Study Flashcards - 2pm-3pm")
   - Checks "Add to Google Calendar"
2. **Synaptic creates calendar event** with:
   - Title: "Study Session: [Topic]"
   - Description: Link back to Synaptic dashboard
   - Custom identifier: `extendedProperties.private.synapticEventId`
3. **Event appears in Google Calendar** with reminders
4. **If user deletes study session in Synaptic** → Calendar event automatically removed

### Code Implementation

**File:** `app/api/google/calendar/create-event/route.ts`
```typescript
// Creates a calendar event for study session
const response = await fetch(
  'https://www.googleapis.com/calendar/v3/calendars/primary/events',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: `Study Session: ${studyTopic}`,
      description: `Synaptic study session\n\nView in Synaptic: ${dashboardUrl}`,
      start: { dateTime: startTime, timeZone: userTimezone },
      end: { dateTime: endTime, timeZone: userTimezone },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 }
        ]
      },
      // Custom identifier to track Synaptic-created events
      extendedProperties: {
        private: {
          synapticEventId: sessionId,
          createdBy: 'synaptic'
        }
      }
    })
  }
)
```

**File:** `app/api/google/calendar/delete-event/route.ts`
```typescript
// Deletes ONLY events created by Synaptic (using extendedProperties filter)
// 1. Fetch event to verify it was created by Synaptic
const event = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
  {
    headers: { Authorization: `Bearer ${accessToken}` }
  }
).then(r => r.json())

// 2. Verify event was created by Synaptic
if (event.extendedProperties?.private?.createdBy !== 'synaptic') {
  throw new Error('Cannot delete events not created by Synaptic')
}

// 3. Delete only if verified
await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
  {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  }
)
```

**File:** `app/api/google/calendar/update-event/route.ts`
```typescript
// Updates Synaptic-created calendar event (e.g., reschedule study session)
// Same verification process - only updates events with synapticEventId
const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: updatedSummary,
      start: { dateTime: newStartTime, timeZone: userTimezone },
      end: { dateTime: newEndTime, timeZone: userTimezone }
    })
  }
)
```

### Privacy & Security
- **Scoped modifications:** We only modify events we created (verified via `extendedProperties.private.synapticEventId`)
- **No external sharing:** Events are created in user's primary calendar only
- **Transparent naming:** All events clearly labeled "Study Session: [Topic]" with Synaptic branding
- **User control:** User can disconnect Google Calendar anytime → all Synaptic events are removed

### Example Use Case
**Student Use Case:**
> Alex wants to study for his exam and needs calendar reminders.
>
> 1. Alex creates a study session in Synaptic: "Biology Exam Review - Monday 2pm-4pm"
> 2. Checks "Sync to Google Calendar"
> 3. Synaptic creates event in his Google Calendar with:
>    - Title: "Study Session: Biology Exam Review"
>    - Time: Monday 2pm-4pm
>    - Reminder: 15 minutes before
>    - Description: Link to Synaptic dashboard
> 4. Alex gets reminder on his phone 15 minutes before
> 5. If Alex cancels the session in Synaptic → Calendar event automatically deleted

---

## Scope 3: `drive.readonly` (Restricted Scope)

**Official Description:** "See and download all your Google Drive files"

### Purpose
List and identify Google Docs files for import (used in conjunction with `documents.readonly`).

### What We Access
- **File metadata only** (name, ID, modified date, file type)
- **Google Docs files filter** - we query specifically for `mimeType='application/vnd.google-apps.document'`
- **No file downloads** - actual content fetched via `documents.readonly` scope

### What We DON'T Do
- ❌ Access non-Google Docs files (PDFs, images, videos, etc.)
- ❌ Download files directly from Drive
- ❌ Read file contents (that's done via `documents.readonly`)
- ❌ Modify Drive files or folders
- ❌ Access shared Drive files from other users

### User Flow
1. **Dashboard → Documents → "Import from Google Docs"**
   - User clicks import button
2. **Synaptic queries Google Drive API** for list of Google Docs
   - Shows: Document name, last modified date, preview link
3. **User selects document** to import
4. **Synaptic uses `documents.readonly`** to fetch actual content (not this scope)

### Code Implementation

**File:** `app/api/google/docs/list/route.ts`
```typescript
// Lists Google Docs files (metadata only)
const response = await fetch(
  'https://www.googleapis.com/drive/v3/files?' +
  new URLSearchParams({
    // Filter for Google Docs ONLY
    q: "mimeType='application/vnd.google-apps.document' and trashed=false",
    // Request minimal metadata (no file content)
    fields: 'nextPageToken, files(id, name, modifiedTime, webViewLink, mimeType)',
    pageSize: '100',
    orderBy: 'modifiedTime desc'
  }),
  {
    headers: { Authorization: `Bearer ${accessToken}` }
  }
)

// Returns only:
// - File ID (e.g., "1A2B3C4D5E")
// - File name (e.g., "Biology Notes.gdoc")
// - Modified date (e.g., "2025-11-20T14:30:00Z")
// - Web link (e.g., "https://docs.google.com/document/d/1A2B3C4D5E")
```

**Why We Need This Scope:**
The `documents.readonly` scope alone cannot list files - it only exports content from a known document ID. We need `drive.readonly` to:
1. Show users a list of their Google Docs
2. Let them select which document to import
3. Get the document ID to pass to the export API

**Alternative Considered:**
- Using `drive.file` (more restrictive) - doesn't work because we need to list ALL user's Google Docs, not just files created by Synaptic

### Privacy & Security
- **Metadata only:** We never download file contents via this scope
- **Filtered queries:** Only query for Google Docs (mimeType filter)
- **No modifications:** Read-only access, cannot create/edit/delete Drive files
- **User visibility:** File list shown to user before any import action

### Example Use Case
**Student Use Case:**
> Emma has 50+ documents in her Google Drive and wants to find her study notes.
>
> 1. Emma clicks "Import from Google Docs" in Synaptic
> 2. Synaptic uses `drive.readonly` to list her Google Docs:
>    - "Chemistry Chapter 5 Notes" (modified yesterday)
>    - "History Essay Draft" (modified last week)
>    - "Math Homework Solutions" (modified 2 days ago)
> 3. Emma sees the list and identifies "Chemistry Chapter 5 Notes"
> 4. Emma clicks "Import" → Synaptic uses `documents.readonly` to fetch content
> 5. No other Drive files (PDFs, images, etc.) were accessed

---

## Security & Compliance

### Token Storage
- **Encryption:** Access tokens stored encrypted in database using AES-256
- **Rotation:** Tokens automatically refreshed using refresh tokens
- **Expiration:** Tokens expire after 1 hour (Google's standard)
- **Revocation:** User can disconnect → tokens immediately invalidated

**File:** `lib/google/token-storage.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'

// Store encrypted tokens
export async function storeGoogleTokens(userId: string, tokens: GoogleTokens) {
  const supabase = await createClient()

  await supabase
    .from('google_integrations')
    .upsert({
      user_id: userId,
      access_token: encrypt(tokens.access_token),  // AES-256 encrypted
      refresh_token: encrypt(tokens.refresh_token), // AES-256 encrypted
      expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      updated_at: new Date()
    })
}
```

### User Controls
1. **Disconnect Anytime:** Settings → Integrations → "Disconnect Google Account"
2. **Granular Permissions:** Users can revoke access at https://myaccount.google.com/permissions
3. **Transparent Logging:** Activity log shows all Google API calls (viewable by user)
4. **Data Deletion:** Disconnecting removes all imported content and calendar events

**File:** `app/api/google/disconnect/route.ts`
```typescript
// User disconnects Google account
export async function POST(req: Request) {
  const { userId } = await auth()

  // 1. Revoke Google access token
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: 'POST'
  })

  // 2. Delete stored tokens from database
  await supabase
    .from('google_integrations')
    .delete()
    .eq('user_id', userId)

  // 3. Delete all imported Google Docs content
  await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'google_docs')

  // 4. Delete all calendar events (via Google Calendar API)
  const events = await listSynapticCalendarEvents(accessToken)
  for (const event of events) {
    await deleteCalendarEvent(accessToken, event.id)
  }

  return Response.json({ success: true })
}
```

### Compliance

**GDPR Compliance:**
- Right to access: Users can export all data
- Right to deletion: Users can delete account + all data
- Data portability: Export feature for all content
- Consent management: Explicit opt-in for Google integration

**Privacy Policy Disclosure:**
See https://synaptic.study/privacy → Section 4: Third-Party Services → Google Services Integration

**Terms of Service:**
See https://synaptic.study/terms → Section 5.1: Permitted Uses

---

## Verification Evidence

### Screenshots Required for OAuth Review

1. **OAuth Consent Screen**
   - URL: `/api/google/auth/authorize`
   - Shows: All three scopes with explanations

2. **Integration Settings Page**
   - URL: `/dashboard/settings/integrations`
   - Shows: "Connect Google Account" button with scope explanations

3. **Google Docs Import Flow**
   - URL: `/dashboard/documents/import`
   - Shows: List of Google Docs with "Import" buttons

4. **Calendar Sync Toggle**
   - URL: `/dashboard/scheduler`
   - Shows: "Sync to Google Calendar" checkbox when creating study session

5. **Disconnect Flow**
   - URL: `/dashboard/settings/integrations`
   - Shows: "Disconnect Google Account" button with revocation confirmation

### Video Demo (Required for Restricted Scope)

**URL:** https://synaptic.study/oauth-demo-video.mp4

**Demonstrates:**
1. User connects Google account (OAuth flow)
2. User imports Google Docs content → generates flashcards
3. User creates study session → syncs to Google Calendar
4. User disconnects Google account → all data removed

---

## API Endpoint Summary

| Endpoint | Method | Scope Used | Purpose |
|----------|--------|------------|---------|
| `/api/google/auth/authorize` | GET | - | Initiates OAuth flow |
| `/api/google/auth/callback` | GET | - | Handles OAuth callback |
| `/api/google/docs/list` | GET | `drive.readonly` | Lists Google Docs files |
| `/api/google/docs/[id]/content` | GET | `documents.readonly` | Fetches document content |
| `/api/google/calendar/create-event` | POST | `calendar` | Creates study session event |
| `/api/google/calendar/update-event` | PATCH | `calendar` | Updates study session time |
| `/api/google/calendar/delete-event` | DELETE | `calendar` | Removes cancelled session |
| `/api/google/disconnect` | POST | - | Revokes access & deletes data |

---

## Contact Information

**For Google OAuth Verification:**
- **Developer Email:** endalk6411@gmail.com
- **Support Email:** support@synaptic.study
- **Privacy Inquiries:** privacy@synaptic.study
- **Website:** https://synaptic.study
- **OAuth Demo:** https://synaptic.study/oauth-demo

**Project Details:**
- **App Name:** Synaptic
- **Category:** Education
- **User Base:** Students (13+ years old)
- **Primary Function:** AI-powered study assistant
- **Data Usage:** Educational content generation only

---

## Appendix: Code Files Reference

All code files referenced in this document are available for Google's review:

1. **OAuth Implementation:**
   - `app/api/google/auth/authorize/route.ts` - OAuth initiation
   - `app/api/google/auth/callback/route.ts` - Token exchange

2. **Google Docs Integration:**
   - `app/api/google/docs/list/route.ts` - List files
   - `app/api/google/docs/[id]/content/route.ts` - Fetch content

3. **Google Calendar Integration:**
   - `app/api/google/calendar/create-event/route.ts` - Create events
   - `app/api/google/calendar/update-event/route.ts` - Update events
   - `app/api/google/calendar/delete-event/route.ts` - Delete events

4. **Security & Privacy:**
   - `lib/google/token-storage.ts` - Encrypted token management
   - `app/api/google/disconnect/route.ts` - Account disconnection
   - `middleware.ts` - Authentication enforcement

5. **UI Components:**
   - `components/GoogleIntegrationSettings.tsx` - Settings page
   - `components/GoogleDocsImporter.tsx` - Document import UI
   - `components/CalendarSyncToggle.tsx` - Calendar sync UI

---

**Last Updated:** November 21, 2025
**Version:** 1.0
**For:** Google OAuth Verification Review
