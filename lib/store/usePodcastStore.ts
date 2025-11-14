/**
 * Podcast Store - Session-Based Playback Position Tracking
 *
 * Persists podcast playback position during active session (using sessionStorage)
 * Allows seamless mode switching without losing playback progress
 *
 * Key Features:
 * - Tracks current playback time per podcast
 * - Persists across mode switches (Podcast → Chat → Podcast)
 * - Separate positions per podcast
 * - Cleared on browser tab close (sessionStorage)
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface PodcastPosition {
  podcastId: string
  currentTime: number // in seconds
  duration: number // total duration in seconds
  lastActive: Date
}

interface PodcastStore {
  // Current positions for each podcast
  positions: Record<string, PodcastPosition>

  // Actions
  setPosition: (podcastId: string, currentTime: number, duration: number) => void
  getPosition: (podcastId: string) => number
  clearPosition: (podcastId: string) => void
  clearAllPositions: () => void
  hasPosition: (podcastId: string) => boolean
}

export const usePodcastStore = create<PodcastStore>()(
  persist(
    (set, get) => ({
      positions: {},

      setPosition: (podcastId, currentTime, duration) => {
        set((state) => ({
          positions: {
            ...state.positions,
            [podcastId]: {
              podcastId,
              currentTime,
              duration,
              lastActive: new Date()
            }
          }
        }))
      },

      getPosition: (podcastId) => {
        const state = get()
        return state.positions[podcastId]?.currentTime ?? 0
      },

      clearPosition: (podcastId) => {
        set((state) => {
          const newPositions = { ...state.positions }
          delete newPositions[podcastId]
          return { positions: newPositions }
        })
      },

      clearAllPositions: () => {
        set({ positions: {} })
      },

      hasPosition: (podcastId) => {
        const state = get()
        return podcastId in state.positions
      }
    }),
    {
      name: 'podcast-positions',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        positions: state.positions
      })
    }
  )
)
