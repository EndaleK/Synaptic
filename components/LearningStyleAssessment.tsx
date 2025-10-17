"use client"

import { useState } from "react"
import { X, ChevronRight, ChevronLeft, Sparkles, Brain, Eye, Headphones, Hand, BookOpen } from "lucide-react"
import type { LearningStyle, PreferredMode } from "@/lib/supabase/types"
import {
  quickAssessmentQuestions,
  calculateAssessmentResults,
  getStyleDescription,
  getModeRecommendation,
  type AssessmentQuestion
} from "@/lib/assessments"

// Use the comprehensive question library
const questions = quickAssessmentQuestions

interface Props {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: {
    dominant_style: LearningStyle
    scores: {
      visual: number
      auditory: number
      kinesthetic: number
      reading_writing: number
    }
    recommended_mode: PreferredMode
  }) => void
  allowSkip?: boolean
}

export default function LearningStyleAssessment({ isOpen, onClose, onComplete, allowSkip = true }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)

  if (!isOpen) return null

  const handleAnswer = (optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: optionIndex
    }))
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      calculateResults()
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const calculateResults = () => {
    // Use the comprehensive scoring engine
    const results = calculateAssessmentResults(questions, answers)

    setShowResults(true)
    onComplete({
      dominant_style: results.dominant_learning_style,
      scores: results.vark_scores,
      recommended_mode: results.recommended_mode
    })
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100
  const currentQ = questions[currentQuestion]
  const hasAnswer = answers[currentQuestion] !== undefined

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'visual': return <Eye className="w-6 h-6" />
      case 'auditory': return <Headphones className="w-6 h-6" />
      case 'kinesthetic': return <Hand className="w-6 h-6" />
      case 'reading_writing': return <BookOpen className="w-6 h-6" />
      default: return <Brain className="w-6 h-6" />
    }
  }

  // Use imported functions from scoring engine
  // getStyleDescription and getModeRecommendation are imported

  if (showResults) {
    // Calculate comprehensive results using the scoring engine
    const assessmentResults = calculateAssessmentResults(questions, answers)
    const result = {
      dominant_style: assessmentResults.dominant_learning_style,
      scores: assessmentResults.vark_scores,
      recommended_mode: assessmentResults.recommended_mode
    }

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Your Learning Profile</h2>
                  <p className="text-white/80 text-sm">Personalized insights ready!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Content */}
          <div className="p-6 space-y-6">
            {/* Dominant Style */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                  {getStyleIcon(result.dominant_style)}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your Learning Style</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {result.dominant_style.replace('_', ' ')}
                  </h3>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                {getStyleDescription(result.dominant_style)}
              </p>
            </div>

            {/* Score Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Your Scores</h3>
              <div className="space-y-3">
                {Object.entries(result.scores).map(([style, score]) => {
                  const maxPossible = questions.length * 3
                  const percentage = (score / maxPossible) * 100
                  return (
                    <div key={style}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize flex items-center gap-2">
                          {getStyleIcon(style)}
                          {style.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {score}/{maxPossible}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Recommended for You</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {getModeRecommendation(result.recommended_mode)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Learning Style Assessment</h2>
                <p className="text-white/80 text-sm">Personalize your learning experience</p>
              </div>
            </div>
            {allowSkip && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Skip for now"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {currentQ.question}
          </h3>

          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  answers[currentQuestion] === index
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    answers[currentQuestion] === index
                      ? "border-purple-500 bg-purple-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}>
                    {answers[currentQuestion] === index && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!hasAnswer}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {currentQuestion === questions.length - 1 ? "See Results" : "Next"}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
