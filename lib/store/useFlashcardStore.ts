/**
 * Flashcard Store - Session-Based Position Tracking
 *
 * Persists flashcard viewing position during active session (using sessionStorage)
 * Allows seamless mode switching without losing card position
 *
 * Key Features:
 * - Tracks current card index per document
 * - Persists across mode switches (Flashcards → Chat → Flashcards)
 * - Separate positions per document
 * - Cleared on browser tab close (sessionStorage)
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface FlashcardPosition {
  documentId: string
  currentIndex: number
  totalCards: number
  lastActive: Date
}

interface FlashcardStore {
  // Current positions for each document
  positions: Record<string, FlashcardPosition>

  // Actions
  setPosition: (documentId: string, currentIndex: number, totalCards: number) => void
  getPosition: (documentId: string) => number
  clearPosition: (documentId: string) => void
  clearAllPositions: () => void
  hasPosition: (documentId: string) => boolean
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      positions: {},

      setPosition: (documentId, currentIndex, totalCards) => {
        set((state) => ({
          positions: {
            ...state.positions,
            [documentId]: {
              documentId,
              currentIndex,
              totalCards,
              lastActive: new Date()
            }
          }
        }))
      },

      getPosition: (documentId) => {
        const state = get()
        return state.positions[documentId]?.currentIndex ?? 0
      },

      clearPosition: (documentId) => {
        set((state) => {
          const newPositions = { ...state.positions }
          delete newPositions[documentId]
          return { positions: newPositions }
        })
      },

      clearAllPositions: () => {
        set({ positions: {} })
      },

      hasPosition: (documentId) => {
        const state = get()
        return documentId in state.positions
      }
    }),
    {
      name: 'flashcard-positions',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        positions: state.positions
      })
    }
  )
)
