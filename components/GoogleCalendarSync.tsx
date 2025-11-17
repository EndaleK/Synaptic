"use client"

import { useState } from "react"
import { Calendar, Loader2, AlertCircle, CheckCircle, ExternalLink } from "lucide-react"

interface GoogleCalendarSyncProps {
  eventData: {
    summary: string
    description?: string
    start: string
    end: string
  }
  onSyncComplete?: (eventId: string, eventUrl?: string) => void
}

export default function GoogleCalendarSync({ eventData, onSyncComplete }: GoogleCalendarSyncProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [eventUrl, setEventUrl] = useState("")

  const handleConnectGoogle = async () => {
    setIsConnecting(true)
    setError("")

    try {
      const currentPath = window.location.pathname + window.location.search
      const response = await fetch(`/api/google/auth?returnTo=${encodeURIComponent(currentPath)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Google')
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google')
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/google/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          event: eventData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's an auth error
        if (response.status === 403) {
          setIsConnected(false)
        }
        throw new Error(data.error || 'Failed to sync with Google Calendar')
      }

      setSuccess("Event added to your Google Calendar!")
      if (data.eventUrl) {
        setEventUrl(data.eventUrl)
      }

      if (onSyncComplete && data.eventId) {
        onSyncComplete(data.eventId, data.eventUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with Google Calendar')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/>
            <path d="M8 2v4M16 2v4M3 10h18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="15" r="2" fill="white"/>
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Add to Google Calendar
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sync your study schedule with Google Calendar
          </p>
        </div>
      </div>

      {!isConnected ? (
        <button
          onClick={handleConnectGoogle}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all font-semibold text-gray-700 dark:text-gray-300"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Calendar
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              Add to Calendar
            </>
          )}
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">Success!</p>
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            {eventUrl && (
              <a
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View in Google Calendar
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
