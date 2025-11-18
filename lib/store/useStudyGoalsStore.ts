// Study Goals and Progress Store with Zustand
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface DailyGoals {
  studyMinutes: number // Target study time in minutes
  flashcardsReviewed: number // Target flashcards to review
  documentsRead: number // Target documents to engage with
  pomodoroSessions: number // Target pomodoro sessions
}

export interface DailyProgress {
  studyMinutes: number // Actual study time today
  flashcardsReviewed: number // Actual flashcards reviewed today
  documentsRead: Set<string> // Document IDs interacted with today
  pomodoroSessions: number // Completed pomodoro sessions today
  lastResetDate: string // ISO date string for daily reset
}

export interface WeeklyStats {
  totalStudyMinutes: number
  totalFlashcards: number
  totalDocuments: number
  totalSessions: number
  streak: number // Consecutive days with goals met
  lastWeekReset: string // ISO date string
}

interface StudyGoalsState {
  // Goals
  dailyGoals: DailyGoals

  // Progress
  dailyProgress: DailyProgress

  // Weekly stats
  weeklyStats: WeeklyStats

  // UI state
  showProgressWidget: boolean
  isGoalsModalOpen: boolean

  // Actions
  setDailyGoals: (goals: Partial<DailyGoals>) => void
  incrementStudyTime: (minutes: number) => void
  incrementFlashcardsReviewed: (count: number) => void
  incrementPomodoroSessions: () => void
  addDocumentInteraction: (documentId: string) => void
  resetDailyProgress: () => void
  checkAndResetDaily: () => void
  toggleProgressWidget: () => void
  setGoalsModalOpen: (open: boolean) => void
  getGoalCompletion: () => { [key: string]: number } // Returns percentage for each goal
  isAnyGoalComplete: () => boolean
  updateWeeklyStats: () => void
}

const DEFAULT_GOALS: DailyGoals = {
  studyMinutes: 60, // 1 hour
  flashcardsReviewed: 20,
  documentsRead: 1,
  pomodoroSessions: 2
}

const getToday = () => new Date().toISOString().split('T')[0]

export const useStudyGoalsStore = create<StudyGoalsState>()(
  persist(
    (set, get) => ({
      // Default goals
      dailyGoals: DEFAULT_GOALS,

      // Empty progress
      dailyProgress: {
        studyMinutes: 0,
        flashcardsReviewed: 0,
        documentsRead: new Set<string>(),
        pomodoroSessions: 0,
        lastResetDate: getToday()
      },

      // Weekly stats
      weeklyStats: {
        totalStudyMinutes: 0,
        totalFlashcards: 0,
        totalDocuments: 0,
        totalSessions: 0,
        streak: 0,
        lastWeekReset: getToday()
      },

      // UI state
      showProgressWidget: true,
      isGoalsModalOpen: false,

      setDailyGoals: (goals) => {
        set((state) => ({
          dailyGoals: { ...state.dailyGoals, ...goals }
        }))
      },

      incrementStudyTime: (minutes) => {
        get().checkAndResetDaily()
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            studyMinutes: state.dailyProgress.studyMinutes + minutes
          }
        }))
        get().updateWeeklyStats()
      },

      incrementFlashcardsReviewed: (count) => {
        get().checkAndResetDaily()
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            flashcardsReviewed: state.dailyProgress.flashcardsReviewed + count
          }
        }))
        get().updateWeeklyStats()
      },

      incrementPomodoroSessions: () => {
        get().checkAndResetDaily()
        set((state) => ({
          dailyProgress: {
            ...state.dailyProgress,
            pomodoroSessions: state.dailyProgress.pomodoroSessions + 1
          }
        }))
        get().updateWeeklyStats()
      },

      addDocumentInteraction: (documentId) => {
        get().checkAndResetDaily()
        set((state) => {
          const newSet = new Set(state.dailyProgress.documentsRead)
          newSet.add(documentId)
          return {
            dailyProgress: {
              ...state.dailyProgress,
              documentsRead: newSet
            }
          }
        })
        get().updateWeeklyStats()
      },

      resetDailyProgress: () => {
        const state = get()
        const today = getToday()

        // Check if all goals were met yesterday for streak
        const goalCompletion = state.getGoalCompletion()
        const allGoalsMet = Object.values(goalCompletion).every(pct => pct >= 100)

        set({
          dailyProgress: {
            studyMinutes: 0,
            flashcardsReviewed: 0,
            documentsRead: new Set<string>(),
            pomodoroSessions: 0,
            lastResetDate: today
          },
          weeklyStats: {
            ...state.weeklyStats,
            streak: allGoalsMet ? state.weeklyStats.streak + 1 : 0
          }
        })
      },

      checkAndResetDaily: () => {
        const state = get()
        const today = getToday()

        if (state.dailyProgress.lastResetDate !== today) {
          state.resetDailyProgress()
        }
      },

      toggleProgressWidget: () => {
        set((state) => ({
          showProgressWidget: !state.showProgressWidget
        }))
      },

      setGoalsModalOpen: (open) => {
        set({ isGoalsModalOpen: open })
      },

      getGoalCompletion: () => {
        const state = get()
        const { dailyGoals, dailyProgress } = state

        return {
          studyMinutes: dailyGoals.studyMinutes > 0
            ? Math.min(100, (dailyProgress.studyMinutes / dailyGoals.studyMinutes) * 100)
            : 100,
          flashcardsReviewed: dailyGoals.flashcardsReviewed > 0
            ? Math.min(100, (dailyProgress.flashcardsReviewed / dailyGoals.flashcardsReviewed) * 100)
            : 100,
          documentsRead: dailyGoals.documentsRead > 0
            ? Math.min(100, (dailyProgress.documentsRead.size / dailyGoals.documentsRead) * 100)
            : 100,
          pomodoroSessions: dailyGoals.pomodoroSessions > 0
            ? Math.min(100, (dailyProgress.pomodoroSessions / dailyGoals.pomodoroSessions) * 100)
            : 100
        }
      },

      isAnyGoalComplete: () => {
        const completion = get().getGoalCompletion()
        return Object.values(completion).some(pct => pct >= 100)
      },

      updateWeeklyStats: () => {
        const state = get()
        const today = getToday()
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
        const weekStartStr = weekStart.toISOString().split('T')[0]

        // Reset weekly stats if new week
        if (state.weeklyStats.lastWeekReset !== weekStartStr) {
          set({
            weeklyStats: {
              totalStudyMinutes: state.dailyProgress.studyMinutes,
              totalFlashcards: state.dailyProgress.flashcardsReviewed,
              totalDocuments: state.dailyProgress.documentsRead.size,
              totalSessions: state.dailyProgress.pomodoroSessions,
              streak: state.weeklyStats.streak, // Preserve streak
              lastWeekReset: weekStartStr
            }
          })
        } else {
          // Update cumulative weekly stats
          set((state) => ({
            weeklyStats: {
              ...state.weeklyStats,
              totalStudyMinutes: state.weeklyStats.totalStudyMinutes + 1, // Incremental
              totalFlashcards: state.dailyProgress.flashcardsReviewed,
              totalDocuments: state.dailyProgress.documentsRead.size,
              totalSessions: state.dailyProgress.pomodoroSessions
            }
          }))
        }
      }
    }),
    {
      name: 'study-goals-storage',
      storage: createJSONStorage(() => localStorage),
      // Custom serialization to handle Set
      partialize: (state) => ({
        dailyGoals: state.dailyGoals,
        dailyProgress: {
          ...state.dailyProgress,
          documentsRead: Array.from(state.dailyProgress.documentsRead) // Convert Set to Array
        },
        weeklyStats: state.weeklyStats,
        showProgressWidget: state.showProgressWidget,
        isGoalsModalOpen: state.isGoalsModalOpen
      }),
      // Custom deserialization to restore Set
      merge: (persistedState: any, currentState) => {
        const merged = {
          ...currentState,
          ...persistedState
        }

        // Restore Set from Array
        if (persistedState?.dailyProgress?.documentsRead) {
          merged.dailyProgress = {
            ...merged.dailyProgress,
            documentsRead: new Set(persistedState.dailyProgress.documentsRead)
          }
        }

        return merged
      }
    }
  )
)
