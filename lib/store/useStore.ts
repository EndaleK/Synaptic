// Global State Management with Zustand
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LearningStyle, PreferredMode, UserProfile } from '@/lib/supabase/types'

interface UserState {
  userProfile: UserProfile | null
  setUserProfile: (profile: UserProfile | null) => void
  learningStyle: LearningStyle | null
  setLearningStyle: (style: LearningStyle) => void
  preferredMode: PreferredMode
  setPreferredMode: (mode: PreferredMode) => void
  hasCompletedAssessment: boolean
  setHasCompletedAssessment: (completed: boolean) => void
  assessmentScores: {
    visual: number
    auditory: number
    kinesthetic: number
    reading_writing: number
  } | null
  setAssessmentScores: (scores: {
    visual: number
    auditory: number
    kinesthetic: number
    reading_writing: number
  } | null) => void
}

import type { SectionStructure } from '@/lib/document-parser/section-detector'

interface DocumentState {
  currentDocument: {
    id: string
    name: string
    content: string
    fileType: string
    storagePath?: string
    sections?: SectionStructure
  } | null
  setCurrentDocument: (doc: { id: string; name: string; content: string; fileType: string; storagePath?: string; sections?: SectionStructure } | null) => void
  documentHistory: Array<{ id: string; name: string; timestamp: string }>
  addToHistory: (doc: { id: string; name: string }) => void
}

interface UIState {
  activeMode: PreferredMode
  setActiveMode: (mode: PreferredMode) => void
  isDarkMode: boolean
  toggleDarkMode: () => void
  isMinimizedView: boolean
  setMinimizedView: (minimized: boolean) => void
}

// User Store
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userProfile: null,
      setUserProfile: (profile) => set({ userProfile: profile }),
      learningStyle: null,
      setLearningStyle: (style) => set({ learningStyle: style }),
      preferredMode: 'flashcards',
      setPreferredMode: (mode) => set({ preferredMode: mode }),
      hasCompletedAssessment: false,
      setHasCompletedAssessment: (completed) => set({ hasCompletedAssessment: completed }),
      assessmentScores: null,
      setAssessmentScores: (scores) => set({ assessmentScores: scores }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Document Store
export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      currentDocument: null,
      setCurrentDocument: (doc) => set({ currentDocument: doc }),
      documentHistory: [],
      addToHistory: (doc) =>
        set((state) => ({
          documentHistory: [
            { ...doc, timestamp: new Date().toISOString() },
            ...state.documentHistory.slice(0, 9), // Keep last 10
          ],
        })),
    }),
    {
      name: 'document-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// UI Store
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeMode: 'home',
      setActiveMode: (mode) => set({ activeMode: mode }),
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      isMinimizedView: false,
      setMinimizedView: (minimized) => set({ isMinimizedView: minimized }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
