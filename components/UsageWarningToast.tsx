"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { UsageWarning } from '@/lib/usage-warnings'

interface UsageWarningToastProps {
  warning: UsageWarning
  onClose: () => void
  autoHideDuration?: number // milliseconds, null to disable auto-hide
}

/**
 * Toast notification for usage warnings
 * Shows when users approach their usage limits (80%+)
 *
 * Severity levels:
 * - info (80-89%): Blue, informational
 * - warning (90-94%): Orange, caution
 * - critical (95-100%): Red, urgent
 */
export default function UsageWarningToast({
  warning,
  onClose,
  autoHideDuration = 8000
}: UsageWarningToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (autoHideDuration && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, autoHideDuration)

      return () => clearTimeout(timer)
    }
  }, [autoHideDuration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300) // Match animation duration
  }

  if (!isVisible) return null

  // Severity-based styling
  const severityConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-900 dark:text-blue-100',
      secondaryTextColor: 'text-blue-700 dark:text-blue-300'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      iconColor: 'text-orange-600 dark:text-orange-400',
      textColor: 'text-orange-900 dark:text-orange-100',
      secondaryTextColor: 'text-orange-700 dark:text-orange-300'
    },
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-900 dark:text-red-100',
      secondaryTextColor: 'text-red-700 dark:text-red-300'
    }
  }

  const config = severityConfig[warning.severity]
  const Icon = config.icon

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-lg border-2 shadow-lg ${config.bgColor} ${config.borderColor} ${
        isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${config.textColor} mb-1`}>
              {warning.severity === 'critical' && 'Limit Reached!'}
              {warning.severity === 'warning' && 'Running Low'}
              {warning.severity === 'info' && 'Usage Alert'}
            </p>
            <p className={`text-sm ${config.secondaryTextColor} mb-2`}>
              {warning.message}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  warning.percentage >= 95 ? 'bg-red-600' :
                  warning.percentage >= 90 ? 'bg-orange-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(warning.percentage, 100)}%` }}
              />
            </div>

            {/* CTA */}
            {warning.percentage >= 90 && (
              <Link
                href="/pricing"
                className={`inline-flex items-center text-xs font-medium ${config.secondaryTextColor} hover:underline`}
                onClick={handleClose}
              >
                Upgrade to Premium for unlimited access →
              </Link>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={`flex-shrink-0 ${config.textColor} hover:opacity-70 transition-opacity`}
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add keyframe animations */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slide-out-right {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        .animate-slide-out-right {
          animation: slide-out-right 0.3s ease-in;
        }
      `}</style>
    </div>
  )
}
