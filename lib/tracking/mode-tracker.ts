/**
 * Mode Tracker - Client-side tracking for mode selection events
 *
 * Tracks which study modes users engage with to infer behavioral learning style.
 * Data is sent to /api/tracking/mode-selection for processing.
 */

export type TrackableMode =
  | 'flashcards'
  | 'chat'
  | 'podcast'
  | 'quick-summary'
  | 'exam'
  | 'mindmap'
  | 'writer'
  | 'video'
  | 'studyguide'
  | 'classes'

export type SelectionSource =
  | 'dashboard'
  | 'sidebar'
  | 'recommendation'
  | 'bottom_nav'
  | 'keyboard_shortcut'
  | 'study_buddy'

interface ModeSelectionEvent {
  mode: TrackableMode
  source: SelectionSource
  documentId?: string
  isFirstAction?: boolean
}

interface ModeSessionUpdate {
  eventId: string
  durationSeconds: number
  actionCompleted: boolean
}

// Track the current mode session for duration calculation
let currentModeSession: {
  eventId: string | null
  mode: TrackableMode | null
  startTime: number | null
} = {
  eventId: null,
  mode: null,
  startTime: null,
}

/**
 * Track a mode selection event.
 * Call this when a user selects a study mode from dashboard, sidebar, etc.
 *
 * @param mode - The study mode selected
 * @param source - Where the selection originated
 * @param documentId - Optional document ID if mode was selected with a document
 * @returns The event ID for updating duration later
 */
export async function trackModeSelection(
  mode: TrackableMode,
  source: SelectionSource,
  documentId?: string
): Promise<string | null> {
  // End previous session if exists
  if (currentModeSession.eventId && currentModeSession.startTime) {
    await endModeSession(false)
  }

  try {
    const response = await fetch('/api/tracking/mode-selection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        mode,
        source,
        documentId,
        isFirstAction: !currentModeSession.mode, // First action if no previous mode
      } satisfies ModeSelectionEvent),
    })

    if (!response.ok) {
      console.error('[ModeTracker] Failed to track mode selection:', response.status)
      return null
    }

    const data = await response.json()
    const eventId = data.eventId

    // Start tracking this session
    currentModeSession = {
      eventId,
      mode,
      startTime: Date.now(),
    }

    return eventId
  } catch (error) {
    console.error('[ModeTracker] Error tracking mode selection:', error)
    return null
  }
}

/**
 * End the current mode session and update duration.
 * Call this when user leaves the mode or completes an action.
 *
 * @param actionCompleted - Whether the user completed a meaningful action
 */
export async function endModeSession(actionCompleted: boolean = false): Promise<void> {
  if (!currentModeSession.eventId || !currentModeSession.startTime) {
    return
  }

  const durationSeconds = Math.floor((Date.now() - currentModeSession.startTime) / 1000)
  const eventId = currentModeSession.eventId

  // Clear session immediately to prevent double-updates
  currentModeSession = {
    eventId: null,
    mode: null,
    startTime: null,
  }

  // Only update if duration is meaningful (at least 5 seconds)
  if (durationSeconds < 5) {
    return
  }

  try {
    await fetch('/api/tracking/mode-selection', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        eventId,
        durationSeconds,
        actionCompleted,
      } satisfies ModeSessionUpdate),
    })
  } catch (error) {
    console.error('[ModeTracker] Error updating mode session:', error)
  }
}

/**
 * Mark that the user completed a meaningful action in the current mode.
 * This increases the weight of this session in behavioral analysis.
 */
export async function markActionCompleted(): Promise<void> {
  if (!currentModeSession.eventId) {
    return
  }

  try {
    await fetch('/api/tracking/mode-selection', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        eventId: currentModeSession.eventId,
        durationSeconds: currentModeSession.startTime
          ? Math.floor((Date.now() - currentModeSession.startTime) / 1000)
          : 0,
        actionCompleted: true,
      } satisfies ModeSessionUpdate),
    })
  } catch (error) {
    console.error('[ModeTracker] Error marking action completed:', error)
  }
}

/**
 * Get the current mode being tracked.
 */
export function getCurrentMode(): TrackableMode | null {
  return currentModeSession.mode
}

/**
 * Get the current session duration in seconds.
 */
export function getCurrentSessionDuration(): number {
  if (!currentModeSession.startTime) {
    return 0
  }
  return Math.floor((Date.now() - currentModeSession.startTime) / 1000)
}

// Track page visibility to end session when user leaves
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentModeSession.eventId) {
      endModeSession(false)
    }
  })

  // Track before unload
  window.addEventListener('beforeunload', () => {
    if (currentModeSession.eventId) {
      // Use sendBeacon for reliable delivery during page unload
      const data = JSON.stringify({
        eventId: currentModeSession.eventId,
        durationSeconds: currentModeSession.startTime
          ? Math.floor((Date.now() - currentModeSession.startTime) / 1000)
          : 0,
        actionCompleted: false,
      })

      navigator.sendBeacon('/api/tracking/mode-selection?method=PATCH', data)
    }
  })
}
