/**
 * Chat Store - Session-Based Persistence
 *
 * Persists chat conversations during active session (using sessionStorage)
 * Allows seamless mode switching without losing conversation context
 *
 * Key Features:
 * - Messages persist across mode switches (Chat → Flashcards → Chat)
 * - Separate conversations per document
 * - Cleared on browser tab close (sessionStorage)
 * - Optional: Can be promoted to localStorage for permanent history
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'assistant'
  timestamp: Date
}

export interface ChatSession {
  documentId: string
  messages: ChatMessage[]
  lastActive: Date
}

interface ChatStore {
  // Current session
  currentSession: ChatSession | null

  // Actions
  setMessages: (documentId: string, messages: ChatMessage[]) => void
  addMessage: (documentId: string, message: ChatMessage) => void
  clearMessages: (documentId: string) => void
  clearAllSessions: () => void

  // Session management
  loadSession: (documentId: string) => ChatMessage[]
  hasSession: (documentId: string) => boolean
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentSession: null,

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
        currentSession: state.currentSession
      })
    }
  )
)
