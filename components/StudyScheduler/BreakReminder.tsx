"use client"

import { useState, useEffect, useRef } from 'react'
import { Eye, X, Clock, Maximize2 } from 'lucide-react'

interface BreakReminderProps {
  enabled?: boolean
  intervalMinutes?: number
  durationSeconds?: number
  onClose?: () => void
}

export default function BreakReminder({
  enabled = true,
  intervalMinutes = 20,
  durationSeconds = 20,
  onClose
}: BreakReminderProps) {
  const [showReminder, setShowReminder] = useState(false)
  const [countdown, setCountdown] = useState(durationSeconds)
  const [nextBreakIn, setNextBreakIn] = useState(intervalMinutes * 60)
  const [isPaused, setIsPaused] = useState(false)
  const [preferences, setPreferences] = useState({
    enabled: true,
    intervalMinutes: 20,
    durationSeconds: 20
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Load user preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/study-preferences')
        if (response.ok) {
          const data = await response.json()
          if (data.preferences) {
            setPreferences({
              enabled: data.preferences.break_reminders_enabled ?? true,
              intervalMinutes: data.preferences.eye_break_interval_minutes || 20,
              durationSeconds: data.preferences.eye_break_duration_seconds || 20
            })
          }
        }
      } catch (error) {
        console.error('Failed to load break preferences:', error)
      }
    }

    fetchPreferences()
  }, [])

  // Track user activity to pause timer when inactive
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      if (isPaused) {
        setIsPaused(false)
      }
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Check for inactivity every 30 seconds
    const inactivityCheck = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity > 5 * 60 * 1000 && !isPaused) {
        // Pause timer if inactive for 5 minutes
        setIsPaused(true)
      }
    }, 30000)

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearInterval(inactivityCheck)
    }
  }, [isPaused])

  // Main timer countdown
  useEffect(() => {
    if (!enabled || !preferences.enabled || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    if (!showReminder) {
      // Countdown to next break
      intervalRef.current = setInterval(() => {
        setNextBreakIn(prev => {
          if (prev <= 1) {
            setShowReminder(true)
            setCountdown(preferences.durationSeconds)
            return preferences.intervalMinutes * 60
          }
          return prev - 1
        })
      }, 1000)
    } else {
      // Break countdown
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleComplete()
            return preferences.durationSeconds
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [enabled, preferences, showReminder, isPaused])

  const handleComplete = () => {
    setShowReminder(false)
    setNextBreakIn(preferences.intervalMinutes * 60)
    if (onClose) {
      onClose()
    }
  }

  const handleDismiss = () => {
    setShowReminder(false)
    setNextBreakIn(preferences.intervalMinutes * 60)
    if (onClose) {
      onClose()
    }
  }

  const handleSnooze = () => {
    setShowReminder(false)
    setNextBreakIn(5 * 60) // Snooze for 5 minutes
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  // Don't render if disabled
  if (!enabled || !preferences.enabled) {
    return null
  }

  // Show small indicator when not in break
  if (!showReminder) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Next break in {formatTime(nextBreakIn)}
          </span>
          {isPaused && (
            <span className="text-xs text-orange-600 dark:text-orange-400 ml-1">
              (Paused)
            </span>
          )}
        </div>
      </div>
    )
  }

  // Show full-screen break reminder
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 p-8 border-2 border-blue-200 dark:border-blue-800 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Time for an Eye Break!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                20-20-20 Rule
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Countdown Circle */}
        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-48">
            {/* Progress Circle */}
            <svg className="transform -rotate-90 w-48 h-48">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-blue-100 dark:text-blue-900/30"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="url(#breakGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - countdown / preferences.durationSeconds)}`}
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className="stop-blue-500" />
                  <stop offset="100%" className="stop-cyan-500" />
                </linearGradient>
              </defs>
            </svg>

            {/* Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {countdown}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                seconds
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Maximize2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Rest Your Eyes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Look at an object at least <span className="font-semibold text-blue-600 dark:text-blue-400">20 feet away</span> for{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">{preferences.durationSeconds} seconds</span>.
                This helps reduce eye strain and prevents digital eye fatigue.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>This reminder appears every {preferences.intervalMinutes} minutes</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSnooze}
            className="flex-1 px-6 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Snooze 5 min
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all transform hover:scale-105 shadow-lg"
          >
            Done
          </button>
        </div>

        {/* Tips */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tip: You can disable break reminders in your study preferences
          </p>
        </div>
      </div>
    </div>
  )
}
