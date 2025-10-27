"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, X, AlertCircle, Clock, Sparkles } from 'lucide-react'
import { notificationManager, NotificationPreferences } from '@/lib/notifications'

export default function NotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(true)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    studyReminders: true,
    breakAlerts: true,
    dueFlashcards: true,
    streakReminders: true,
    soundEnabled: true
  })
  const [showTestNotification, setShowTestNotification] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported(notificationManager.isSupported())

    // Get current permission status
    if (notificationManager.isSupported()) {
      setPermission(Notification.permission)
    }

    // Load user preferences
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/study-preferences')
      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          const prefs: NotificationPreferences = {
            enabled: true,
            studyReminders: data.preferences.notification_types?.study_reminders ?? true,
            breakAlerts: data.preferences.notification_types?.break_alerts ?? true,
            dueFlashcards: data.preferences.notification_types?.due_flashcards ?? true,
            streakReminders: data.preferences.notification_types?.streak_reminders ?? true,
            soundEnabled: data.preferences.notification_sound_enabled ?? true,
            quietHoursStart: data.preferences.quiet_hours_start,
            quietHoursEnd: data.preferences.quiet_hours_end
          }
          setPreferences(prefs)
          notificationManager.setPreferences(prefs)
        }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  const handleRequestPermission = async () => {
    const result = await notificationManager.requestPermission()
    setPermission(result)
  }

  const handleTestNotification = async () => {
    setShowTestNotification(true)
    await notificationManager.show('study_reminder', {
      title: '🎉 Test Notification',
      body: 'Notifications are working! You\'ll receive study reminders, break alerts, and more.',
      tag: 'test-notification'
    })
    setTimeout(() => setShowTestNotification(false), 3000)
  }

  const updatePreference = async (key: keyof NotificationPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    notificationManager.setPreferences(newPreferences)

    // Update on server
    try {
      const notificationTypes = {
        study_reminders: newPreferences.studyReminders,
        break_alerts: newPreferences.breakAlerts,
        due_flashcards: newPreferences.dueFlashcards,
        streak_reminders: newPreferences.streakReminders
      }

      await fetch('/api/study-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_sound_enabled: newPreferences.soundEnabled,
          notification_types: notificationTypes,
          quiet_hours_start: newPreferences.quietHoursStart || null,
          quiet_hours_end: newPreferences.quietHoursEnd || null
        })
      })
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
    }
  }

  // Not supported
  if (!isSupported) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Notifications Not Supported
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your browser doesn't support notifications. Try using a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${permission === 'granted'
                ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                : permission === 'denied'
                ? 'bg-gradient-to-br from-red-500 to-orange-500'
                : 'bg-gradient-to-br from-blue-500 to-cyan-500'}
            `}>
              {permission === 'granted' ? (
                <Bell className="w-6 h-6 text-white" />
              ) : (
                <BellOff className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {permission === 'granted'
                  ? 'Notifications are enabled'
                  : permission === 'denied'
                  ? 'Notifications are blocked'
                  : 'Enable notifications to stay on track'}
              </p>
            </div>
          </div>

          {/* Permission Status Badge */}
          <div className={`
            px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2
            ${permission === 'granted'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : permission === 'denied'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}
          `}>
            {permission === 'granted' ? (
              <>
                <Check className="w-4 h-4" />
                Enabled
              </>
            ) : permission === 'denied' ? (
              <>
                <X className="w-4 h-4" />
                Blocked
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Not Set
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Permission Request */}
        {permission !== 'granted' && (
          <div className={`
            rounded-xl p-6 border-2
            ${permission === 'denied'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800'}
          `}>
            <div className="flex items-start gap-4">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${permission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'}
              `}>
                {permission === 'denied' ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {permission === 'denied'
                    ? 'Notifications are Blocked'
                    : 'Enable Notifications'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {permission === 'denied'
                    ? 'You\'ve blocked notifications. To enable them, you\'ll need to update your browser settings.'
                    : 'Get timely reminders for study sessions, flashcard reviews, and break alerts to stay productive and healthy.'}
                </p>
                {permission === 'default' && (
                  <button
                    onClick={handleRequestPermission}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Enable Notifications
                  </button>
                )}
                {permission === 'denied' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-semibold">To re-enable notifications:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the lock icon in your browser's address bar</li>
                      <li>Find "Notifications" and change it to "Allow"</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notification Preferences */}
        {permission === 'granted' && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notification Types
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Study Reminders
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified before scheduled study sessions
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.studyReminders}
                    onChange={(e) => updatePreference('studyReminders', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Break Alerts
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        20-20-20 rule reminders to rest your eyes
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.breakAlerts}
                    onChange={(e) => updatePreference('breakAlerts', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Flashcard Reviews
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        When flashcards are ready for review
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.dueFlashcards}
                    onChange={(e) => updatePreference('dueFlashcards', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🔥</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Streak Reminders
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Daily reminders to maintain your study streak
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.streakReminders}
                    onChange={(e) => updatePreference('streakReminders', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Sound Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sound Settings
              </h3>
              <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Notification Sounds
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Play a sound with notifications
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) => updatePreference('soundEnabled', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {/* Quiet Hours */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quiet Hours
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Don't send notifications during these hours
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart || ''}
                    onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd || ''}
                    onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Test Notification */}
            <div>
              <button
                onClick={handleTestNotification}
                disabled={showTestNotification}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {showTestNotification ? (
                  <>
                    <Check className="w-5 h-5" />
                    Test Sent!
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Send Test Notification
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
