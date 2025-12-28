/**
 * Simple Analytics Tracking for Retention Metrics
 *
 * Tracks key user actions to understand:
 * - Where users drop off
 * - Time to first value
 * - Feature adoption rates
 * - Session patterns
 */

export type EventName =
  | 'page_view'
  | 'document_uploaded'
  | 'flashcard_generated'
  | 'flashcard_reviewed'
  | 'podcast_generated'
  | 'mindmap_generated'
  | 'session_started'
  | 'session_completed'
  | 'chat_message_sent'
  | 'streak_milestone'
  | 'notification_clicked'

interface TrackEventOptions {
  properties?: Record<string, unknown>
  pagePath?: string
}

/**
 * Get or create a session ID for grouping events
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'

  let sessionId = sessionStorage.getItem('analytics-session-id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('analytics-session-id', sessionId)
  }
  return sessionId
}

/**
 * Track an analytics event
 * Silently fails - analytics should never break the app
 */
export async function trackEvent(
  eventName: EventName,
  options: TrackEventOptions = {}
): Promise<void> {
  // Skip during SSR
  if (typeof window === 'undefined') return

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventName,
        properties: options.properties || {},
        pagePath: options.pagePath || window.location.pathname,
        sessionId: getSessionId()
      })
    })
  } catch (error) {
    // Silent fail - analytics shouldn't break the app
    console.debug('[Analytics] Track failed:', error)
  }
}

/**
 * Convenience functions for common events
 */
export const analytics = {
  /**
   * Track page view
   */
  pageView: (path?: string) =>
    trackEvent('page_view', { pagePath: path }),

  /**
   * Track document upload
   */
  documentUploaded: (fileType: string, fileSize: number) =>
    trackEvent('document_uploaded', {
      properties: { fileType, fileSize, fileSizeMB: Math.round(fileSize / 1024 / 1024 * 100) / 100 }
    }),

  /**
   * Track flashcard generation
   */
  flashcardGenerated: (count: number, documentId: string) =>
    trackEvent('flashcard_generated', {
      properties: { count, documentId }
    }),

  /**
   * Track flashcard review (SM-2)
   */
  flashcardReviewed: (quality: number, cardId?: string) =>
    trackEvent('flashcard_reviewed', {
      properties: { quality, cardId }
    }),

  /**
   * Track podcast generation
   */
  podcastGenerated: (documentId: string, durationSeconds: number) =>
    trackEvent('podcast_generated', {
      properties: { documentId, durationSeconds }
    }),

  /**
   * Track mind map generation
   */
  mindmapGenerated: (documentId: string, nodeCount: number) =>
    trackEvent('mindmap_generated', {
      properties: { documentId, nodeCount }
    }),

  /**
   * Track study session start
   */
  sessionStarted: (sessionType: string, documentId?: string) =>
    trackEvent('session_started', {
      properties: { sessionType, documentId }
    }),

  /**
   * Track study session completion
   */
  sessionCompleted: (durationMinutes: number, cardsReviewed?: number) =>
    trackEvent('session_completed', {
      properties: { durationMinutes, cardsReviewed }
    }),

  /**
   * Track chat message sent
   */
  chatMessageSent: (documentId?: string) =>
    trackEvent('chat_message_sent', {
      properties: { documentId }
    }),

  /**
   * Track streak milestone achieved
   */
  streakMilestone: (days: number, milestoneName: string) =>
    trackEvent('streak_milestone', {
      properties: { days, milestoneName }
    }),

  /**
   * Track notification click
   */
  notificationClicked: (notificationType: string) =>
    trackEvent('notification_clicked', {
      properties: { notificationType }
    }),
}

export default analytics
