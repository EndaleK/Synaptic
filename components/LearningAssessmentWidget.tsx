"use client"

import { useState, useEffect } from 'react'
import { Brain, Eye, Headphones, Hand, BookText, ChevronDown, ChevronUp, Target, CheckCircle2 } from 'lucide-react'
import { useUserStore } from '@/lib/store/useStore'

interface LearningAssessmentWidgetProps {
  onTakeAssessment: () => void
}

/**
 * Learning Assessment Widget - Quick access to learning style results
 * Shows current learning style, scores, and assessment actions
 */
export default function LearningAssessmentWidget({ onTakeAssessment }: LearningAssessmentWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { learningStyle, assessmentScores } = useUserStore()

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('learningAssessmentWidget_expanded')
    if (saved !== null) {
      setIsExpanded(saved === 'true')
    }
  }, [])

  // Save expanded state to localStorage
  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    localStorage.setItem('learningAssessmentWidget_expanded', String(newState))
  }

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'visual': return Eye
      case 'auditory': return Headphones
      case 'kinesthetic': return Hand
      case 'reading_writing': return BookText
      default: return Brain
    }
  }

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'visual': return 'from-blue-500 to-cyan-500'
      case 'auditory': return 'from-purple-500 to-pink-500'
      case 'kinesthetic': return 'from-green-500 to-emerald-500'
      case 'reading_writing': return 'from-orange-500 to-amber-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getStyleDescription = (style: string) => {
    switch (style) {
      case 'visual': return "You learn best with images, diagrams, and visual aids"
      case 'auditory': return "You learn best through listening and discussion"
      case 'kinesthetic': return "You learn best through hands-on activities"
      case 'reading_writing': return "You learn best through reading and writing"
      case 'mixed': return "You have a balanced mix of learning preferences"
      default: return "Discover your unique learning style"
    }
  }

  const hasCompletedAssessment = learningStyle && learningStyle !== 'none'
  const StyleIcon = getStyleIcon(learningStyle || 'none')
  const styleColor = getStyleColor(learningStyle || 'none')

  return (
    <div className={`rounded-2xl border shadow-sm h-full flex flex-col overflow-hidden ${
      hasCompletedAssessment
        ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header - Always Visible */}
      <button
        onClick={toggleExpanded}
        className={`w-full p-6 flex items-center justify-between transition-colors ${
          hasCompletedAssessment
            ? 'hover:bg-green-100 dark:hover:bg-green-800/30'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${styleColor} flex items-center justify-center`}>
            <StyleIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Learning Assessment
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {hasCompletedAssessment ? `${learningStyle?.replace('_', ' ').charAt(0).toUpperCase()}${learningStyle?.replace('_', ' ').slice(1)} learner` : 'Not completed'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasCompletedAssessment && (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={`px-6 pb-6 border-t ${
          hasCompletedAssessment
            ? 'border-green-200 dark:border-green-700'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="pt-4 space-y-4">
            {hasCompletedAssessment ? (
              <>
                {/* Current Style Display */}
                <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${styleColor} flex items-center justify-center`}>
                      <StyleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Your Learning Style</p>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                        {learningStyle?.replace('_', ' ')}
                      </h4>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {getStyleDescription(learningStyle || '')}
                  </p>
                </div>

                {/* Score Breakdown */}
                {assessmentScores && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Your Scores:</p>
                    {Object.entries(assessmentScores).slice(0, 3).map(([style, score]) => {
                      const percentage = (score / 30) * 100
                      const isTop = style === learningStyle
                      return (
                        <div key={style}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium capitalize ${
                              isTop ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {style.replace('_', ' ')}
                            </span>
                            <span className={`text-xs font-semibold ${
                              isTop ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {Math.round(percentage)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isTop
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gray-400 dark:bg-gray-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Retake Button */}
                <button
                  onClick={onTakeAssessment}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Retake Assessment
                </button>

                {/* Full Profile Link */}
                <div className="pt-3 border-t border-green-200 dark:border-green-700">
                  <a
                    href="/dashboard/settings"
                    className="block text-center text-xs text-green-700 dark:text-green-400 hover:underline font-medium"
                  >
                    View Full Learning Profile →
                  </a>
                </div>
              </>
            ) : (
              <>
                {/* Not Completed State */}
                <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 text-center">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${styleColor} flex items-center justify-center mx-auto mb-3`}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                    Discover Your Learning Style
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                    Take a quick 5-minute assessment to understand how you learn best
                  </p>
                </div>

                {/* Benefits List */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">What you'll learn:</p>
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Your dominant learning style (Visual, Auditory, Kinesthetic, etc.)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Personalized study strategies and recommendations</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Optimized learning tools tailored to your style</span>
                    </div>
                  </div>
                </div>

                {/* Take Assessment Button */}
                <button
                  onClick={onTakeAssessment}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Take Assessment (5 min)
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
