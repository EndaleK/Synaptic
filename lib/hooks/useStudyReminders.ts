/**
 * useStudyReminders Hook
 *
 * Manages smart study reminder triggers:
 * - Time-based: Idle detection, session breaks, daily check-in
 * - Smart: Due flashcards, streak at risk, study goals
 *
 * Respects quiet hours and user preferences
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useStudyBuddyStore } from '@/lib/store/useStudyBuddyStore'
import {
  ReminderMessage,
  ReminderType,
  getReminderMessage,
  isQuietHours,
  getMinutesSinceActivity,
  isFirstVisitToday,
  getHoursUntilMidnight
} from '@/lib/study-reminders'

interface StudyStats {
  totalCardsToReview: number
  currentStreak: number
  dailyGoalProgress: number // 0-100
  dailyGoalMinutes: number
  minutesStudiedToday: number
}

interface UseStudyRemindersOptions {
  enabled?: boolean
  onReminderTriggered?: (reminder: ReminderMessage) => void
}

interface UseStudyRemindersReturn {
  currentReminder: ReminderMessage | null
  dismissReminder: () => void
  snoozeReminder: (minutes?: number) => void
  triggerReminder: (type: ReminderType, data?: Record<string, unknown>) => void
}

// Snooze duration in milliseconds (default: 30 minutes)
const DEFAULT_SNOOZE_MS = 30 * 60 * 1000

// Minimum time between reminders (5 minutes)
const MIN_REMINDER_INTERVAL_MS = 5 * 60 * 1000

// Check interval for triggers (1 minute)
const CHECK_INTERVAL_MS = 60 * 1000

export function useStudyReminders(
  options: UseStudyRemindersOptions = {}
): UseStudyRemindersReturn {
  const { enabled = true, onReminderTriggered } = options

  const [currentReminder, setCurrentReminder] = useState<ReminderMessage | null>(null)
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null)
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0)
  const [sessionStartTime] = useState<number>(Date.now())
  const [hasShownDailyCheckin, setHasShownDailyCheckin] = useState(false)

  const lastReminderTimeRef = useRef<number>(0)
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null)

  const {
    reminderPreferences,
    lastActivityTimestamp,
    lastReminderTimestamp,
    updateLastReminder
  } = useStudyBuddyStore()

  // Fetch study stats periodically
  const fetchStudyStats = useCallback(async () => {
    try {
      const [reviewRes, statsRes] = await Promise.all([
        fetch('/api/flashcards/review-queue'),
        fetch('/api/study-statistics')
      ])

      if (reviewRes.ok && statsRes.ok) {
        const reviewData = await reviewRes.json()
        const statsData = await statsRes.json()

        setStudyStats({
          totalCardsToReview: reviewData.cards?.length || 0,
          currentStreak: statsData.streak?.currentStreak || 0,
          dailyGoalProgress: statsData.dailyProgress?.percentage || 0,
          dailyGoalMinutes: statsData.dailyProgress?.goalMinutes || 30,
          minutesStudiedToday: statsData.dailyProgress?.minutesStudied || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch study stats for reminders:', error)
    }
  }, [])

  // Show a reminder
  const triggerReminder = useCallback((
    type: ReminderType,
    data?: Record<string, unknown>
  ) => {
    // Check if we're in quiet hours
    if (isQuietHours(
      reminderPreferences.quietHoursStart,
      reminderPreferences.quietHoursEnd
    )) {
      return
    }

    // Check if we're snoozed
    if (Date.now() < snoozedUntil) {
      return
    }

    // Check minimum interval between reminders
    if (Date.now() - lastReminderTimeRef.current < MIN_REMINDER_INTERVAL_MS) {
      return
    }

    const reminder = getReminderMessage(type, data)
    setCurrentReminder(reminder)
    lastReminderTimeRef.current = Date.now()
    updateLastReminder()

    // Trigger callback
    onReminderTriggered?.(reminder)

    // Set up auto-dismiss
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current)
    }

    autoDismissTimerRef.current = setTimeout(() => {
      setCurrentReminder(null)
    }, reminder.autoDismissSeconds * 1000)
  }, [reminderPreferences, snoozedUntil, updateLastReminder, onReminderTriggered])

  // Dismiss current reminder
  const dismissReminder = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current)
    }
    setCurrentReminder(null)
  }, [])

  // Snooze reminders for a period
  const snoozeReminder = useCallback((minutes?: number) => {
    const snoozeMs = minutes ? minutes * 60 * 1000 : DEFAULT_SNOOZE_MS
    setSnoozedUntil(Date.now() + snoozeMs)
    dismissReminder()
  }, [dismissReminder])

  // Check for trigger conditions
  const checkTriggers = useCallback(() => {
    if (!enabled || !reminderPreferences.enabled || currentReminder) {
      return
    }

    // Check idle reminder
    const minutesIdle = getMinutesSinceActivity(lastActivityTimestamp)
    if (minutesIdle >= reminderPreferences.idleReminderMinutes) {
      triggerReminder('idle')
      return
    }

    // Check session break (every X hours of active use)
    const hoursInSession = (Date.now() - sessionStartTime) / (1000 * 60 * 60)
    if (hoursInSession >= reminderPreferences.sessionPromptHours) {
      triggerReminder('session_break')
      return
    }

    // Smart triggers (require study stats)
    if (!studyStats) return

    // Check due flashcards
    if (
      studyStats.totalCardsToReview >= reminderPreferences.dueCardsThreshold
    ) {
      triggerReminder('due_flashcards', { count: studyStats.totalCardsToReview })
      return
    }

    // Check streak at risk
    if (
      reminderPreferences.streakReminderEnabled &&
      studyStats.currentStreak > 0 &&
      studyStats.minutesStudiedToday === 0 &&
      getHoursUntilMidnight() < 2
    ) {
      triggerReminder('streak_at_risk', { streakDays: studyStats.currentStreak })
      return
    }

    // Check study goal progress (after 6 PM)
    const currentHour = new Date().getHours()
    if (
      currentHour >= 18 &&
      studyStats.dailyGoalProgress < 50 &&
      studyStats.dailyGoalProgress > 0
    ) {
      const minutesNeeded = Math.ceil(
        (studyStats.dailyGoalMinutes * (100 - studyStats.dailyGoalProgress)) / 100
      )
      triggerReminder('study_goal_unmet', {
        percentComplete: studyStats.dailyGoalProgress,
        minutesNeeded
      })
      return
    }
  }, [
    enabled,
    reminderPreferences,
    currentReminder,
    lastActivityTimestamp,
    sessionStartTime,
    studyStats,
    triggerReminder
  ])

  // Check for daily check-in on first visit
  useEffect(() => {
    if (
      enabled &&
      reminderPreferences.enabled &&
      !hasShownDailyCheckin &&
      isFirstVisitToday(lastReminderTimestamp)
    ) {
      // Delay slightly to not interrupt page load
      const timer = setTimeout(() => {
        triggerReminder('daily_checkin', {
          dueCards: studyStats?.totalCardsToReview || 0
        })
        setHasShownDailyCheckin(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [
    enabled,
    reminderPreferences.enabled,
    hasShownDailyCheckin,
    lastReminderTimestamp,
    studyStats,
    triggerReminder
  ])

  // Fetch study stats on mount and periodically
  useEffect(() => {
    if (!enabled) return

    fetchStudyStats()

    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStudyStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [enabled, fetchStudyStats])

  // Set up trigger check interval
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(checkTriggers, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [enabled, checkTriggers])

  // Cleanup auto-dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current)
      }
    }
  }, [])

  return {
    currentReminder,
    dismissReminder,
    snoozeReminder,
    triggerReminder
  }
}
