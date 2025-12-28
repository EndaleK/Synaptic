"use client"

import { useState } from "react"
import {
  Calendar,
  Sparkles,
  X,
  BookOpen,
  Clock,
  Target,
  ChevronRight,
} from "lucide-react"
import StudyPlanWizard from "./StudyPlanWizard"

// ============================================
// Types
// ============================================

interface ExamPlanPromptProps {
  examDate: string
  examTitle: string
  examEventId: string
  onClose: () => void
  onPlanCreated?: (planId: string) => void
}

// ============================================
// Component
// ============================================

export default function ExamPlanPrompt({
  examDate,
  examTitle,
  examEventId,
  onClose,
  onPlanCreated,
}: ExamPlanPromptProps) {
  const [showWizard, setShowWizard] = useState(false)

  // Calculate days until exam
  const daysUntilExam = Math.ceil(
    (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  // Handle wizard completion
  const handlePlanComplete = (planId: string) => {
    if (onPlanCreated) {
      onPlanCreated(planId)
    }
    onClose()
  }

  // Show wizard directly if user clicked "Create Plan"
  if (showWizard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <StudyPlanWizard
          examDate={examDate}
          examTitle={examTitle}
          examEventId={examEventId}
          onClose={onClose}
          onComplete={handlePlanComplete}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Gradient header */}
        <div className="relative h-32 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-white/10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Icon */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-violet-500" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-12 pb-6 px-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Create a Study Plan?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You just added an exam. Would you like to create an intelligent study plan to help you prepare?
          </p>

          {/* Exam info */}
          <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {examTitle}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(examDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {daysUntilExam} day{daysUntilExam !== 1 ? "s" : ""} left
                </span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2 mb-6 text-left">
            {[
              { icon: Target, text: "Smart scheduling based on your learning style" },
              { icon: BookOpen, text: "Spaced repetition for better retention" },
              { icon: Clock, text: "Daily study targets that fit your schedule" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <item.icon className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={() => setShowWizard(true)}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              Create Plan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
