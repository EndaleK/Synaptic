"use client"

import { useState, useEffect } from 'react'
import { Lightbulb, Info, Clock, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconType = 'lightbulb' | 'info' | 'clock' | 'sparkles'
type VariantType = 'info' | 'warning'

interface InfoTipBannerProps {
  tipId: string                    // Unique ID for localStorage
  title: string                    // Bold header
  message: string                  // Description text
  icon?: IconType                  // Default: 'lightbulb'
  variant?: VariantType            // Default: 'info'
  className?: string               // Additional styling
  show?: boolean                   // External control (optional)
  onDismiss?: () => void           // Callback when dismissed (optional)
}

const iconMap = {
  lightbulb: Lightbulb,
  info: Info,
  clock: Clock,
  sparkles: Sparkles,
}

const variantStyles = {
  info: {
    container: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300',
    dismiss: 'text-blue-400 hover:text-blue-600 dark:hover:text-blue-300',
  },
  warning: {
    container: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-100',
    message: 'text-amber-700 dark:text-amber-300',
    dismiss: 'text-amber-400 hover:text-amber-600 dark:hover:text-amber-300',
  },
}

export default function InfoTipBanner({
  tipId,
  title,
  message,
  icon = 'lightbulb',
  variant = 'info',
  className,
  show: externalShow,
  onDismiss,
}: InfoTipBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  const storageKey = `tip_dismissed_${tipId}`

  useEffect(() => {
    // If external show prop is provided, use it; otherwise check localStorage
    if (externalShow !== undefined) {
      setIsVisible(externalShow)
      return
    }

    // Check if tip was previously dismissed
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) {
      // Small delay before showing to avoid jarring appearance
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [storageKey, externalShow])

  const handleDismiss = () => {
    setIsAnimatingOut(true)

    // Wait for animation to complete before hiding
    setTimeout(() => {
      setIsVisible(false)
      localStorage.setItem(storageKey, 'true')
      onDismiss?.()
    }, 300)
  }

  if (!isVisible) {
    return null
  }

  const IconComponent = iconMap[icon]
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        'border rounded-xl p-4 transition-all duration-300',
        styles.container,
        isAnimatingOut ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0 animate-slideDown',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className={cn('w-5 h-5', styles.icon)} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn('text-sm font-semibold mb-1', styles.title)}>
            {title}
          </h3>
          <p className={cn('text-sm', styles.message)}>
            {message}
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className={cn(
            'flex-shrink-0 p-1 transition-colors',
            styles.dismiss
          )}
          aria-label="Dismiss tip"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Hook to check if a tip has been dismissed
 */
export function useTipDismissed(tipId: string): boolean {
  const [dismissed, setDismissed] = useState(true) // Default to true to avoid flash

  useEffect(() => {
    const storageKey = `tip_dismissed_${tipId}`
    const isDismissed = localStorage.getItem(storageKey) === 'true'
    setDismissed(isDismissed)
  }, [tipId])

  return dismissed
}

/**
 * Utility to reset a tip (for testing)
 */
export function resetTip(tipId: string): void {
  localStorage.removeItem(`tip_dismissed_${tipId}`)
}
