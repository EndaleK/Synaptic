"use client"

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, X, Maximize2, Clock, Sparkles } from 'lucide-react'
import { useUIStore } from '@/lib/store/useStore'
import { usePomodoroStore } from '@/lib/store/usePomodoroStore'

interface PomodoroWidgetProps {
  onMaximize?: () => void
}

export default function PomodoroWidget({ onMaximize }: PomodoroWidgetProps) {
  const { activeMode } = useUIStore()

  // Use centralized Pomodoro store instead of local state
  const {
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    timerType,
    timeRemaining,
    status,
    sessionsCompleted,
    startTimer,
    pauseTimer,
    stopTimer,
    tick,
    resetTimer,
    syncTimer,
  } = usePomodoroStore()

  // Local UI state for minimized view (not persisted - resets on page load)
  const [isMinimized, setIsMinimized] = useState(true)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Sync timer on mount (handles page reload with running timer)
  useEffect(() => {
    syncTimer()
  }, [syncTimer])

  // Timer countdown using store's tick method
  useEffect(() => {
    if (status === 'running' && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        tick()
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [status, timeRemaining, tick])

  // Play sound when timer completes
  useEffect(() => {
    if (status === 'idle' && timeRemaining === 0) {
      playSound()
    }
  }, [status, timeRemaining])

  // Play sound
  const playSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const context = audioContextRef.current
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5)

      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + 0.5)
    } catch (error) {
      console.error('Failed to play sound:', error)
    }
  }

  const handleStartPause = () => {
    if (status === 'running') {
      pauseTimer()
    } else {
      startTimer()
    }
  }

  const handleReset = () => {
    resetTimer()
  }

  const handleStop = () => {
    stopTimer()
    setIsMinimized(true)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Map store timerType to widget mode names
  const getModeConfig = () => {
    switch (timerType) {
      case 'focus':
        return { label: 'Focus', color: 'from-red-500 to-orange-500', bgColor: 'bg-red-500' }
      case 'shortBreak':
        return { label: 'Short Break', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-500' }
      case 'longBreak':
        return { label: 'Long Break', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-500' }
    }
  }

  const getActiveModeDisplay = () => {
    switch (activeMode) {
      case 'flashcards':
        return { name: 'Flashcards', icon: '🎴' }
      case 'chat':
        return { name: 'AI Chat', icon: '💬' }
      case 'podcast':
        return { name: 'Podcast', icon: '🎧' }
      case 'mindmap':
        return { name: 'Mind Map', icon: '🗺️' }
      case 'home':
        return { name: 'Studying', icon: '📚' }
      default:
        return { name: 'Studying', icon: '📚' }
    }
  }

  // Get initial time based on timer type
  const getInitialTime = (): number => {
    switch (timerType) {
      case 'focus': return focusDuration * 60
      case 'shortBreak': return shortBreakDuration * 60
      case 'longBreak': return longBreakDuration * 60
    }
  }

  const modeConfig = getModeConfig()
  const activeModeDisplay = getActiveModeDisplay()
  const isActive = status === 'running'

  // Determine color based on time remaining
  const getTimerColorState = () => {
    if (timeRemaining === 0) {
      return 'alert' // Time's up - flashing red
    } else if (timeRemaining <= 300) { // 5 minutes = 300 seconds
      return 'warning' // Less than 5 minutes - orange
    }
    return 'normal' // Default color
  }

  const colorState = getTimerColorState()

  // Override mode config colors based on time state
  const getDisplayConfig = () => {
    if (colorState === 'alert') {
      return {
        label: modeConfig.label,
        color: 'from-red-600 to-red-700',
        bgColor: 'bg-red-600'
      }
    } else if (colorState === 'warning') {
      return {
        label: modeConfig.label,
        color: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-500'
      }
    }
    return modeConfig
  }

  const displayConfig = getDisplayConfig()

  // Don't show if timer is idle and minimized
  if (status === 'idle' && isMinimized && timeRemaining === getInitialTime()) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 duration-300">
      {isMinimized ? (
        // Minimized view - 30% bigger
        <div className={`bg-gradient-to-br ${displayConfig.color} rounded-3xl shadow-2xl border-2 border-white/30 backdrop-blur-sm overflow-hidden ${colorState === 'alert' ? 'animate-pulse' : ''}`}>
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-sm text-white/90 font-semibold uppercase tracking-wide">
                    {displayConfig.label}
                  </div>
                  {timerType === 'focus' && activeMode !== 'home' && (
                    <div className="flex items-center gap-1.5 text-xs text-white/80 bg-white/20 px-2 py-1 rounded">
                      <Sparkles className="w-3 h-3" />
                      <span>{activeModeDisplay.icon} {activeModeDisplay.name}</span>
                    </div>
                  )}
                </div>
                <div className="text-4xl font-bold text-white tabular-nums">
                  {formatTime(timeRemaining)}
                </div>
                {sessionsCompleted > 0 && (
                  <div className="text-sm text-white/80 mt-1">
                    Session {Math.floor(sessionsCompleted % 4) + 1}/4
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2.5">
                <button
                  onClick={handleStartPause}
                  className="w-14 h-14 bg-white/25 hover:bg-white/35 rounded-xl flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
                  title={isActive ? 'Pause' : 'Start'}
                >
                  {isActive ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => setIsMinimized(false)}
                  className="w-11 h-11 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                  title="Expand"
                >
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Expanded view - 30% bigger
        <div className={`bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden w-[416px] backdrop-blur-sm ${colorState === 'alert' ? 'animate-pulse' : ''}`}>
          {/* Header */}
          <div className={`bg-gradient-to-br ${displayConfig.color} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-6 h-6 text-white" />
                <span className="text-base font-bold text-white uppercase tracking-wide">
                  {displayConfig.label}
                </span>
                {timerType === 'focus' && activeMode !== 'home' && (
                  <div className="flex items-center gap-1.5 text-sm text-white/90 bg-white/20 px-2.5 py-1.5 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                    <span>{activeModeDisplay.icon} {activeModeDisplay.name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {onMaximize && (
                  <button
                    onClick={() => {
                      onMaximize()
                      setIsMinimized(true)
                    }}
                    className="p-2.5 rounded-lg hover:bg-white/20 transition-all transform hover:scale-105"
                    title="Open full timer"
                  >
                    <Maximize2 className="w-5 h-5 text-white" />
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2.5 rounded-lg hover:bg-white/20 transition-all transform hover:scale-105"
                  title="Minimize"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleStop}
                  className="p-2.5 rounded-lg hover:bg-white/20 transition-all transform hover:scale-105"
                  title="Stop timer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Timer Display */}
            <div className="text-center">
              <div className="text-7xl font-bold text-white mb-2.5 tabular-nums">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-base text-white/90 font-medium">
                Session {Math.floor(sessionsCompleted % 4) + 1}/4
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-center gap-5 mb-5">
              <button
                onClick={handleReset}
                disabled={status === 'idle' && timeRemaining === getInitialTime()}
                className="p-4 rounded-xl bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md border border-gray-200 dark:border-gray-600"
                title="Reset"
              >
                <RotateCcw className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>

              <button
                onClick={handleStartPause}
                className={`p-6 rounded-xl bg-gradient-to-br ${displayConfig.color} hover:opacity-90 transition-all transform hover:scale-105 shadow-xl`}
                title={isActive ? 'Pause' : 'Start'}
              >
                {isActive ? (
                  <Pause className="w-9 h-9 text-white" />
                ) : (
                  <Play className="w-9 h-9 text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={handleStop}
                className="p-4 rounded-xl bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all transform hover:scale-105 shadow-md border border-gray-200 dark:border-gray-600"
                title="Stop"
              >
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Progress Info */}
            {sessionsCompleted > 0 && (
              <div className="text-center pt-4 border-t border-gray-300 dark:border-gray-600">
                <div className="text-base text-gray-700 dark:text-gray-300 font-medium">
                  🎯 {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} completed today
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
