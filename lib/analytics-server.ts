/**
 * Server-side Analytics Tracking
 *
 * Used in API routes to track events where the client-side library isn't available.
 * Uses the service role to insert events directly, bypassing RLS.
 */

import { createClient } from '@/lib/supabase/server'

export type ServerEventName =
  | 'document_uploaded'
  | 'flashcard_generated'
  | 'podcast_generated'
  | 'mindmap_generated'
  | 'session_started'
  | 'session_completed'

interface TrackEventOptions {
  userId: string  // Clerk user ID
  properties?: Record<string, unknown>
  pagePath?: string
}

/**
 * Track an analytics event from the server
 * Silently fails - analytics should never break the app
 */
export async function trackServerEvent(
  eventName: ServerEventName,
  options: TrackEventOptions
): Promise<void> {
  try {
    const supabase = await createClient()

    // Look up user profile ID from Clerk user ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', options.userId)
      .single()

    const userProfileId = profile?.id || null

    // Insert analytics event
    await supabase.from('analytics_events').insert({
      user_id: userProfileId,
      event_name: eventName,
      event_properties: options.properties || {},
      page_path: options.pagePath || null,
      session_id: null // Server-side events don't have browser session
    })
  } catch (error) {
    // Silent fail - analytics shouldn't break the app
    console.debug('[Analytics Server] Track failed:', error)
  }
}

/**
 * Convenience functions for server-side events
 */
export const serverAnalytics = {
  /**
   * Track flashcard generation
   */
  flashcardGenerated: (userId: string, count: number, documentId?: string) =>
    trackServerEvent('flashcard_generated', {
      userId,
      properties: { count, documentId }
    }),

  /**
   * Track document upload
   */
  documentUploaded: (userId: string, fileType: string, fileSize: number) =>
    trackServerEvent('document_uploaded', {
      userId,
      properties: { fileType, fileSize, fileSizeMB: Math.round(fileSize / 1024 / 1024 * 100) / 100 }
    }),

  /**
   * Track podcast generation
   */
  podcastGenerated: (userId: string, documentId: string, durationSeconds: number) =>
    trackServerEvent('podcast_generated', {
      userId,
      properties: { documentId, durationSeconds }
    }),

  /**
   * Track mind map generation
   */
  mindmapGenerated: (userId: string, documentId: string, nodeCount: number) =>
    trackServerEvent('mindmap_generated', {
      userId,
      properties: { documentId, nodeCount }
    }),
}

export default serverAnalytics
