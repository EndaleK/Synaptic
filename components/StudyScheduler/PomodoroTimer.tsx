"use client"

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Settings, Coffee, Brain, CheckCircle } from 'lucide-react'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

interface PomodoroSettings {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  soundEnabled: boolean
}

interface PomodoroTimerProps {
  documentId?: string
  onSessionComplete?: (duration: number) => void
}

export default function PomodoroTimer({ documentId, onSessionComplete }: PomodoroTimerProps) {
  const [settings, setSettings] = useState<PomodoroSettings>({
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true
  })

  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(settings.workMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Calculate initial time based on mode
  const getInitialTime = (currentMode: TimerMode): number => {
    switch (currentMode) {
      case 'work':
        return settings.workMinutes * 60
      case 'shortBreak':
        return settings.shortBreakMinutes * 60
      case 'longBreak':
        return settings.longBreakMinutes * 60
    }
  }

  // Load user preferences from API
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/study-preferences')
        if (response.ok) {
          const data = await response.json()
          if (data.preferences) {
            setSettings({
              workMinutes: data.preferences.pomodoro_work_minutes || 25,
              shortBreakMinutes: data.preferences.pomodoro_short_break_minutes || 5,
              longBreakMinutes: data.preferences.pomodoro_long_break_minutes || 15,
              sessionsUntilLongBreak: data.preferences.pomodoro_sessions_until_long_break || 4,
              autoStartBreaks: data.preferences.auto_start_breaks || false,
              autoStartPomodoros: data.preferences.auto_start_pomodoros || false,
              soundEnabled: data.preferences.notification_sound_enabled || true
            })
          }
        }
      } catch (error) {
        console.error('Failed to load study preferences:', error)
      }
    }

    fetchPreferences()
  }, [])

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
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
  }, [isRunning, timeLeft])

  // Start a new session (create session record)
  const startSession = async () => {
    if (mode === 'work') {
      try {
        const response = await fetch('/api/study-sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            sessionType: 'pomodoro',
            plannedDurationMinutes: settings.workMinutes
          })
        })

        if (response.ok) {
          const data = await response.json()
          setCurrentSessionId(data.sessionId)
          setSessionStartTime(new Date())
        }
      } catch (error) {
        console.error('Failed to start session:', error)
      }
    }
  }

  // Complete a session (update session record)
  const completeSession = async () => {
    if (currentSessionId && sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 60000)

      try {
        await fetch('/api/study-sessions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            durationMinutes: duration
          })
        })

        if (onSessionComplete) {
          onSessionComplete(duration)
        }
      } catch (error) {
        console.error('Failed to complete session:', error)
      }

      setCurrentSessionId(null)
      setSessionStartTime(null)
    }
  }

  // Handle timer completion
  const handleTimerComplete = async () => {
    setIsRunning(false)
    playCompletionSound()

    if (mode === 'work') {
      await completeSession()
      setSessionsCompleted(prev => prev + 1)

      // Determine next break type
      const nextSessionCount = sessionsCompleted + 1
      const isLongBreak = nextSessionCount % settings.sessionsUntilLongBreak === 0
      const nextMode: TimerMode = isLongBreak ? 'longBreak' : 'shortBreak'

      setMode(nextMode)
      setTimeLeft(getInitialTime(nextMode))

      if (settings.autoStartBreaks) {
        setIsRunning(true)
      }
    } else {
      // Break completed, return to work
      setMode('work')
      setTimeLeft(getInitialTime('work'))

      if (settings.autoStartPomodoros) {
        setIsRunning(true)
        await startSession()
      }
    }
  }

  // Play completion sound
  const playCompletionSound = () => {
    if (!settings.soundEnabled) return

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

  const handleStartPause = async () => {
    if (!isRunning && timeLeft === getInitialTime(mode) && mode === 'work') {
      await startSession()
    }
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(getInitialTime(mode))
    if (currentSessionId) {
      setCurrentSessionId(null)
      setSessionStartTime(null)
    }
  }

  const handleSkip = async () => {
    if (mode === 'work' && currentSessionId) {
      await completeSession()
      setSessionsCompleted(prev => prev + 1)
    }

    const nextMode: TimerMode = mode === 'work'
      ? (sessionsCompleted + 1) % settings.sessionsUntilLongBreak === 0 ? 'longBreak' : 'shortBreak'
      : 'work'

    setMode(nextMode)
    setTimeLeft(getInitialTime(nextMode))
    setIsRunning(false)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = (): number => {
    const total = getInitialTime(mode)
    return ((total - timeLeft) / total) * 100
  }

  const getModeConfig = () => {
    switch (mode) {
      case 'work':
        return {
          label: 'Focus Time',
          color: 'from-red-500 to-orange-500',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          icon: <Brain className="w-6 h-6" />
        }
      case 'shortBreak':
        return {
          label: 'Short Break',
          color: 'from-green-500 to-emerald-500',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          icon: <Coffee className="w-6 h-6" />
        }
      case 'longBreak':
        return {
          label: 'Long Break',
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          icon: <Coffee className="w-6 h-6" />
        }
    }
  }

  const modeConfig = getModeConfig()

  return (
    <div className={`${modeConfig.bgColor} rounded-2xl p-8 border-2 border-gray-200 dark:border-gray-700`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {modeConfig.icon}
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {modeConfig.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Session {Math.floor(sessionsCompleted % settings.sessionsUntilLongBreak) + 1}/{settings.sessionsUntilLongBreak}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Timer Settings</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Work (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.workMinutes}
                onChange={(e) => {
                  const newSettings = { ...settings, workMinutes: parseInt(e.target.value) || 25 }
                  setSettings(newSettings)
                  if (mode === 'work' && !isRunning) {
                    setTimeLeft(newSettings.workMinutes * 60)
                  }
                }}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Short Break</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.shortBreakMinutes}
                onChange={(e) => {
                  const newSettings = { ...settings, shortBreakMinutes: parseInt(e.target.value) || 5 }
                  setSettings(newSettings)
                  if (mode === 'shortBreak' && !isRunning) {
                    setTimeLeft(newSettings.shortBreakMinutes * 60)
                  }
                }}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Long Break</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreakMinutes}
                onChange={(e) => {
                  const newSettings = { ...settings, longBreakMinutes: parseInt(e.target.value) || 15 }
                  setSettings(newSettings)
                  if (mode === 'longBreak' && !isRunning) {
                    setTimeLeft(newSettings.longBreakMinutes * 60)
                  }
                }}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Sessions until long break</label>
              <input
                type="number"
                min="2"
                max="10"
                value={settings.sessionsUntilLongBreak}
                onChange={(e) => setSettings({ ...settings, sessionsUntilLongBreak: parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoStartBreaks}
                onChange={(e) => setSettings({ ...settings, autoStartBreaks: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-start breaks</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoStartPomodoros}
                onChange={(e) => setSettings({ ...settings, autoStartPomodoros: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-start pomodoros</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Sound notifications</span>
            </label>
          </div>
        </div>
      )}

      {/* Circular Progress Timer */}
      <div className="flex justify-center mb-8">
        <div className="relative w-64 h-64">
          {/* Progress Circle */}
          <svg className="transform -rotate-90 w-64 h-64">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 112}`}
              strokeDashoffset={`${2 * Math.PI * 112 * (1 - getProgress() / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`${mode === 'work' ? 'stop-red-500' : mode === 'shortBreak' ? 'stop-green-500' : 'stop-blue-500'}`} />
                <stop offset="100%" className={`${mode === 'work' ? 'stop-orange-500' : mode === 'shortBreak' ? 'stop-emerald-500' : 'stop-cyan-500'}`} />
              </linearGradient>
            </defs>
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-bold bg-gradient-to-br ${modeConfig.color} bg-clip-text text-transparent`}>
              {formatTime(timeLeft)}
            </div>
            {mode === 'work' && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {isRunning ? 'Stay focused!' : 'Ready to start?'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleReset}
          disabled={!isRunning && timeLeft === getInitialTime(mode)}
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Reset"
        >
          <RotateCcw className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        <button
          onClick={handleStartPause}
          className={`p-6 rounded-full bg-gradient-to-br ${modeConfig.color} hover:opacity-90 transition-all transform hover:scale-105 shadow-lg`}
          aria-label={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>

        <button
          onClick={handleSkip}
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Skip"
        >
          <SkipForward className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Sessions Completed */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {sessionsCompleted} sessions completed today
          </span>
        </div>
      </div>
    </div>
  )
}
