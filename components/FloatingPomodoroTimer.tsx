"use client"

import { useEffect, useState, useRef } from "react"
import { usePomodoroStore } from "@/lib/store/usePomodoroStore"
import { useStudyGoalsStore } from "@/lib/store/useStudyGoalsStore"
import { Play, Pause, Square, Settings, X, Minimize2, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function FloatingPomodoroTimer() {
  const {
    timerType,
    timeRemaining,
    status,
    sessionsCompleted,
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    startTimer,
    pauseTimer,
    stopTimer,
    tick,
    switchTimerType,
    setFocusDuration,
    setShortBreakDuration,
    setLongBreakDuration,
    setCurrentStudySessionId,
    syncTimer
  } = usePomodoroStore()

  const { incrementPomodoroSessions, checkAndResetDaily } = useStudyGoalsStore()
  const prevSessionsCompletedRef = useRef(sessionsCompleted)

  const [isMinimized, setIsMinimized] = useState(true) // Start minimized by default
  const [showSettings, setShowSettings] = useState(false)
  const [isHidden, setIsHidden] = useState(false) // Allow complete dismissal
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Calculate default position (top-right corner)
  const getDefaultPosition = () => {
    if (typeof window === 'undefined') return { top: 24, right: 24 }
    return { top: 24, right: 24 }
  }

  const [position, setPosition] = useState<{ top: number; right: number }>(getDefaultPosition())

  // Sync timer on mount (handles navigation between pages)
  useEffect(() => {
    syncTimer()
    checkAndResetDaily() // Check if we need to reset daily goals
  }, [syncTimer, checkAndResetDaily])

  // Track Pomodoro session completions and update goals
  useEffect(() => {
    if (sessionsCompleted > prevSessionsCompletedRef.current && timerType === 'focus') {
      // A focus session was completed
      incrementPomodoroSessions()
      prevSessionsCompletedRef.current = sessionsCompleted
    }
  }, [sessionsCompleted, timerType, incrementPomodoroSessions])

  // Tick every second when running
  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(() => {
        tick()
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [status, tick])

  // Play sound when timer completes
  useEffect(() => {
    if (timeRemaining === 0 && status === 'idle') {
      playNotificationSound()
      showNotification()
    }
  }, [timeRemaining, status])

  // Start study session when focus timer starts
  useEffect(() => {
    if (status === 'running' && timerType === 'focus') {
      startStudySession()
    } else if (status === 'idle' && timerType === 'focus') {
      completeStudySession()
    }
  }, [status, timerType])

  const startStudySession = async () => {
    try {
      const response = await fetch('/api/study-sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_type: 'pomodoro',
          planned_duration: focusDuration
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentStudySessionId(data.session.id)
      }
    } catch (error) {
      console.error('Failed to start study session:', error)
    }
  }

  const completeStudySession = async () => {
    const sessionId = usePomodoroStore.getState().currentStudySessionId
    if (!sessionId) return

    try {
      await fetch('/api/study-sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          actual_duration: focusDuration - (timeRemaining / 60),
          completed: timeRemaining === 0
        })
      })
    } catch (error) {
      console.error('Failed to complete study session:', error)
    }

    setCurrentStudySessionId(null)
  }

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
    if (typeof window !== 'undefined') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    }
  }

  const showNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(
          timerType === 'focus' ? 'Focus session complete!' : 'Break time over!',
          {
            body: timerType === 'focus'
              ? 'Time for a break. Great work!'
              : 'Ready to focus again?',
            icon: '/favicon.ico'
          }
        )
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission()
      }
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalDuration = (): number => {
    switch (timerType) {
      case 'focus':
        return focusDuration * 60
      case 'shortBreak':
        return shortBreakDuration * 60
      case 'longBreak':
        return longBreakDuration * 60
    }
  }

  const getProgress = (): number => {
    const total = getTotalDuration()
    return ((total - timeRemaining) / total) * 100
  }

  const getTimerColor = (): string => {
    switch (timerType) {
      case 'focus':
        return 'from-red-500 to-orange-500'
      case 'shortBreak':
        return 'from-green-500 to-emerald-500'
      case 'longBreak':
        return 'from-blue-500 to-cyan-500'
    }
  }

  const getTimerLabel = (): string => {
    switch (timerType) {
      case 'focus':
        return '🍅 Focus'
      case 'shortBreak':
        return '☕ Short Break'
      case 'longBreak':
        return '🌴 Long Break'
    }
  }

  // Simplified - no dragging to avoid scroll issues
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging to avoid interfering with scroll
    e.stopPropagation()
  }

  // Always show the timer once it has been started at least once
  // Only hide if user explicitly dismisses it or if no session has ever been started
  const hasNeverStarted = status === 'idle' && timeRemaining === getTotalDuration() && sessionsCompleted === 0

  if (isHidden || (hasNeverStarted && isMinimized)) {
    // Show a small "Start Timer" button when hidden
    return hasNeverStarted ? null : (
      <div className="fixed z-40 top-4 right-4">
        <button
          onClick={() => {
            setIsHidden(false)
            setIsMinimized(true)
          }}
          className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2 text-sm font-medium"
        >
          <span>🍅</span>
          <span>Show Timer</span>
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Minimized Timer - Top Right, No Scroll Blocking */}
      {isMinimized && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{ top: `${position.top}px`, right: `${position.right}px` }}
        >
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMinimized(false)
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg transition-all hover:scale-105",
                "bg-gradient-to-r text-white font-medium text-sm",
                getTimerColor()
              )}
            >
              <span className="font-mono">{formatTime(timeRemaining)}</span>
              {status === 'running' && (
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsHidden(true)
              }}
              className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-all hover:scale-105 shadow-md"
              title="Hide timer"
            >
              <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded Timer - Compact & Elegant */}
      {!isMinimized && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{ top: `${position.top}px`, right: `${position.right}px` }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-[240px] pointer-events-auto">
            {/* Header */}
            <div className={cn(
              "px-3 py-2 bg-gradient-to-r text-white flex items-center justify-between",
              getTimerColor()
            )}>
              <span className="font-medium text-xs">{getTimerLabel()}</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSettings(!showSettings)
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMinimized(true)
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsHidden(true)
                    setIsMinimized(true)
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Hide timer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-3 text-sm">
                  {/* Quick Presets */}
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold text-xs">
                      QUICK PRESETS
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          setFocusDuration(15)
                          setShortBreakDuration(3)
                          setLongBreakDuration(10)
                        }}
                        className="px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        15 min
                      </button>
                      <button
                        onClick={() => {
                          setFocusDuration(25)
                          setShortBreakDuration(5)
                          setLongBreakDuration(15)
                        }}
                        className="px-2 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                      >
                        25 ⭐
                      </button>
                      <button
                        onClick={() => {
                          setFocusDuration(45)
                          setShortBreakDuration(10)
                          setLongBreakDuration(20)
                        }}
                        className="px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        45 min
                      </button>
                      <button
                        onClick={() => {
                          setFocusDuration(30)
                          setShortBreakDuration(5)
                          setLongBreakDuration(20)
                        }}
                        className="px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        30 min
                      </button>
                      <button
                        onClick={() => {
                          setFocusDuration(60)
                          setShortBreakDuration(10)
                          setLongBreakDuration(30)
                        }}
                        className="px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        60 min
                      </button>
                      <button
                        onClick={() => {
                          setFocusDuration(90)
                          setShortBreakDuration(15)
                          setLongBreakDuration(30)
                        }}
                        className="px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        90 min
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <label className="block text-gray-700 dark:text-gray-300 mb-2 font-semibold text-xs">
                      CUSTOM SETTINGS
                    </label>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                      Focus Duration (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={focusDuration}
                      onChange={(e) => setFocusDuration(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                      Short Break (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={shortBreakDuration}
                      onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                      Long Break (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={longBreakDuration}
                      onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Timer Display - Compact */}
            <div className="p-4">
              {/* Circular Progress - Smaller */}
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-700" />
                  <circle cx="48" cy="48" r="42" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - getProgress() / 100)}`} className="transition-all duration-1000 ease-linear" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" className={timerType === 'focus' ? 'text-red-500' : timerType === 'shortBreak' ? 'text-green-500' : 'text-blue-500'} stopColor="currentColor" />
                      <stop offset="100%" className={timerType === 'focus' ? 'text-orange-500' : timerType === 'shortBreak' ? 'text-emerald-500' : 'text-cyan-500'} stopColor="currentColor" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>

              {/* Controls - Compact */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {status === 'idle' || status === 'paused' ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); startTimer(); }}
                    className={cn("p-2 rounded-full transition-all hover:scale-110 bg-gradient-to-r text-white shadow-md", getTimerColor())}
                    title="Start"
                  >
                    <Play className="w-4 h-4" fill="white" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); pauseTimer(); }}
                    className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-all hover:scale-110 shadow-md"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4" fill="white" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); stopTimer(); }}
                  className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all hover:scale-110 shadow-md"
                  title="Stop"
                >
                  <Square className="w-4 h-4" fill="white" />
                </button>
              </div>

              {/* Session Counter - Compact */}
              <div className="text-center mb-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">{sessionsCompleted}</span> sessions
                </p>
              </div>

              {/* Timer Type Selector - Compact */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={(e) => { e.stopPropagation(); switchTimerType('focus'); }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-colors font-medium",
                    timerType === 'focus'
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  Focus
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); switchTimerType('shortBreak'); }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-colors font-medium",
                    timerType === 'shortBreak'
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  Break
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); switchTimerType('longBreak'); }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-colors font-medium",
                    timerType === 'longBreak'
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  Long
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
