"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import StudyCalendar from '@/components/StudyScheduler/StudyCalendar'

export default function CalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'calendar_connected') {
      setConnectionStatus('connected')
      setMessage('Google Calendar connected successfully!')
      setShowMessage(true)
      // Hide message after 5 seconds
      setTimeout(() => setShowMessage(false), 5000)
      // Remove query params from URL
      router.replace('/dashboard/study/calendar')
    } else if (error) {
      setConnectionStatus('error')
      const errorMessages: Record<string, string> = {
        'oauth_denied': 'Google Calendar authorization was denied',
        'invalid_callback': 'Invalid OAuth callback',
        'connection_failed': 'Failed to connect Google Calendar'
      }
      setMessage(errorMessages[error] || 'An error occurred')
      setShowMessage(true)
      setTimeout(() => setShowMessage(false), 5000)
      router.replace('/dashboard/study/calendar')
    }
  }, [searchParams, router])

  const handleGoogleCalendarConnect = async () => {
    setIsConnecting(true)
    try {
      // Redirect to Google OAuth
      const response = await fetch('/api/integrations/google-calendar/auth')
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setConnectionStatus('error')
        setMessage(data.error || 'Failed to initiate connection')
        setShowMessage(true)
        setTimeout(() => setShowMessage(false), 5000)
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error)
      setConnectionStatus('error')
      setMessage('Failed to connect Google Calendar')
      setShowMessage(true)
      setTimeout(() => setShowMessage(false), 5000)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Success/Error Message */}
      {showMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border-2 ${
            connectionStatus === 'connected'
              ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
          }`}>
            {connectionStatus === 'connected' ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <p className={`text-sm font-medium ${
              connectionStatus === 'connected'
                ? 'text-green-900 dark:text-green-100'
                : 'text-red-900 dark:text-red-100'
            }`}>
              {message}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Study Calendar
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Plan and schedule your study sessions, exams, and assignments
                </p>
              </div>
            </div>

            {/* Google Calendar Integration */}
            <button
              onClick={handleGoogleCalendarConnect}
              disabled={isConnecting || connectionStatus === 'connected'}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {isConnecting ? 'Connecting...' : connectionStatus === 'connected' ? 'Calendar Connected' : 'Import Google Calendar'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <StudyCalendar />
      </div>
    </div>
  )
}
