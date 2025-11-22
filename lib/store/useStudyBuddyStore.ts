/**
 * Study Buddy Store
 *
 * Manages conversation state for the Study Buddy feature:
 * - Conversation messages
 * - Personality mode (tutor/buddy)
 * - Explain level presets
 * - Conversation history
 *
 * Uses localStorage for persistence across sessions
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersonalityMode, ExplainLevel } from '@/lib/study-buddy/personalities'

export interface StudyBuddyMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  personality: PersonalityMode
  explainLevel?: ExplainLevel
}

export interface StudyBuddyConversation {
  id: string
  messages: StudyBuddyMessage[]
  createdAt: Date
  lastActive: Date
  title?: string // Auto-generated from first message
}

interface StudyBuddyState {
  // Current conversation
  currentConversation: StudyBuddyConversation | null

  // User preferences
  personalityMode: PersonalityMode
  explainLevel: ExplainLevel | null

  // Conversation history (last 10 conversations)
  conversationHistory: StudyBuddyConversation[]

  // Actions
  setPersonalityMode: (mode: PersonalityMode) => void
  setExplainLevel: (level: ExplainLevel | null) => void

  // Conversation management
  startNewConversation: () => void
  addMessage: (message: Omit<StudyBuddyMessage, 'id' | 'timestamp'>) => void
  loadConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  clearCurrentConversation: () => void

  // Get current messages
  getCurrentMessages: () => StudyBuddyMessage[]
}

export const useStudyBuddyStore = create<StudyBuddyState>()(
  persist(
    (set, get) => ({
      currentConversation: null,
      personalityMode: 'tutor',
      explainLevel: null,
      conversationHistory: [],

      setPersonalityMode: (mode) => {
        set({ personalityMode: mode })
      },

      setExplainLevel: (level) => {
        set({ explainLevel: level })
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
      }
    }),
    {
      name: 'study-buddy-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        personalityMode: state.personalityMode,
        explainLevel: state.explainLevel,
        conversationHistory: state.conversationHistory,
        currentConversation: state.currentConversation
      })
    }
  )
)
