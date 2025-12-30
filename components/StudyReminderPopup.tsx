"use client"

/**
 * StudyReminderPopup Component
 *
 * Non-intrusive slide-in notification for study reminders.
 * Appears in bottom-right, above minimized Study Buddy.
 * Features friendly buddy tone with emoji.
 */

import { useEffect, useState, useRef } from 'react'
import { X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReminderMessage } from '@/lib/study-reminders'

interface StudyReminderPopupProps {
  reminder: ReminderMessage | null
  onPrimaryAction: (action: ReminderMessage['primaryAction']['action']) => void
  onSecondaryAction?: (action: string) => void
  onDismiss: () => void
  onSnooze?: (minutes?: number) => void
  className?: string
}

export function StudyReminderPopup({
  reminder,
  onPrimaryAction,
  onSecondaryAction,
  onDismiss,
  onSnooze,
  className
}: StudyReminderPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isHovered, setIsHovered] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle show/hide animations
  useEffect(() => {
    if (reminder) {
      // Small delay to trigger CSS transition
      const timer = setTimeout(() => setIsVisible(true), 10)
      setProgress(100)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [reminder])

  // Auto-dismiss progress bar
  useEffect(() => {
    if (!reminder || isHovered) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      return
    }

    const duration = reminder.autoDismissSeconds * 1000
    const interval = 50 // Update every 50ms for smooth animation
    const decrement = (100 / duration) * interval

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev - decrement
        if (next <= 0) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }
          return 0
        }
        return next
      })
    }, interval)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [reminder, isHovered])

  // Handle primary action click
  const handlePrimaryAction = () => {
    if (reminder) {
      onPrimaryAction(reminder.primaryAction.action)
      onDismiss()
    }
  }

  // Handle secondary action click
  const handleSecondaryAction = () => {
    if (!reminder?.secondaryAction) return

    const action = reminder.secondaryAction.action
    if (action === 'snooze' && onSnooze) {
      onSnooze()
    } else if (action === 'dismiss') {
      onDismiss()
    } else if (onSecondaryAction) {
      onSecondaryAction(action)
    }
  }

  // Get priority-based styles
  const getPriorityStyles = () => {
    if (!reminder) return ''

    switch (reminder.priority) {
      case 'high':
        return 'border-l-4 border-l-orange-500'
      case 'medium':
        return 'border-l-4 border-l-purple-500'
      default:
        return 'border-l-4 border-l-blue-400'
    }
  }

  if (!reminder) return null

  return (
    <div
      className={cn(
        'fixed bottom-36 right-4 z-40 w-80 max-w-[calc(100vw-2rem)]',
        'bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
        'overflow-hidden',
        'transform transition-all duration-300 ease-out',
        isVisible
          ? 'opacity-100 translate-y-0 translate-x-0'
          : 'opacity-0 translate-y-4 translate-x-8',
        getPriorityStyles(),
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress bar for auto-dismiss */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-50"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{reminder.emoji}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {reminder.title}
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {reminder.message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrimaryAction}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium text-sm',
              'bg-gradient-to-r from-purple-600 to-pink-600',
              'text-white shadow-md',
              'hover:from-purple-700 hover:to-pink-700',
              'transform hover:scale-[1.02] active:scale-[0.98]',
              'transition-all duration-200'
            )}
          >
            {reminder.primaryAction.label}
          </button>

          {reminder.secondaryAction && (
            <button
              onClick={handleSecondaryAction}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm',
                'text-gray-600 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors duration-200'
              )}
            >
              {reminder.secondaryAction.label}
            </button>
          )}
        </div>

        {/* Snooze option for certain types */}
        {reminder.secondaryAction?.action !== 'snooze' && onSnooze && (
          <button
            onClick={() => onSnooze(30)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Clock className="w-3 h-3" />
            Remind me in 30 minutes
          </button>
        )}
      </div>
    </div>
  )
}
