/**
 * Study Buddy Store
 *
 * Manages conversation state for the Study Buddy feature:
 * - Conversation messages
 * - Personality mode (tutor/buddy)
 * - Explain level presets
 * - Conversation history
 * - Agentic Teacher pending actions
 *
 * Uses localStorage for persistence across sessions
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersonalityMode, ExplainLevel, TeachingStyle } from '@/lib/study-buddy/personalities'
import type { SuggestedAction, ToolExecutionStatus, TeacherToolName } from '@/lib/teacher-agent/types'

export interface StudyBuddyMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  personality?: PersonalityMode // Made optional for backward compatibility
  explainLevel?: ExplainLevel
  // Agentic Teacher additions
  suggestedActions?: SuggestedAction[]
}

export interface StudyBuddyConversation {
  id: string
  messages: StudyBuddyMessage[]
  createdAt: Date
  lastActive: Date
  title?: string // Auto-generated from first message
}

// View modes for the Study Buddy panel
export type StudyBuddyViewMode = 'minimized' | 'floating' | 'panel'

// Reminder preferences
export interface ReminderPreferences {
  enabled: boolean
  idleReminderMinutes: number // Minutes of inactivity before showing reminder
  sessionPromptHours: number // Hours of active use before break suggestion
  dueCardsThreshold: number // Number of due cards before prompting
  streakReminderEnabled: boolean // Show reminder when streak at risk
  quietHoursStart: number // Hour (0-23) when quiet hours start
  quietHoursEnd: number // Hour (0-23) when quiet hours end
}

interface StudyBuddyState {
  // Current conversation
  currentConversation: StudyBuddyConversation | null

  // User preferences
  personalityMode: PersonalityMode
  explainLevel: ExplainLevel | null
  teachingStyle: TeachingStyle // 'socratic' = true Socratic, 'mixed' = explain + questions

  // Conversation history (last 10 conversations)
  conversationHistory: StudyBuddyConversation[]

  // View mode
  viewMode: StudyBuddyViewMode
  panelWidth: number // Width of panel when in 'panel' mode (percentage)

  // Agentic Teacher state (always enabled, no toggle)
  pendingActions: SuggestedAction[]
  executingActionId: string | null

  // Reminder preferences
  reminderPreferences: ReminderPreferences
  lastActivityTimestamp: number // Unix timestamp of last user activity
  lastReminderTimestamp: number // Unix timestamp of last reminder shown

  // Actions
  setPersonalityMode: (mode: PersonalityMode) => void
  setExplainLevel: (level: ExplainLevel | null) => void
  setTeachingStyle: (style: TeachingStyle) => void

  // Conversation management
  startNewConversation: () => void
  addMessage: (message: Omit<StudyBuddyMessage, 'id' | 'timestamp'>) => void
  loadConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  clearCurrentConversation: () => void

  // Get current messages
  getCurrentMessages: () => StudyBuddyMessage[]

  // View mode actions
  setViewMode: (mode: StudyBuddyViewMode) => void
  setPanelWidth: (width: number) => void

  // Agentic Teacher actions (always enabled)
  addPendingActions: (actions: SuggestedAction[]) => void
  updateActionStatus: (actionId: string, status: ToolExecutionStatus) => void
  approveAction: (actionId: string) => void
  rejectAction: (actionId: string) => void
  clearPendingActions: () => void
  setExecutingAction: (actionId: string | null) => void
  getPendingActions: () => SuggestedAction[]

  // Reminder actions
  setReminderPreferences: (prefs: Partial<ReminderPreferences>) => void
  updateLastActivity: () => void
  updateLastReminder: () => void
}

// Default reminder preferences
const defaultReminderPreferences: ReminderPreferences = {
  enabled: true,
  idleReminderMinutes: 45,
  sessionPromptHours: 2,
  dueCardsThreshold: 10,
  streakReminderEnabled: true,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 8 // 8 AM
}

export const useStudyBuddyStore = create<StudyBuddyState>()(
  persist(
    (set, get) => ({
      currentConversation: null,
      personalityMode: 'tutor',
      explainLevel: null,
      teachingStyle: 'mixed', // Default to mixed (explains + questions)
      conversationHistory: [],

      // View mode
      viewMode: 'minimized' as StudyBuddyViewMode,
      panelWidth: 40, // 40% default

      // Agentic Teacher state (always enabled)
      pendingActions: [],
      executingActionId: null,

      // Reminder state
      reminderPreferences: defaultReminderPreferences,
      lastActivityTimestamp: Date.now(),
      lastReminderTimestamp: 0,

      setPersonalityMode: (mode) => {
        set({ personalityMode: mode })
      },

      setExplainLevel: (level) => {
        set({ explainLevel: level })
      },

      setTeachingStyle: (style) => {
        set({ teachingStyle: style })
      },

      startNewConversation: () => {
        const newConversation: StudyBuddyConversation = {
          id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messages: [],
          createdAt: new Date(),
          lastActive: new Date()
        }
        set({ currentConversation: newConversation })
      },

      addMessage: (messageData) => {
        const state = get()

        // Create new conversation if none exists
        if (!state.currentConversation) {
          state.startNewConversation()
        }

        const newMessage: StudyBuddyMessage = {
          ...messageData,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        }

        const updatedConversation = {
          ...state.currentConversation!,
          messages: [...state.currentConversation!.messages, newMessage],
          lastActive: new Date(),
          // Auto-generate title from first user message
          title: state.currentConversation!.title ||
                (messageData.role === 'user' ?
                  messageData.content.substring(0, 50) + (messageData.content.length > 50 ? '...' : '') :
                  undefined)
        }

        // Update conversation history
        const existingIndex = state.conversationHistory.findIndex(
          (c) => c.id === updatedConversation.id
        )

        let newHistory: StudyBuddyConversation[]
        if (existingIndex >= 0) {
          // Update existing conversation
          newHistory = [...state.conversationHistory]
          newHistory[existingIndex] = updatedConversation
        } else {
          // Add new conversation to history (keep last 10)
          newHistory = [updatedConversation, ...state.conversationHistory].slice(0, 10)
        }

        set({
          currentConversation: updatedConversation,
          conversationHistory: newHistory
        })
      },

      loadConversation: (conversationId) => {
        const conversation = get().conversationHistory.find(
          (c) => c.id === conversationId
        )
        if (conversation) {
          set({ currentConversation: conversation })
        }
      },

      deleteConversation: (conversationId) => {
        set((state) => ({
          conversationHistory: state.conversationHistory.filter(
            (c) => c.id !== conversationId
          ),
          currentConversation:
            state.currentConversation?.id === conversationId
              ? null
              : state.currentConversation
        }))
      },

      clearCurrentConversation: () => {
        set({ currentConversation: null })
      },

      getCurrentMessages: () => {
        return get().currentConversation?.messages || []
      },

      // View mode actions
      setViewMode: (mode) => {
        set({ viewMode: mode })
      },

      setPanelWidth: (width) => {
        // Clamp between 30% and 60%
        const clampedWidth = Math.max(30, Math.min(60, width))
        set({ panelWidth: clampedWidth })
      },

      // Agentic Teacher actions (always enabled)
      addPendingActions: (actions) => {
        set((state) => ({
          pendingActions: [...state.pendingActions, ...actions]
        }))
      },

      updateActionStatus: (actionId, status) => {
        set((state) => ({
          pendingActions: state.pendingActions.map((action) =>
            action.id === actionId ? { ...action, status } : action
          )
        }))
      },

      approveAction: (actionId) => {
        set((state) => ({
          pendingActions: state.pendingActions.map((action) =>
            action.id === actionId ? { ...action, status: 'approved' as const } : action
          ),
          executingActionId: actionId
        }))
      },

      rejectAction: (actionId) => {
        set((state) => ({
          pendingActions: state.pendingActions.map((action) =>
            action.id === actionId ? { ...action, status: 'rejected' as const } : action
          )
        }))
      },

      clearPendingActions: () => {
        set({ pendingActions: [], executingActionId: null })
      },

      setExecutingAction: (actionId) => {
        set({ executingActionId: actionId })
      },

      getPendingActions: () => {
        return get().pendingActions.filter((action) => action.status === 'pending')
      },

      // Reminder actions
      setReminderPreferences: (prefs) => {
        set((state) => ({
          reminderPreferences: { ...state.reminderPreferences, ...prefs }
        }))
      },

      updateLastActivity: () => {
        set({ lastActivityTimestamp: Date.now() })
      },

      updateLastReminder: () => {
        set({ lastReminderTimestamp: Date.now() })
      }
    }),
    {
      name: 'study-buddy-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        personalityMode: state.personalityMode,
        explainLevel: state.explainLevel,
        teachingStyle: state.teachingStyle,
        conversationHistory: state.conversationHistory,
        currentConversation: state.currentConversation,
        viewMode: state.viewMode,
        panelWidth: state.panelWidth,
        reminderPreferences: state.reminderPreferences
        // Note: Don't persist pendingActions, executingActionId, or timestamps
      })
    }
  )
)
