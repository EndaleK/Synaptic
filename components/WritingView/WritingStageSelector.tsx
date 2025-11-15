"use client"

import { Lightbulb, PenTool, RefreshCw, CheckCheck, Send, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WritingStage } from "@/lib/supabase/types"

interface WritingStageSelectorProps {
  currentStage: WritingStage
  onStageChange: (stage: WritingStage) => void
  completedStages?: WritingStage[]
  className?: string
}

/**
 * WritingStageSelector - Navigation for the 5-stage writing-to-learn process
 *
 * Based on writing pedagogy research (Emig 1977, Process Theory):
 * Planning → Drafting → Revising → Editing → Publishing
 *
 * Each stage has distinct purpose and should offer stage-specific tools
 */
export default function WritingStageSelector({
  currentStage,
  onStageChange,
  completedStages = [],
  className
}: WritingStageSelectorProps) {

  const stages: Array<{
    id: WritingStage
    label: string
    icon: React.ReactNode
    color: string
    description: string
    order: number
  }> = [
    {
      id: 'planning',
      label: 'Planning',
      icon: <Lightbulb className="w-4 h-4 md:w-5 md:h-5" />,
      color: 'indigo',
      description: 'Brainstorm ideas and create an outline',
      order: 1
    },
    {
      id: 'drafting',
      label: 'Drafting',
      icon: <PenTool className="w-4 h-4 md:w-5 md:h-5" />,
      color: 'sky',
      description: 'Write your first draft without worrying about perfection',
      order: 2
    },
    {
      id: 'revising',
      label: 'Revising',
      icon: <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />,
      color: 'amber',
      description: 'Improve structure, arguments, and flow',
      order: 3
    },
    {
      id: 'editing',
      label: 'Editing',
      icon: <CheckCheck className="w-4 h-4 md:w-5 md:h-5" />,
      color: 'rose',
      description: 'Polish grammar, style, and citations',
      order: 4
    },
    {
      id: 'publishing',
      label: 'Publishing',
      icon: <Send className="w-4 h-4 md:w-5 md:h-5" />,
      color: 'emerald',
      description: 'Finalize and submit your work',
      order: 5
    }
  ]

  const getStageStyles = (stageId: WritingStage) => {
    const stage = stages.find(s => s.id === stageId)
    if (!stage) return {}

    const isActive = currentStage === stageId
    const isCompleted = completedStages.includes(stageId)
    const colorMap: Record<string, any> = {
      indigo: {
        active: 'bg-indigo-500 text-white border-indigo-600',
        inactive: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
        completed: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
      },
      sky: {
        active: 'bg-sky-500 text-white border-sky-600',
        inactive: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/30',
        completed: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
      },
      amber: {
        active: 'bg-amber-500 text-white border-amber-600',
        inactive: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
        completed: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
      },
      rose: {
        active: 'bg-rose-500 text-white border-rose-600',
        inactive: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30',
        completed: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
      },
      emerald: {
        active: 'bg-emerald-500 text-white border-emerald-600',
        inactive: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
        completed: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
      }
    }

    const colors = colorMap[stage.color]
    if (isActive) return colors.active
    if (isCompleted) return colors.completed
    return `${colors.inactive} ${colors.hover}`
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700", className)}>
      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center flex-1">
                <button
                  onClick={() => onStageChange(stage.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all w-full",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                    getStageStyles(stage.id),
                    currentStage === stage.id && "shadow-lg scale-105"
                  )}
                  aria-current={currentStage === stage.id ? 'step' : undefined}
                  title={stage.description}
                >
                  <div className="flex items-center gap-2">
                    {stage.icon}
                    <span className="font-semibold text-sm">{stage.label}</span>
                  </div>
                  {completedStages.includes(stage.id) && currentStage !== stage.id && (
                    <span className="text-xs opacity-75">✓ Complete</span>
                  )}
                  {currentStage === stage.id && (
                    <span className="text-xs opacity-90">Current</span>
                  )}
                </button>
                {index < stages.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-1 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Stage Description */}
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stages.find(s => s.id === currentStage)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Writing Stage
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Step {stages.find(s => s.id === currentStage)?.order} of 5
          </span>
        </div>

        {/* Mobile Stage Selector - Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => onStageChange(stage.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all flex-shrink-0",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500",
                getStageStyles(stage.id),
                currentStage === stage.id && "shadow-md"
              )}
              aria-current={currentStage === stage.id ? 'step' : undefined}
            >
              {stage.icon}
              <span className="text-xs font-medium whitespace-nowrap">{stage.label}</span>
              {completedStages.includes(stage.id) && currentStage !== stage.id && (
                <span className="text-xs">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Mobile Stage Description */}
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {stages.find(s => s.id === currentStage)?.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${((stages.find(s => s.id === currentStage)?.order || 1) / stages.length) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Hide scrollbar for mobile horizontal scroll */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
