// Global State Management with Zustand
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LearningStyle, PreferredMode, UserProfile } from '@/lib/supabase/types'

// Behavioral Learning Types
interface BehavioralScores {
  visual: number
  auditory: number
  kinesthetic: number
  readingWriting: number
  confidence: number
  dominantStyle: LearningStyle
  totalSessions: number
}

interface ModeEngagement {
  sessions: number
  totalSeconds: number
  completedActions: number
}

interface BlendedScores {
  visual: number
  auditory: number
  kinesthetic: number
  readingWriting: number
  dominantStyle: LearningStyle
  blendRatio: number
}

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
  // Behavioral learning style state
  behavioralScores: BehavioralScores | null
  setBehavioralScores: (scores: BehavioralScores | null) => void
  modeEngagement: Record<string, ModeEngagement>
  setModeEngagement: (engagement: Record<string, ModeEngagement>) => void
  blendedScores: BlendedScores | null
  setBlendedScores: (scores: BlendedScores | null) => void
  // Effective learning style (blended if available, else quiz, else null)
  getEffectiveLearningStyle: () => LearningStyle | null
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
    fileSize?: number
    metadata?: any
  } | null
  setCurrentDocument: (doc: { id: string; name: string; content: string; fileType: string; storagePath?: string; sections?: SectionStructure; fileSize?: number; metadata?: any } | null) => void
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
// SECURITY: Only persist non-sensitive user preferences, NOT personal information
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
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
      // Behavioral learning style state
      behavioralScores: null,
      setBehavioralScores: (scores) => set({ behavioralScores: scores }),
      modeEngagement: {},
      setModeEngagement: (engagement) => set({ modeEngagement: engagement }),
      blendedScores: null,
      setBlendedScores: (scores) => set({ blendedScores: scores }),
      // Effective learning style: prioritize blended > quiz > null
      getEffectiveLearningStyle: () => {
        const state = get()
        if (state.blendedScores?.dominantStyle) {
          return state.blendedScores.dominantStyle
        }
        if (state.learningStyle) {
          return state.learningStyle
        }
        return null
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      // CRITICAL: Only persist preferences, NOT personal information
      // Personal data (email, name, clerk_user_id, stripe_customer_id) stays in memory only
      partialize: (state) => ({
        // From userProfile, only persist non-sensitive subscription/preference data
        userProfile: state.userProfile ? {
          id: state.userProfile.id,
          subscription_tier: state.userProfile.subscription_tier,
          subscription_status: state.userProfile.subscription_status,
          learning_style: state.userProfile.learning_style,
          preferred_mode: state.userProfile.preferred_mode,
          primary_role: state.userProfile.primary_role,
          onboarding_completed: state.userProfile.onboarding_completed,
          // Explicitly EXCLUDE: email, full_name, clerk_user_id, stripe_customer_id
        } : null,
        // These are safe to persist (user preferences, not PII)
        learningStyle: state.learningStyle,
        preferredMode: state.preferredMode,
        hasCompletedAssessment: state.hasCompletedAssessment,
        assessmentScores: state.assessmentScores,
        // Behavioral scores are safe to persist (usage patterns, not PII)
        behavioralScores: state.behavioralScores,
        modeEngagement: state.modeEngagement,
        blendedScores: state.blendedScores,
      }),
    }
  )
)

// Document Store
// NOTE: Document content is NOT persisted to localStorage to avoid exceeding browser storage limits
// Only metadata (id, name, fileType, etc.) is stored. Content must be fetched from Supabase on demand.
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
      // CRITICAL: Only persist metadata, NOT content (which can be 5-10MB+)
      partialize: (state) => ({
        currentDocument: state.currentDocument ? {
          id: state.currentDocument.id,
          name: state.currentDocument.name,
          fileType: state.currentDocument.fileType,
          storagePath: state.currentDocument.storagePath,
          fileSize: state.currentDocument.fileSize,
          // Explicitly exclude: content, sections, metadata (large objects)
        } : null,
        documentHistory: state.documentHistory,
      }),
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
