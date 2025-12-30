/**
 * Study Reminder Templates and Utilities
 *
 * Provides message templates for different reminder triggers:
 * - Time-based: Idle, session length, daily check-in
 * - Smart: Due flashcards, streak at risk, study goals
 */

export type ReminderType =
  | 'idle'
  | 'session_break'
  | 'daily_checkin'
  | 'due_flashcards'
  | 'streak_at_risk'
  | 'study_goal_unmet'
  | 'new_content'

export interface ReminderMessage {
  type: ReminderType
  title: string
  message: string
  emoji: string
  primaryAction: {
    label: string
    action: 'review' | 'break' | 'continue' | 'dismiss' | 'open_study_buddy'
  }
  secondaryAction?: {
    label: string
    action: 'dismiss' | 'snooze' | 'settings'
  }
  priority: 'low' | 'medium' | 'high'
  autoDismissSeconds: number
}

// Reminder message templates with friendly buddy tone
const reminderTemplates: Record<ReminderType, (data?: Record<string, unknown>) => ReminderMessage> = {
  idle: () => ({
    type: 'idle',
    title: 'Hey there!',
    message: "Ready to jump back in? A quick study session can work wonders!",
    emoji: '👋',
    primaryAction: {
      label: 'Let\'s go!',
      action: 'open_study_buddy'
    },
    secondaryAction: {
      label: 'Later',
      action: 'dismiss'
    },
    priority: 'low',
    autoDismissSeconds: 15
  }),

  session_break: () => ({
    type: 'session_break',
    title: 'Time for a break?',
    message: "You've been at it for a while! Take 5, or knock out some flashcards?",
    emoji: '☕',
    primaryAction: {
      label: 'Quick review',
      action: 'review'
    },
    secondaryAction: {
      label: 'Take a break',
      action: 'break'
    },
    priority: 'low',
    autoDismissSeconds: 20
  }),

  daily_checkin: (data) => ({
    type: 'daily_checkin',
    title: 'Welcome back!',
    message: data?.dueCards
      ? `You have ${data.dueCards} cards waiting for review today. Let's make some progress!`
      : "Ready to learn something new today?",
    emoji: '🌟',
    primaryAction: {
      label: data?.dueCards ? 'Start review' : 'Let\'s go',
      action: data?.dueCards ? 'review' : 'open_study_buddy'
    },
    secondaryAction: {
      label: 'Not now',
      action: 'dismiss'
    },
    priority: 'medium',
    autoDismissSeconds: 20
  }),

  due_flashcards: (data) => ({
    type: 'due_flashcards',
    title: 'Cards waiting!',
    message: `You've got ${data?.count || 'some'} flashcards ready for review. Want to keep your memory sharp?`,
    emoji: '📚',
    primaryAction: {
      label: 'Review now',
      action: 'review'
    },
    secondaryAction: {
      label: 'Remind me later',
      action: 'snooze'
    },
    priority: 'medium',
    autoDismissSeconds: 15
  }),

  streak_at_risk: (data) => ({
    type: 'streak_at_risk',
    title: 'Streak alert!',
    message: `Your ${data?.streakDays || ''}-day streak is at risk! A quick review keeps it alive.`,
    emoji: '🔥',
    primaryAction: {
      label: 'Save my streak!',
      action: 'review'
    },
    secondaryAction: {
      label: 'I\'ll do it later',
      action: 'dismiss'
    },
    priority: 'high',
    autoDismissSeconds: 30
  }),

  study_goal_unmet: (data) => ({
    type: 'study_goal_unmet',
    title: 'Almost there!',
    message: `You're ${data?.percentComplete || 0}% to your daily goal. Just ${data?.minutesNeeded || 10} more minutes!`,
    emoji: '🎯',
    primaryAction: {
      label: 'Let\'s finish it',
      action: 'continue'
    },
    secondaryAction: {
      label: 'Skip today',
      action: 'dismiss'
    },
    priority: 'medium',
    autoDismissSeconds: 20
  }),

  new_content: (data) => ({
    type: 'new_content',
    title: 'New material!',
    message: `Ready to create flashcards from "${data?.documentName || 'your new upload'}"?`,
    emoji: '✨',
    primaryAction: {
      label: 'Create flashcards',
      action: 'open_study_buddy'
    },
    secondaryAction: {
      label: 'Maybe later',
      action: 'dismiss'
    },
    priority: 'low',
    autoDismissSeconds: 15
  })
}

/**
 * Get a reminder message for a specific type
 */
export function getReminderMessage(
  type: ReminderType,
  data?: Record<string, unknown>
): ReminderMessage {
  const template = reminderTemplates[type]
  return template(data)
}

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(quietStart: number, quietEnd: number): boolean {
  const now = new Date()
  const currentHour = now.getHours()

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (quietStart > quietEnd) {
    return currentHour >= quietStart || currentHour < quietEnd
  }

  // Handle same-day quiet hours (e.g., 13:00 - 15:00)
  return currentHour >= quietStart && currentHour < quietEnd
}

/**
 * Calculate minutes since last activity
 */
export function getMinutesSinceActivity(lastActivityTimestamp: number): number {
  const now = Date.now()
  const diffMs = now - lastActivityTimestamp
  return Math.floor(diffMs / (1000 * 60))
}

/**
 * Calculate hours since session start
 */
export function getHoursSinceSessionStart(sessionStartTimestamp: number): number {
  const now = Date.now()
  const diffMs = now - sessionStartTimestamp
  return diffMs / (1000 * 60 * 60)
}

/**
 * Check if it's the first visit of the day
 */
export function isFirstVisitToday(lastVisitTimestamp: number): boolean {
  const now = new Date()
  const lastVisit = new Date(lastVisitTimestamp)

  return now.toDateString() !== lastVisit.toDateString()
}

/**
 * Get hours until midnight (for streak risk calculation)
 */
export function getHoursUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)

  const diffMs = midnight.getTime() - now.getTime()
  return diffMs / (1000 * 60 * 60)
}
