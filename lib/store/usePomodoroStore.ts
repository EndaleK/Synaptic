// Pomodoro Timer Store with Zustand
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type TimerType = 'focus' | 'shortBreak' | 'longBreak'
type TimerStatus = 'idle' | 'running' | 'paused'

interface PomodoroState {
  // Timer settings
  focusDuration: number // in minutes
  shortBreakDuration: number
  longBreakDuration: number

  // Current session
  timerType: TimerType
  timeRemaining: number // in seconds
  status: TimerStatus
  sessionsCompleted: number
  lastUpdateTime: number | null // timestamp for persistent timer calculation

  // Study session tracking
  currentStudySessionId: string | null
  totalStudyTimeToday: number // in seconds

  // Actions
  startTimer: () => void
  pauseTimer: () => void
  stopTimer: () => void
  tick: () => void
  switchTimerType: (type: TimerType) => void
  setFocusDuration: (minutes: number) => void
  setShortBreakDuration: (minutes: number) => void
  setLongBreakDuration: (minutes: number) => void
  setCurrentStudySessionId: (id: string | null) => void
  resetTimer: () => void
  syncTimer: () => void // Sync timer after page reload or navigation
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      // Default Pomodoro settings (25-5-15)
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,

      timerType: 'focus',
      timeRemaining: 25 * 60, // 25 minutes in seconds
      status: 'idle',
      sessionsCompleted: 0,
      lastUpdateTime: null,

      currentStudySessionId: null,
      totalStudyTimeToday: 0,

      syncTimer: () => {
        const state = get()
        if (state.status !== 'running' || !state.lastUpdateTime) return

        // Calculate elapsed time since last update
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - state.lastUpdateTime) / 1000)

        if (elapsedSeconds <= 0) return

        // Update timer based on elapsed time
        const newTimeRemaining = Math.max(0, state.timeRemaining - elapsedSeconds)

        if (newTimeRemaining <= 0) {
          // Timer completed while user was away
          const newSessionsCompleted = state.timerType === 'focus'
            ? state.sessionsCompleted + 1
            : state.sessionsCompleted

          const nextType: TimerType = state.timerType === 'focus'
            ? (newSessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak')
            : 'focus'

          const nextDuration = nextType === 'focus'
            ? state.focusDuration
            : nextType === 'shortBreak'
            ? state.shortBreakDuration
            : state.longBreakDuration

          set({
            status: 'idle',
            timerType: nextType,
            timeRemaining: nextDuration * 60,
            sessionsCompleted: newSessionsCompleted,
            lastUpdateTime: null,
            currentStudySessionId: null
          })
        } else {
          // Timer still running, update remaining time
          const studyTimeIncrement = state.timerType === 'focus' ? elapsedSeconds : 0

          set({
            timeRemaining: newTimeRemaining,
            totalStudyTimeToday: state.totalStudyTimeToday + studyTimeIncrement,
            lastUpdateTime: now
          })
        }
      },

      startTimer: () => {
        const state = get()
        const now = Date.now()

        if (state.status === 'idle') {
          // Reset to full duration when starting from idle
          const duration = state.timerType === 'focus'
            ? state.focusDuration
            : state.timerType === 'shortBreak'
            ? state.shortBreakDuration
            : state.longBreakDuration

          set({
            status: 'running',
            timeRemaining: duration * 60,
            lastUpdateTime: now
          })
        } else {
          set({
            status: 'running',
            lastUpdateTime: now
          })
        }
      },

      pauseTimer: () => set({ status: 'paused', lastUpdateTime: null }),

      stopTimer: () => {
        const state = get()
        const duration = state.timerType === 'focus'
          ? state.focusDuration
          : state.timerType === 'shortBreak'
          ? state.shortBreakDuration
          : state.longBreakDuration

        set({
          status: 'idle',
          timeRemaining: duration * 60,
          currentStudySessionId: null,
          lastUpdateTime: null
        })
      },

      tick: () => {
        const state = get()
        if (state.status !== 'running') return

        const now = Date.now()

        if (state.timeRemaining <= 0) {
          // Timer completed
          const newSessionsCompleted = state.timerType === 'focus'
            ? state.sessionsCompleted + 1
            : state.sessionsCompleted

          // Auto-switch to break or focus
          const nextType: TimerType = state.timerType === 'focus'
            ? (newSessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak')
            : 'focus'

          const nextDuration = nextType === 'focus'
            ? state.focusDuration
            : nextType === 'shortBreak'
            ? state.shortBreakDuration
            : state.longBreakDuration

          set({
            status: 'idle',
            timerType: nextType,
            timeRemaining: nextDuration * 60,
            sessionsCompleted: newSessionsCompleted,
            currentStudySessionId: null,
            lastUpdateTime: null
          })
        } else {
          const newTimeRemaining = state.timeRemaining - 1
          const studyTimeIncrement = state.timerType === 'focus' ? 1 : 0

          set({
            timeRemaining: newTimeRemaining,
            totalStudyTimeToday: state.totalStudyTimeToday + studyTimeIncrement,
            lastUpdateTime: now
          })
        }
      },

      switchTimerType: (type: TimerType) => {
        const state = get()
        const duration = type === 'focus'
          ? state.focusDuration
          : type === 'shortBreak'
          ? state.shortBreakDuration
          : state.longBreakDuration

        set({
          timerType: type,
          timeRemaining: duration * 60,
          status: 'idle'
        })
      },

      setFocusDuration: (minutes: number) => {
        const state = get()
        const updates: Partial<PomodoroState> = { focusDuration: minutes }

        if (state.timerType === 'focus' && state.status === 'idle') {
          updates.timeRemaining = minutes * 60
        }

        set(updates)
      },

      setShortBreakDuration: (minutes: number) => {
        const state = get()
        const updates: Partial<PomodoroState> = { shortBreakDuration: minutes }

        if (state.timerType === 'shortBreak' && state.status === 'idle') {
          updates.timeRemaining = minutes * 60
        }

        set(updates)
      },

      setLongBreakDuration: (minutes: number) => {
        const state = get()
        const updates: Partial<PomodoroState> = { longBreakDuration: minutes }

        if (state.timerType === 'longBreak' && state.status === 'idle') {
          updates.timeRemaining = minutes * 60
        }

        set(updates)
      },

      setCurrentStudySessionId: (id: string | null) => {
        set({ currentStudySessionId: id })
      },

      resetTimer: () => {
        const state = get()
        const duration = state.timerType === 'focus'
          ? state.focusDuration
          : state.timerType === 'shortBreak'
          ? state.shortBreakDuration
          : state.longBreakDuration

        set({
          timeRemaining: duration * 60,
          status: 'idle'
        })
      }
    }),
    {
      name: 'pomodoro-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist timer status and lastUpdateTime for persistent timer
      partialize: (state) => ({
        focusDuration: state.focusDuration,
        shortBreakDuration: state.shortBreakDuration,
        longBreakDuration: state.longBreakDuration,
        sessionsCompleted: state.sessionsCompleted,
        totalStudyTimeToday: state.totalStudyTimeToday,
        timerType: state.timerType,
        status: state.status,
        timeRemaining: state.timeRemaining,
        lastUpdateTime: state.lastUpdateTime,
      })
    }
  )
)
