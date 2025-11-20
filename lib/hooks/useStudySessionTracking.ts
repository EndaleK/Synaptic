"use client"

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useUIStore } from '@/lib/store/useStore'

interface SessionTrackingOptions {
  autoStart?: boolean
  inactivityTimeout?: number // milliseconds
  minSessionDuration?: number // minutes
}

export function useStudySessionTracking(options: SessionTrackingOptions = {}) {
  const {
    autoStart = true,
    inactivityTimeout = 5 * 60 * 1000, // 5 minutes of inactivity
    minSessionDuration = 1 // 1 minute minimum
  } = options

  const { user } = useUser()
  const { activeMode } = useUIStore()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const sessionStartTime = useRef<number | null>(null)
  const lastActivityTime = useRef<number>(Date.now())
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null)
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)

  // Session type mapping from active mode
  const getSessionType = (mode: string): 'chat' | 'review' | 'podcast' | 'mindmap' | 'video' | 'writing' | 'exam' | 'custom' => {
    switch (mode) {
      case 'chat':
        return 'chat'
      case 'flashcards':
        return 'review'
      case 'podcast':
      case 'quickSummary':
        return 'podcast'
      case 'mindmap':
        return 'mindmap'
      case 'video':
        return 'video'
      case 'writing':
        return 'writing'
      case 'quiz':
        return 'exam'
      default:
        return 'custom'
    }
  }

  // Start a new study session
  const startSession = async () => {
    if (!user || isTracking) return

    try {
      const sessionType = getSessionType(activeMode)
      const response = await fetch('/api/study-sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: sessionType, // Match API parameter name
          plannedDurationMinutes: 60 // Match API parameter name
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId) // Match API response field
        setIsTracking(true)
        sessionStartTime.current = Date.now()
        lastActivityTime.current = Date.now()

        console.log(`✅ Study session started: ${sessionType} (ID: ${data.sessionId})`)

        // Start heartbeat to update last activity
        startHeartbeat()
      }
    } catch (error) {
      console.error('Failed to start study session:', error)
    }
  }

  // Complete the current study session
  const completeSession = async (force: boolean = false) => {
    if (!sessionId || !sessionStartTime.current) return

    const durationMs = Date.now() - sessionStartTime.current
    const durationMinutes = Math.floor(durationMs / 60000)

    // Only save sessions longer than minimum duration (unless forced)
    if (!force && durationMinutes < minSessionDuration) {
      console.log(`⏭️  Session too short (${durationMinutes}min), not saving`)
      setSessionId(null)
      setIsTracking(false)
      sessionStartTime.current = null
      return
    }

    try {
      const response = await fetch('/api/study-sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId, // Match API parameter name
          durationMinutes: durationMinutes // Match API parameter name
        })
      })

      if (response.ok) {
        console.log(`✅ Study session completed: ${durationMinutes} minutes`)
      }
    } catch (error) {
      console.error('Failed to complete study session:', error)
    } finally {
      setSessionId(null)
      setIsTracking(false)
      sessionStartTime.current = null
      stopHeartbeat()
    }
  }

  // Track user activity
  const recordActivity = () => {
    lastActivityTime.current = Date.now()

    // Reset inactivity timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }

    inactivityTimer.current = setTimeout(() => {
      console.log('⏸️  User inactive, completing session')
      completeSession()
    }, inactivityTimeout)
  }

  // Start heartbeat to periodically check activity
  const startHeartbeat = () => {
    heartbeatInterval.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime.current

      if (timeSinceActivity > inactivityTimeout) {
        console.log('⏸️  Inactivity detected via heartbeat')
        completeSession()
      }
    }, 30000) // Check every 30 seconds
  }

  // Stop heartbeat
  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current)
      heartbeatInterval.current = null
    }
  }

  // Auto-start session when component mounts or mode changes
  useEffect(() => {
    if (autoStart && user && !isTracking && activeMode !== 'home') {
      startSession()
    }
  }, [user, activeMode, autoStart])

  // Track user activity with event listeners
  useEffect(() => {
    if (!isTracking) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    events.forEach(event => {
      window.addEventListener(event, recordActivity)
    })

    // Initial inactivity timer
    recordActivity()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, recordActivity)
      })

      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
    }
  }, [isTracking])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        completeSession(true) // Force complete on unmount
      }
      stopHeartbeat()
    }
  }, [])

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause tracking
        if (isTracking) {
          console.log('👁️  Tab hidden, pausing session')
        }
      } else {
        // Tab visible - resume tracking
        if (isTracking) {
          console.log('👁️  Tab visible, resuming session')
          recordActivity()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isTracking])

  return {
    sessionId,
    isTracking,
    startSession,
    completeSession,
    recordActivity
  }
}
