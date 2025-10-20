"use client"

import { useState } from "react"
import { Brain, Eye, Headphones, Hand, BookOpen, Sparkles, TrendingUp, RefreshCw } from "lucide-react"
import { useUserStore } from "@/lib/store/useStore"
import type { LearningStyle } from "@/lib/supabase/types"

interface LearningProfileBannerProps {
  onTakeAssessment: () => void
}

export default function LearningProfileBanner({ onTakeAssessment }: LearningProfileBannerProps) {
  const { hasCompletedAssessment, learningStyle, assessmentScores } = useUserStore()

  const getStyleIcon = (style: LearningStyle | null) => {
    switch (style) {
      case 'visual':
        return <Eye className="w-6 h-6" />
      case 'auditory':
        return <Headphones className="w-6 h-6" />
      case 'kinesthetic':
        return <Hand className="w-6 h-6" />
      case 'reading_writing':
        return <BookOpen className="w-6 h-6" />
      default:
        return <Brain className="w-6 h-6" />
    }
  }

  const getStyleName = (style: LearningStyle | null) => {
    if (!style) return "Unknown"
    return style.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getStyleDescription = (style: LearningStyle | null) => {
    switch (style) {
      case 'visual':
        return "You learn best with images, diagrams, and visual representations"
      case 'auditory':
        return "You learn best through listening, discussion, and verbal explanations"
      case 'kinesthetic':
        return "You learn best through hands-on activities and practical application"
      case 'reading_writing':
        return "You learn best through reading texts and taking detailed notes"
      default:
        return "Complete the assessment to discover how you learn best"
    }
  }

  // Not assessed state - encourage user to take assessment
  // Show this banner if user hasn't completed assessment OR if learning style is null
  if (!hasCompletedAssessment || !learningStyle) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              Discover Your Learning Style
              <Sparkles className="w-5 h-5 text-purple-500" />
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Take our 2-minute assessment to unlock personalized AI-powered learning experiences tailored to how you learn best.
            </p>

            {/* Learning Styles */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Discover if you're a:
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>Visual learner</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Headphones className="w-4 h-4 text-purple-500" />
                  <span>Auditory learner</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Hand className="w-4 h-4 text-green-500" />
                  <span>Kinesthetic learner</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <span>Reading/Writing learner</span>
                </div>
              </div>
            </div>

            {/* Personalized Features */}
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Get personalized:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span>Flashcards</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span>Chat responses</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span>Podcasts</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span>Mind maps</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onTakeAssessment}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
            >
              <Sparkles className="w-4 h-4" />
              Take Assessment (2 min)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Assessed state - show learning profile summary
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg text-white">
          {getStyleIcon(learningStyle)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {getStyleName(learningStyle)} Learner
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                {getStyleDescription(learningStyle)}
              </p>
            </div>

            {/* Retake Button */}
            <button
              onClick={onTakeAssessment}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
              title="Retake assessment"
            >
              <RefreshCw className="w-4 h-4" />
              Retake
            </button>
          </div>

          {/* Score Breakdown */}
          {assessmentScores && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(assessmentScores).map(([style, score]) => {
                const StyleIcon = (() => {
                  switch (style) {
                    case 'visual': return Eye
                    case 'auditory': return Headphones
                    case 'kinesthetic': return Hand
                    case 'reading_writing': return BookOpen
                    default: return Brain
                  }
                })()

                const percentage = (score / 30) * 100 // Assuming max 30 points per style

                return (
                  <div
                    key={style}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <StyleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                        {style === 'reading_writing' ? 'R/W' : style.slice(0, 3)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Info Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            All content is personalized to your learning style
          </div>
        </div>
      </div>
    </div>
  )
}
