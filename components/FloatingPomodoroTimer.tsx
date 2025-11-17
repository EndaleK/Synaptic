"use client"

import { useEffect, useState, useRef } from "react"
import { usePomodoroStore } from "@/lib/store/usePomodoroStore"
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
    setCurrentStudySessionId
  } = usePomodoroStore()

  const [isMinimized, setIsMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  if (status === 'idle' && timeRemaining === getTotalDuration()) {
    // Don't show timer if it hasn't been started yet
    return null
  }

  return (
    <>
      {/* Minimized Timer */}
      {isMinimized && (
        <div
          className="fixed bottom-6 right-6 z-50 cursor-move"
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
          onMouseDown={handleMouseDown}
        >
          <button
            onClick={() => setIsMinimized(false)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl transition-all hover:scale-105",
              "bg-gradient-to-r text-white font-semibold",
              getTimerColor()
            )}
          >
            <span className="text-lg font-mono">{formatTime(timeRemaining)}</span>
            {status === 'running' && (
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            )}
          </button>
        </div>
      )}

      {/* Expanded Timer */}
      {!isMinimized && (
        <div
          className="fixed bottom-6 right-6 z-50 cursor-move"
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
          onMouseDown={handleMouseDown}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden min-w-[280px]">
            {/* Header */}
            <div className={cn(
              "px-4 py-3 bg-gradient-to-r text-white flex items-center justify-between",
              getTimerColor()
            )}>
              <span className="font-semibold text-sm">{getTimerLabel()}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                      Focus Duration (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
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

            {/* Timer Display */}
            <div className="p-6">
              {/* Circular Progress */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="transform -rotate-90 w-32 h-32">
                  {/* Background circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - getProgress() / 100)}`}
                    className="transition-all duration-1000 ease-linear"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" className={timerType === 'focus' ? 'text-red-500' : timerType === 'shortBreak' ? 'text-green-500' : 'text-blue-500'} stopColor="currentColor" />
                      <stop offset="100%" className={timerType === 'focus' ? 'text-orange-500' : timerType === 'shortBreak' ? 'text-emerald-500' : 'text-cyan-500'} stopColor="currentColor" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Time in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold font-mono text-gray-900 dark:text-white">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2">
                {status === 'idle' || status === 'paused' ? (
                  <button
                    onClick={startTimer}
                    className={cn(
                      "p-3 rounded-full transition-all hover:scale-110",
                      "bg-gradient-to-r text-white shadow-lg",
                      getTimerColor()
                    )}
                    title="Start"
                  >
                    <Play className="w-5 h-5" fill="white" />
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="p-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
                    title="Pause"
                  >
                    <Pause className="w-5 h-5" fill="white" />
                  </button>
                )}
                <button
                  onClick={stopTimer}
                  className="p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
                  title="Stop"
                >
                  <Square className="w-5 h-5" fill="white" />
                </button>
              </div>

              {/* Session Counter */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sessions completed: <span className="font-semibold text-gray-900 dark:text-white">{sessionsCompleted}</span>
                </p>
              </div>

              {/* Timer Type Selector */}
              <div className="mt-4 flex items-center gap-2 text-xs">
                <button
                  onClick={() => switchTimerType('focus')}
                  className={cn(
                    "flex-1 py-2 rounded-lg transition-colors",
                    timerType === 'focus'
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  Focus
                </button>
                <button
                  onClick={() => switchTimerType('shortBreak')}
                  className={cn(
                    "flex-1 py-2 rounded-lg transition-colors",
                    timerType === 'shortBreak'
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  Break
                </button>
                <button
                  onClick={() => switchTimerType('longBreak')}
                  className={cn(
                    "flex-1 py-2 rounded-lg transition-colors",
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
