"use client"

import { useState, useEffect } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { useNotifications } from '@/lib/notifications'

export default function NotificationBanner() {
  const [show, setShow] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const notifications = useNotifications()

  useEffect(() => {
    // Check if we should show the banner
    const dismissed = localStorage.getItem('notification-banner-dismissed')
    const hasPermission = notifications.isSupported() && notifications.isEnabled()

    // Show banner if notifications are supported but not enabled and not dismissed
    if (notifications.isSupported() && !hasPermission && !dismissed) {
      // Delay showing the banner slightly to avoid overwhelming the user
      const timer = setTimeout(() => {
        setShow(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  const handleEnable = async () => {
    setIsRequesting(true)
    try {
      const permission = await notifications.requestPermission()

      if (permission === 'granted') {
        setShow(false)
        localStorage.setItem('notification-banner-dismissed', 'true')
      } else {
        // User denied permission
        setShow(false)
        localStorage.setItem('notification-banner-dismissed', 'true')
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('notification-banner-dismissed', 'true')
  }

  if (!show) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6 animate-slideDown">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Enable Study Notifications
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Get reminders for your study sessions, streak milestones, and when flashcards are ready for review.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Enable Notifications
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
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
