/**
 * Notification Utility Library
 * Handles browser notifications with permission management and quiet hours
 */

export type NotificationType = 'study_reminder' | 'break_alert' | 'due_flashcards' | 'streak_reminder' | 'session_complete'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
  data?: any
}

export interface NotificationPreferences {
  enabled: boolean
  studyReminders: boolean
  breakAlerts: boolean
  dueFlashcards: boolean
  streakReminders: boolean
  soundEnabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
}

class NotificationManager {
  private permission: NotificationPermission = 'default'
  private preferences: NotificationPreferences = {
    enabled: true,
    studyReminders: true,
    breakAlerts: true,
    dueFlashcards: true,
    streakReminders: true,
    soundEnabled: true
  }

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
    }
  }

  /**
   * Request permission to show notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications')
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Check if notifications are supported and permitted
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.permission === 'granted' && this.preferences.enabled
  }

  /**
   * Update notification preferences
   */
  setPreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...preferences
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  isQuietHours(): boolean {
    if (!this.preferences.quietHoursStart || !this.preferences.quietHoursEnd) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const [startHour, startMin] = this.preferences.quietHoursStart.split(':').map(Number)
    const [endHour, endMin] = this.preferences.quietHoursEnd.split(':').map(Number)

    const quietStart = startHour * 60 + startMin
    const quietEnd = endHour * 60 + endMin

    // Handle cases where quiet hours span midnight
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd
    }

    return currentTime >= quietStart && currentTime <= quietEnd
  }

  /**
   * Check if a notification type is enabled
   */
  isTypeEnabled(type: NotificationType): boolean {
    switch (type) {
      case 'study_reminder':
        return this.preferences.studyReminders
      case 'break_alert':
        return this.preferences.breakAlerts
      case 'due_flashcards':
        return this.preferences.dueFlashcards
      case 'streak_reminder':
        return this.preferences.streakReminders
      case 'session_complete':
        return true // Always show session completion
      default:
        return true
    }
  }

  /**
   * Show a notification
   */
  async show(
    type: NotificationType,
    options: NotificationOptions
  ): Promise<Notification | null> {
    // Check if notifications are enabled
    if (!this.isEnabled()) {
      console.log('Notifications are not enabled')
      return null
    }

    // Check if this notification type is enabled
    if (!this.isTypeEnabled(type)) {
      console.log(`Notification type ${type} is disabled`)
      return null
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      console.log('Notifications are silenced during quiet hours')
      return null
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: options.tag || type,
        requireInteraction: options.requireInteraction || false,
        data: options.data,
        silent: !this.preferences.soundEnabled
      })

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        notification.close()

        // Handle navigation based on notification type
        if (options.data?.url) {
          window.location.href = options.data.url
        }
      }

      return notification
    } catch (error) {
      console.error('Failed to show notification:', error)
      return null
    }
  }

  /**
   * Show study reminder notification
   */
  async showStudyReminder(title: string, time: string, eventId?: string): Promise<Notification | null> {
    return this.show('study_reminder', {
      title: '📚 Study Reminder',
      body: `${title} starts in ${time}`,
      tag: `study-reminder-${eventId}`,
      requireInteraction: false,
      data: {
        url: '/dashboard/calendar',
        eventId
      }
    })
  }

  /**
   * Show break alert notification
   */
  async showBreakAlert(): Promise<Notification | null> {
    return this.show('break_alert', {
      title: '👀 Time for a Break!',
      body: 'Take a 20-second break and look 20 feet away to rest your eyes.',
      tag: 'break-alert',
      requireInteraction: false,
      data: {
        url: '/dashboard'
      }
    })
  }

  /**
   * Show due flashcards notification
   */
  async showDueFlashcards(count: number): Promise<Notification | null> {
    return this.show('due_flashcards', {
      title: '🧠 Flashcards Ready!',
      body: `You have ${count} flashcard${count !== 1 ? 's' : ''} ready for review.`,
      tag: 'due-flashcards',
      requireInteraction: false,
      data: {
        url: '/dashboard/study'
      }
    })
  }

  /**
   * Show streak reminder notification
   */
  async showStreakReminder(days: number): Promise<Notification | null> {
    return this.show('streak_reminder', {
      title: '🔥 Keep Your Streak Going!',
      body: `You have a ${days}-day study streak. Don't break it today!`,
      tag: 'streak-reminder',
      requireInteraction: false,
      data: {
        url: '/dashboard'
      }
    })
  }

  /**
   * Show session complete notification
   */
  async showSessionComplete(duration: number, cardsReviewed?: number): Promise<Notification | null> {
    const body = cardsReviewed
      ? `Great job! You studied for ${duration} minutes and reviewed ${cardsReviewed} cards.`
      : `Great job! You studied for ${duration} minutes.`

    return this.show('session_complete', {
      title: '✅ Session Complete!',
      body,
      tag: 'session-complete',
      requireInteraction: false,
      data: {
        url: '/dashboard/statistics'
      }
    })
  }

  /**
   * Schedule a notification for a future time
   */
  scheduleNotification(
    type: NotificationType,
    options: NotificationOptions,
    delayMs: number
  ): number {
    return window.setTimeout(() => {
      this.show(type, options)
    }, delayMs)
  }

  /**
   * Cancel a scheduled notification
   */
  cancelScheduledNotification(timeoutId: number): void {
    clearTimeout(timeoutId)
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager()

/**
 * Hook for React components
 */
export function useNotifications() {
  const requestPermission = () => notificationManager.requestPermission()
  const isSupported = () => notificationManager.isSupported()
  const isEnabled = () => notificationManager.isEnabled()

  return {
    requestPermission,
    isSupported,
    isEnabled,
    show: (type: NotificationType, options: NotificationOptions) =>
      notificationManager.show(type, options),
    showStudyReminder: (title: string, time: string, eventId?: string) =>
      notificationManager.showStudyReminder(title, time, eventId),
    showBreakAlert: () => notificationManager.showBreakAlert(),
    showDueFlashcards: (count: number) => notificationManager.showDueFlashcards(count),
    showStreakReminder: (days: number) => notificationManager.showStreakReminder(days),
    showSessionComplete: (duration: number, cardsReviewed?: number) =>
      notificationManager.showSessionComplete(duration, cardsReviewed),
    setPreferences: (preferences: Partial<NotificationPreferences>) =>
      notificationManager.setPreferences(preferences)
  }
}
