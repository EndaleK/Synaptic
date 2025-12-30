"use client"

/**
 * BuddyMessage Component
 *
 * Styled motivation message with distinct appearance from regular chat messages.
 * Used for greetings, encouragement, nudges, and achievement celebrations.
 */

import { cn } from '@/lib/utils'
import type { MotivationMessage } from '@/lib/motivation-messages'

interface BuddyMessageProps {
  message: MotivationMessage
  variant?: 'inline' | 'card' | 'toast'
  className?: string
  onDismiss?: () => void
}

export function BuddyMessage({
  message,
  variant = 'inline',
  className,
  onDismiss
}: BuddyMessageProps) {
  // Get category-specific gradient colors
  const getCategoryGradient = () => {
    switch (message.category) {
      case 'greeting':
        return 'from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20'
      case 'encouragement':
        return 'from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20'
      case 'nudge':
        return 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20'
      case 'achievement':
      case 'milestone':
        return 'from-yellow-500/10 to-amber-500/10 dark:from-yellow-500/20 dark:to-amber-500/20'
      case 'streak':
        return 'from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20'
      default:
        return 'from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20'
    }
  }

  // Get category-specific border color
  const getCategoryBorder = () => {
    switch (message.category) {
      case 'greeting':
        return 'border-l-blue-400'
      case 'encouragement':
        return 'border-l-green-400'
      case 'nudge':
        return 'border-l-amber-400'
      case 'achievement':
      case 'milestone':
        return 'border-l-yellow-400'
      case 'streak':
        return 'border-l-red-400'
      default:
        return 'border-l-purple-400'
    }
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 py-3 px-4 rounded-xl',
          'bg-gradient-to-r',
          getCategoryGradient(),
          'border-l-4',
          getCategoryBorder(),
          className
        )}
      >
        <span className="text-2xl flex-shrink-0">{message.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {message.message}
          </p>
          {message.subtext && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {message.subtext}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'relative p-4 rounded-2xl shadow-lg',
          'bg-gradient-to-br',
          getCategoryGradient(),
          'border border-white/20 dark:border-gray-700/50',
          className
        )}
      >
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Dismiss"
          >
            <span className="text-gray-400 text-sm">✕</span>
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{message.emoji}</span>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {message.message}
            </p>
            {message.subtext && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {message.subtext}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Toast variant
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl',
        'bg-white dark:bg-gray-800',
        'border-l-4',
        getCategoryBorder(),
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
    >
      <span className="text-2xl">{message.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {message.message}
        </p>
        {message.subtext && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {message.subtext}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss"
        >
          <span className="text-gray-400 text-sm">✕</span>
        </button>
      )}
    </div>
  )
}

/**
 * Greeting Card - Special variant for Study Buddy opening
 */
export function StudyBuddyGreeting({
  message,
  userName,
  className
}: {
  message: MotivationMessage
  userName?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'text-center py-6 px-4',
        className
      )}
    >
      <div className="text-4xl mb-3">{message.emoji}</div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
        {userName ? `Hey ${userName}!` : 'Hey there!'}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {message.message}
      </p>
      {message.subtext && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          {message.subtext}
        </p>
      )}
    </div>
  )
}

/**
 * Achievement Toast - Special variant for milestone celebrations
 */
export function AchievementToast({
  message,
  onDismiss,
  className
}: {
  message: MotivationMessage
  onDismiss?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-5 py-3 rounded-full',
        'bg-gradient-to-r from-yellow-400 to-amber-500',
        'text-white shadow-2xl',
        'animate-in zoom-in-95 slide-in-from-bottom-4 duration-500',
        className
      )}
    >
      <span className="text-2xl animate-bounce">{message.emoji}</span>
      <span className="font-semibold">{message.message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  )
}
