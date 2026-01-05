'use client'

import { useState } from 'react'
import {
  Trophy,
  BookOpen,
  Clock,
  CheckCircle2,
  Loader2,
  X,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

interface ChapterCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  chapterId: string
  chapterTitle: string
  studyPlanId: string
  sessionsCompleted: number
  totalSessions: number
  onTakeExam: (examId: string) => void
}

export default function ChapterCompletionModal({
  isOpen,
  onClose,
  chapterId,
  chapterTitle,
  studyPlanId,
  sessionsCompleted,
  totalSessions,
  onTakeExam,
}: ChapterCompletionModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleGenerateExam = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/study-plans/${studyPlanId}/chapter-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          chapterTitle,
          questionCount: 25,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate exam')
      }

      const exam = await response.json()
      onTakeExam(exam.id)
    } catch (err) {
      console.error('Error generating chapter exam:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate exam')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Celebration Header */}
        <div className="relative p-6 pb-0">
          {/* Confetti-like decorations */}
          <div className="absolute top-4 left-4">
            <Sparkles className="w-5 h-5 text-yellow-400/50 animate-pulse" />
          </div>
          <div className="absolute top-8 right-6">
            <Sparkles className="w-4 h-4 text-purple-400/50 animate-pulse delay-150" />
          </div>
          <div className="absolute top-6 left-1/3">
            <Sparkles className="w-3 h-3 text-cyan-400/50 animate-pulse delay-300" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          {/* Trophy icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Chapter Complete!
          </h2>
          <p className="text-white/60 text-lg mb-1">{chapterTitle}</p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 my-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-2xl font-bold">{sessionsCompleted}</span>
              </div>
              <p className="text-xs text-white/40 mt-1">Sessions</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-purple-400">
                <BookOpen className="w-5 h-5" />
                <span className="text-2xl font-bold">{totalSessions}</span>
              </div>
              <p className="text-xs text-white/40 mt-1">Topics Covered</p>
            </div>
          </div>

          {/* Exam prompt */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <div className="flex items-center justify-center gap-2 text-white/80 mb-2">
              <GraduationCap className="w-5 h-5 text-violet-400" />
              <span className="font-medium">Ready for the Chapter Exam?</span>
            </div>
            <p className="text-sm text-white/50">
              Test your mastery with a comprehensive 25-question exam covering everything you&apos;ve learned in this chapter.
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~30 min
              </span>
              <span>25 questions</span>
              <span>All difficulty levels</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGenerateExam}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Exam...
                </>
              ) : (
                <>
                  Take Chapter Exam
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              onClick={handleSkip}
              disabled={isGenerating}
              className="py-2 px-4 text-white/50 hover:text-white/80 transition-colors text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
