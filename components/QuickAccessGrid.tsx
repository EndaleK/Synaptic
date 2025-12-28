"use client"

import { BookOpen, MessageSquare, Network, Mic, ChevronDown } from "lucide-react"

interface QuickAccessGridProps {
  onModeSelect: (mode: string) => void
  onShowAllModes: () => void
}

export default function QuickAccessGrid({ onModeSelect, onShowAllModes }: QuickAccessGridProps) {
  const quickModes = [
    {
      id: "flashcards",
      name: "Flashcards",
      icon: BookOpen,
      color: "bg-blue-500",
      description: "Review & learn"
    },
    {
      id: "chat",
      name: "Chat",
      icon: MessageSquare,
      color: "bg-violet-500",
      description: "Ask questions"
    },
    {
      id: "mindmap",
      name: "Mind Map",
      icon: Network,
      color: "bg-emerald-500",
      description: "Visualize concepts"
    },
    {
      id: "podcast",
      name: "Podcast",
      icon: Mic,
      color: "bg-rose-500",
      description: "Listen & learn"
    }
  ]

  return (
    <div className="space-y-4">
      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickModes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.id}
              onClick={() => onModeSelect(mode.id)}
              className="group flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors duration-200 text-left"
            >
              <div className={`w-11 h-11 ${mode.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {mode.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {mode.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* See All Modes Link */}
      <button
        onClick={onShowAllModes}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        <span>All modes</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  )
}
