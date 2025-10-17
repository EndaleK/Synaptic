"use client"

import { useState, useEffect } from "react"
import { useUIStore, useUserStore } from "@/lib/store/useStore"
import { BookOpen, MessageSquare, Mic, Network } from "lucide-react"
import type { PreferredMode } from "@/lib/supabase/types"

interface ModeConfig {
  id: PreferredMode
  name: string
  icon: typeof BookOpen
  color: string
  description: string
  comingSoon?: boolean
}

const modes: ModeConfig[] = [
  {
    id: "flashcards",
    name: "Flashcards",
    icon: BookOpen,
    color: "from-blue-500 to-cyan-500",
    description: "Interactive study cards with spaced repetition",
  },
  {
    id: "chat",
    name: "Chat",
    icon: MessageSquare,
    color: "from-purple-500 to-pink-500",
    description: "Socratic dialogue with your documents",
  },
  {
    id: "podcast",
    name: "Podcast",
    icon: Mic,
    color: "from-green-500 to-emerald-500",
    description: "AI-narrated audio from your documents",
    comingSoon: true,
  },
  {
    id: "mindmap",
    name: "Mind Map",
    icon: Network,
    color: "from-orange-500 to-red-500",
    description: "Visual concept mapping",
    comingSoon: true,
  },
]

interface Props {
  children: React.ReactNode
  currentMode?: PreferredMode
}

export default function AdaptiveLearningLayout({ children, currentMode = "flashcards" }: Props) {
  const { activeMode, setActiveMode } = useUIStore()
  const { learningStyle, preferredMode } = useUserStore()
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Set initial mode based on learning style or user preference
  useEffect(() => {
    if (!activeMode) {
      const initialMode = preferredMode || getRecommendedMode(learningStyle)
      setActiveMode(initialMode)
    }
  }, [activeMode, learningStyle, preferredMode, setActiveMode])

  const handleModeChange = (newMode: PreferredMode) => {
    if (newMode === activeMode || isTransitioning) return

    const modeConfig = modes.find((m) => m.id === newMode)
    if (modeConfig?.comingSoon) {
      alert(`${modeConfig.name} mode is coming soon! Stay tuned.`)
      return
    }

    setIsTransitioning(true)
    setActiveMode(newMode)

    // Smooth transition
    setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
  }

  const getRecommendedMode = (style: string | null): PreferredMode => {
    switch (style) {
      case "visual":
        return "mindmap"
      case "auditory":
        return "podcast"
      case "kinesthetic":
        return "flashcards"
      case "reading_writing":
        return "chat"
      default:
        return "flashcards"
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black">
      {/* Main Content Area - 70% height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          className={`h-full transition-opacity duration-300 ${
            isTransitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          {children}
        </div>
      </div>

      {/* Mode Dock - 30% height */}
      <div className="h-[30vh] border-t-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Learning Modes
              </h3>
              {learningStyle && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Recommended for {learningStyle} learners
                </p>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Click to switch modes
            </div>
          </div>

          {/* Mode Tiles Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modes.map((mode) => {
              const Icon = mode.icon
              const isActive = activeMode === mode.id
              const isRecommended = learningStyle && getRecommendedMode(learningStyle) === mode.id

              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  disabled={isTransitioning}
                  className={`relative group p-4 rounded-2xl border-2 transition-all text-left ${
                    isActive
                      ? "bg-black dark:bg-white border-black dark:border-white shadow-2xl scale-105"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-lg"
                  } ${mode.comingSoon ? "opacity-75" : ""}`}
                >
                  {/* Recommended Badge */}
                  {isRecommended && !isActive && (
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black text-xs font-semibold rounded-full shadow-lg">
                      For You
                    </div>
                  )}

                  {/* Coming Soon Badge */}
                  {mode.comingSoon && (
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-semibold rounded-full shadow-lg">
                      Soon
                    </div>
                  )}

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
                      isActive
                        ? "bg-white dark:bg-black"
                        : `bg-gradient-to-br ${mode.color}`
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        isActive ? "text-black dark:text-white" : "text-white"
                      }`}
                    />
                  </div>

                  {/* Name */}
                  <h4
                    className={`font-bold mb-1 ${
                      isActive
                        ? "text-white dark:text-black"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {mode.name}
                  </h4>

                  {/* Description */}
                  <p
                    className={`text-xs line-clamp-2 ${
                      isActive
                        ? "text-gray-300 dark:text-gray-700"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {mode.description}
                  </p>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute bottom-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick Tip */}
          {learningStyle && (
            <div className="mt-4 p-3 bg-gradient-to-r from-black/5 to-gray-800/5 dark:from-white/5 dark:to-gray-300/5 rounded-xl border border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold">💡 Tip:</span> As a {learningStyle} learner,
                you might enjoy {getRecommendedMode(learningStyle)} mode the most. But feel
                free to explore all modes!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
