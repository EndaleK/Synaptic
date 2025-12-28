/**
 * Chat Store - Unified Chat State Management
 *
 * Manages chat state for the unified chat interface:
 * - Works with or without attached documents
 * - Personality modes (tutor/buddy/comedy)
 * - Teaching styles (socratic/mixed)
 * - Explain level presets
 * - Conversation history
 *
 * Uses localStorage for preferences, sessionStorage for conversations
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PersonalityMode, ExplainLevel, TeachingStyle } from '@/lib/study-buddy/personalities'

export interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'assistant'
  timestamp: Date
  personality?: PersonalityMode
  explainLevel?: ExplainLevel
}

export interface ChatSession {
  documentId: string  // 'general' for non-document chats
  messages: ChatMessage[]
  lastActive: Date
  title?: string  // Auto-generated from first message
}

interface ChatStore {
  // Current session
  currentSession: ChatSession | null

  // User preferences (persisted)
  personalityMode: PersonalityMode
  teachingStyle: TeachingStyle
  explainLevel: ExplainLevel | null

  // Actions for preferences
  setPersonalityMode: (mode: PersonalityMode) => void
  setTeachingStyle: (style: TeachingStyle) => void
  setExplainLevel: (level: ExplainLevel | null) => void

  // Actions for messages
  setMessages: (documentId: string, messages: ChatMessage[]) => void
  addMessage: (documentId: string, message: ChatMessage) => void
  clearMessages: (documentId: string) => void
  clearAllSessions: () => void

  // Session management
  loadSession: (documentId: string) => ChatMessage[]
  hasSession: (documentId: string) => boolean
  startNewSession: (documentId?: string) => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentSession: null,

      // User preferences with defaults
      personalityMode: 'tutor' as PersonalityMode,
      teachingStyle: 'mixed' as TeachingStyle,
      explainLevel: null,

      // Preference setters
      setPersonalityMode: (mode) => set({ personalityMode: mode }),
      setTeachingStyle: (style) => set({ teachingStyle: style }),
      setExplainLevel: (level) => set({ explainLevel: level }),

      // Start a new session (clears current messages)
      startNewSession: (documentId = 'general') => {
        set({
          currentSession: {
            documentId,
            messages: [],
            lastActive: new Date()
          }
        })
      },

      setMessages: (documentId, messages) => {
        set({
          currentSession: {
            documentId,
            messages,
            lastActive: new Date()
          }
        })
      },

      addMessage: (documentId, message) => {
        const state = get()
        const session = state.currentSession

        if (session && session.documentId === documentId) {
          set({
            currentSession: {
              ...session,
              messages: [...session.messages, message],
              lastActive: new Date()
            }
          })
        } else {
          // Start new session
          set({
            currentSession: {
              documentId,
              messages: [message],
              lastActive: new Date()
            }
          })
        }
      },

      clearMessages: (documentId) => {
        const state = get()
        if (state.currentSession?.documentId === documentId) {
          set({ currentSession: null })
        }
      },

      clearAllSessions: () => {
        set({ currentSession: null })
      },

      loadSession: (documentId) => {
        const state = get()
        if (state.currentSession?.documentId === documentId) {
          return state.currentSession.messages
        }
        return []
      },

      hasSession: (documentId) => {
        const state = get()
        return state.currentSession?.documentId === documentId &&
               state.currentSession.messages.length > 0
      }
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for ephemeral persistence
      partialize: (state) => ({
        currentSession: state.currentSession,
        // Persist user preferences
        personalityMode: state.personalityMode,
        teachingStyle: state.teachingStyle,
        explainLevel: state.explainLevel
      })
    }
  )
)
