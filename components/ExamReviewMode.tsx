"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trophy,
  Clock,
  Target,
  RefreshCw,
  ArrowLeft,
  BookOpen,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Timer,
  Zap,
  History,
  Sparkles,
  BarChart3,
  Brain
} from "lucide-react"
import type { Exam, ExamQuestion, ExamAnswer } from "@/lib/supabase/types"

interface ExamReviewModeProps {
  attemptId: string
  onRetake?: () => void
  onExit: () => void
}

interface ExamAttempt {
  id: string
  exam_id: string
  user_id: number
  mode: string
  status: string
  total_questions: number
  time_limit_seconds: number | null
  started_at: string
  completed_at: string | null
  time_taken_seconds: number | null
  correct_answers: number | null
  score: number | null
  answers: ExamAnswer[]
  is_adaptive?: boolean
  topic_scores?: Record<string, number>
}

interface ExamWithQuestions extends Exam {
  exam_questions: ExamQuestion[]
}

interface AttemptWithExam {
  attempt: ExamAttempt
  exam: ExamWithQuestions
  previousAttempts?: ExamAttempt[]
}

interface AIExplanation {
  whyWrong: string
  keyConceptsMissed: string[]
  studyTip: string
  similarQuestions: {
    question: string
    correctAnswer: string
    hint: string
  }[]
}

interface TimeAnalysis {
  averageTimePerQuestion: number
  expectedTimePerQuestion: number
  tooSlow: string[]  // question IDs
  tooFast: string[]  // question IDs
  optimal: string[]  // question IDs
}

export default function ExamReviewMode({ attemptId, onRetake, onExit }: ExamReviewModeProps) {
  const [data, setData] = useState<AttemptWithExam | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all')

  // New enhanced features state
  const [aiExplanations, setAiExplanations] = useState<Record<string, AIExplanation>>({})
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null)
  const [timeAnalysis, setTimeAnalysis] = useState<TimeAnalysis | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [showTimeAnalysis, setShowTimeAnalysis] = useState(false)
  const [activeTab, setActiveTab] = useState<'review' | 'insights' | 'topics'>('review')

  // Load exam attempt and questions
  useEffect(() => {
    async function loadAttempt() {
      try {
        setIsLoading(true)

        const response = await fetch(`/api/exams/attempts/${attemptId}`)
        if (!response.ok) {
          throw new Error('Failed to load exam attempt')
        }

        const result = await response.json()
        setData(result)

        // Sort questions by order
        if (result.exam.exam_questions) {
          result.exam.exam_questions.sort((a: ExamQuestion, b: ExamQuestion) =>
            a.question_order - b.question_order
          )
        }

      } catch (err) {
        console.error('Error loading attempt:', err)
        setError(err instanceof Error ? err.message : 'Failed to load exam results')
      } finally {
        setIsLoading(false)
      }
    }

    loadAttempt()
  }, [attemptId])

  // Calculate time analysis when data loads
  useEffect(() => {
    if (data?.attempt.answers) {
      const answers = data.attempt.answers
      const totalTime = data.attempt.time_taken_seconds || 0
      const questionCount = answers.length

      if (questionCount > 0 && totalTime > 0) {
        const avgTime = totalTime / questionCount
        const expectedTime = 60 // 60 seconds per question is reasonable

        const tooSlow: string[] = []
        const tooFast: string[] = []
        const optimal: string[] = []

        answers.forEach((answer) => {
          const timeSpent = answer.time_spent || 0
          if (timeSpent > expectedTime * 2) {
            tooSlow.push(answer.question_id)
          } else if (timeSpent < expectedTime * 0.3) {
            tooFast.push(answer.question_id)
          } else {
            optimal.push(answer.question_id)
          }
        })

        setTimeAnalysis({
          averageTimePerQuestion: Math.round(avgTime),
          expectedTimePerQuestion: expectedTime,
          tooSlow,
          tooFast,
          optimal
        })
      }
    }
  }, [data])

  // Fetch AI explanation for a question
  const fetchAIExplanation = useCallback(async (questionId: string, questionText: string, userAnswer: string, correctAnswer: string, topic: string) => {
    if (aiExplanations[questionId] || loadingExplanation) return

    setLoadingExplanation(questionId)

    try {
      const response = await fetch('/api/exams/explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          questionText,
          userAnswer,
          correctAnswer,
          topic,
          examId: data?.exam.id
        })
      })

      if (response.ok) {
        const explanation = await response.json()
        setAiExplanations(prev => ({
          ...prev,
          [questionId]: explanation
        }))
      }
    } catch (err) {
      console.error('Failed to fetch AI explanation:', err)
    } finally {
      setLoadingExplanation(null)
    }
  }, [aiExplanations, loadingExplanation, data?.exam.id])

  // Get performance trend compared to previous attempts
  const getPerformanceTrend = (): { trend: 'up' | 'down' | 'stable', change: number } | null => {
    if (!data?.previousAttempts || data.previousAttempts.length === 0) return null

    const currentScore = data.attempt.score || 0
    const previousScore = data.previousAttempts[0]?.score || 0
    const change = currentScore - previousScore

    if (change > 5) return { trend: 'up', change }
    if (change < -5) return { trend: 'down', change }
    return { trend: 'stable', change }
  }

  // Get topic performance breakdown
  const getTopicPerformance = (): { topic: string, correct: number, total: number, percentage: number }[] => {
    if (!data) return []

    const topicStats: Record<string, { correct: number, total: number }> = {}

    data.exam.exam_questions.forEach(question => {
      const topic = question.topic || 'General'
      const answer = data.attempt.answers.find(a => a.question_id === question.id)

      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0 }
      }

      topicStats[topic].total++
      if (answer?.is_correct) {
        topicStats[topic].correct++
      }
    })

    return Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        percentage: Math.round((stats.correct / stats.total) * 100)
      }))
      .sort((a, b) => a.percentage - b.percentage) // Weakest topics first
  }

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAnswerForQuestion = (questionId: string): ExamAnswer | undefined => {
    return data?.attempt.answers.find(a => a.question_id === questionId)
  }

  const getFilteredQuestions = () => {
    if (!data) return []

    const questions = data.exam.exam_questions

    if (filter === 'correct') {
      return questions.filter(q => {
        const answer = getAnswerForQuestion(q.id)
        return answer?.is_correct
      })
    }

    if (filter === 'incorrect') {
      return questions.filter(q => {
        const answer = getAnswerForQuestion(q.id)
        return answer && !answer.is_correct
      })
    }

    return questions
  }

  const handleNextQuestion = () => {
    const filteredQuestions = getFilteredQuestions()
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading exam results...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-800 dark:text-red-200 text-center mb-4">
            {error || 'Failed to load exam results'}
          </p>
          <button
            onClick={onExit}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
    )
  }

  const { attempt, exam } = data
  const filteredQuestions = getFilteredQuestions()
  const currentQuestion = filteredQuestions[currentQuestionIndex]
  const currentAnswer = getAnswerForQuestion(currentQuestion.id)
  const scorePercentage = attempt.score || 0
  const correctCount = attempt.correct_answers || 0
  const incorrectCount = attempt.total_questions - correctCount
  const allQuestions = exam.exam_questions
  const performanceTrend = getPerformanceTrend()
  const topicPerformance = getTopicPerformance()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
      {/* Header with Performance Summary */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                {exam.title} - Review
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Completed on {new Date(attempt.completed_at || '').toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
              {onRetake && (
                <button
                  onClick={onRetake}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Retake</span>
                </button>
              )}
              <button
                onClick={onExit}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Score with Trend */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-2.5 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Score</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                      {scorePercentage.toFixed(1)}%
                    </p>
                    {performanceTrend && (
                      <div className={`flex items-center gap-0.5 text-xs font-medium ${
                        performanceTrend.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                        performanceTrend.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                        'text-gray-500 dark:text-gray-400'
                      }`}>
                        {performanceTrend.trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                        {performanceTrend.trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                        {performanceTrend.trend === 'stable' && <Minus className="w-3.5 h-3.5" />}
                        <span>{Math.abs(performanceTrend.change).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Correct Answers */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-2.5 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Correct</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">
                    {correctCount}/{attempt.total_questions}
                  </p>
                </div>
              </div>
            </div>

            {/* Incorrect Answers */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-2.5 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-600 rounded-lg">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Incorrect</p>
                  <p className="text-xl font-bold text-red-900 dark:text-red-100">
                    {incorrectCount}/{attempt.total_questions}
                  </p>
                </div>
              </div>
            </div>

            {/* Time Taken */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Time</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {formatTime(attempt.time_taken_seconds)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mt-3">
            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'review'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Review
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'insights'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Insights
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'topics'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Brain className="w-4 h-4" />
              Topics
            </button>
          </div>

          {/* Filter Tabs (only shown in review mode) */}
          {activeTab === 'review' && (
          <div className="flex gap-1.5 sm:gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setFilter('all')
                setCurrentQuestionIndex(0)
              }}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors whitespace-nowrap active:scale-95 ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All ({allQuestions.length})
            </button>
            <button
              onClick={() => {
                setFilter('correct')
                setCurrentQuestionIndex(0)
              }}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors whitespace-nowrap active:scale-95 ${
                filter === 'correct'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Correct ({correctCount})
            </button>
            <button
              onClick={() => {
                setFilter('incorrect')
                setCurrentQuestionIndex(0)
              }}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors whitespace-nowrap active:scale-95 ${
                filter === 'incorrect'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Incorrect ({incorrectCount})
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {/* Time Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Time Analysis</h3>
              </div>

              {timeAnalysis ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {timeAnalysis.averageTimePerQuestion}s
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Avg per question</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {timeAnalysis.optimal.length}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">Optimal pace</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                        {timeAnalysis.tooSlow.length + timeAnalysis.tooFast.length}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Need attention</p>
                    </div>
                  </div>

                  {timeAnalysis.tooSlow.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Spent too long on {timeAnalysis.tooSlow.length} question{timeAnalysis.tooSlow.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Consider time management strategies. If stuck, move on and return later.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {timeAnalysis.tooFast.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            Rushed through {timeAnalysis.tooFast.length} question{timeAnalysis.tooFast.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                            Take more time to read carefully. Quick answers often lead to mistakes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Time data not available for this attempt.
                </p>
              )}
            </div>

            {/* Previous Attempts Comparison */}
            {data.previousAttempts && data.previousAttempts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Previous Attempts</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                        Current
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(attempt.completed_at || '').toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {scorePercentage.toFixed(1)}%
                    </span>
                  </div>

                  {data.previousAttempts.slice(0, 3).map((prevAttempt, index) => (
                    <div key={prevAttempt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Attempt {data.previousAttempts!.length - index}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {new Date(prevAttempt.completed_at || '').toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${
                        (prevAttempt.score || 0) >= 70 ? 'text-green-600 dark:text-green-400' :
                        (prevAttempt.score || 0) >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {(prevAttempt.score || 0).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>

                {performanceTrend && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    performanceTrend.trend === 'up' ? 'bg-green-50 dark:bg-green-900/20' :
                    performanceTrend.trend === 'down' ? 'bg-red-50 dark:bg-red-900/20' :
                    'bg-gray-50 dark:bg-gray-700/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      {performanceTrend.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />}
                      {performanceTrend.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />}
                      {performanceTrend.trend === 'stable' && <Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                      <p className={`text-sm font-medium ${
                        performanceTrend.trend === 'up' ? 'text-green-800 dark:text-green-200' :
                        performanceTrend.trend === 'down' ? 'text-red-800 dark:text-red-200' :
                        'text-gray-800 dark:text-gray-200'
                      }`}>
                        {performanceTrend.trend === 'up' && `Great improvement! You scored ${Math.abs(performanceTrend.change).toFixed(1)}% higher than last time.`}
                        {performanceTrend.trend === 'down' && `Score dropped ${Math.abs(performanceTrend.change).toFixed(1)}% from last attempt. Review your weak areas.`}
                        {performanceTrend.trend === 'stable' && 'Your performance is consistent. Focus on weak topics to improve.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 max-h-[calc(100vh-280px)] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2 -mt-1 pt-1">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Topic Performance</h3>
            </div>

            <div className="space-y-3">
              {topicPerformance.map((topic) => (
                <div key={topic.topic} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {topic.topic}
                    </span>
                    <span className={`text-sm font-bold ${
                      topic.percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                      topic.percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {topic.correct}/{topic.total} ({topic.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        topic.percentage >= 80 ? 'bg-green-500' :
                        topic.percentage >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                  {topic.percentage < 60 && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Focus area: Needs more practice
                    </p>
                  )}
                </div>
              ))}
            </div>

            {topicPerformance.filter(t => t.percentage < 60).length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                      Study Recommendation
                    </h4>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1">
                      Focus on {topicPerformance.filter(t => t.percentage < 60).map(t => t.topic).join(', ')} before your next attempt.
                      Consider reviewing flashcards or creating a study plan for these topics.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Tab - Original Question Review */}
        {activeTab === 'review' && (
        <>
        {filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No questions match this filter
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-280px)]">
            {/* Question Review */}
            <div className="lg:col-span-3 overflow-y-auto pr-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-5">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Question {allQuestions.findIndex(q => q.id === currentQuestion.id) + 1}
                      </span>
                      {currentQuestion.difficulty && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          currentQuestion.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                          currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                          'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}>
                          {currentQuestion.difficulty}
                        </span>
                      )}
                      {currentQuestion.topic && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                          {currentQuestion.topic}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {currentQuestion.question_text}
                    </h2>
                  </div>

                  {/* Result Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ml-3 text-sm ${
                    currentAnswer?.is_correct
                      ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800'
                      : 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800'
                  }`}>
                    {currentAnswer?.is_correct ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-green-800 dark:text-green-200">Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="font-medium text-red-800 dark:text-red-200">Incorrect</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Answer Display for MCQ and True/False */}
                {(currentQuestion.question_type === 'mcq' || currentQuestion.question_type === 'true_false') && currentQuestion.options && (
                  <div className="space-y-2 mb-4">
                    {currentQuestion.options.map((option, index) => {
                      const isUserAnswer = currentAnswer?.user_answer === option
                      const isCorrectAnswer = option === currentQuestion.correct_answer

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border-2 ${
                            isCorrectAnswer
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : isUserAnswer && !isCorrectAnswer
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrectAnswer && (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            )}
                            {!isCorrectAnswer && !isUserAnswer && (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-400 dark:border-gray-500 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <span className="text-sm text-gray-900 dark:text-gray-100">{option}</span>
                              {isCorrectAnswer && (
                                <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">
                                  (Correct Answer)
                                </span>
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">
                                  (Your Answer)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Answer Display for Short Answer */}
                {currentQuestion.question_type === 'short_answer' && (
                  <div className="space-y-2 mb-4">
                    {/* User's Answer */}
                    <div className={`p-3 rounded-lg border-2 ${
                      currentAnswer?.is_correct
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    }`}>
                      <div className="flex items-start gap-2">
                        {currentAnswer?.is_correct ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Your Answer:</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {currentAnswer?.user_answer || '(No answer provided)'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Correct Answer (if user was wrong) */}
                    {!currentAnswer?.is_correct && (
                      <div className="p-3 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Answer:</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{currentQuestion.correct_answer}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation */}
                {currentQuestion.explanation && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
                          Explanation
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI "Why Was I Wrong?" Button for incorrect answers */}
                {!currentAnswer?.is_correct && (
                  <div className="mb-4">
                    {!aiExplanations[currentQuestion.id] ? (
                      <button
                        onClick={() => fetchAIExplanation(
                          currentQuestion.id,
                          currentQuestion.question_text,
                          currentAnswer?.user_answer || '',
                          currentQuestion.correct_answer,
                          currentQuestion.topic || 'General'
                        )}
                        disabled={loadingExplanation === currentQuestion.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingExplanation === currentQuestion.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analyzing your answer...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>Why was I wrong? (AI Analysis)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {/* Why Wrong */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100">
                              Why Your Answer Was Wrong
                            </h3>
                          </div>
                          <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed ml-7">
                            {aiExplanations[currentQuestion.id].whyWrong}
                          </p>
                        </div>

                        {/* Key Concepts Missed */}
                        {aiExplanations[currentQuestion.id].keyConceptsMissed.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-2">
                              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                Key Concepts to Review
                              </h3>
                            </div>
                            <ul className="ml-7 space-y-1">
                              {aiExplanations[currentQuestion.id].keyConceptsMissed.map((concept, i) => (
                                <li key={i} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                                  <span className="text-amber-500">•</span>
                                  {concept}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Study Tip */}
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <Target className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                            <h3 className="text-sm font-bold text-green-900 dark:text-green-100">
                              Study Tip
                            </h3>
                          </div>
                          <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed ml-7">
                            {aiExplanations[currentQuestion.id].studyTip}
                          </p>
                        </div>

                        {/* Similar Practice Questions */}
                        {aiExplanations[currentQuestion.id].similarQuestions.length > 0 && (
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-3">
                              <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                                Practice Similar Questions
                              </h3>
                            </div>
                            <div className="ml-7 space-y-3">
                              {aiExplanations[currentQuestion.id].similarQuestions.map((sq, i) => (
                                <div key={i} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-indigo-900">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    {sq.question}
                                  </p>
                                  <details className="group">
                                    <summary className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                                      Show hint
                                    </summary>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                                      {sq.hint}
                                    </p>
                                  </details>
                                  <details className="group mt-1">
                                    <summary className="text-xs text-green-600 dark:text-green-400 cursor-pointer hover:underline">
                                      Show answer
                                    </summary>
                                    <p className="text-xs text-green-700 dark:text-green-300 mt-1 font-medium">
                                      {sq.correctAnswer}
                                    </p>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Source Reference */}
                {currentQuestion.source_reference && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Source:</span> {currentQuestion.source_reference}
                    </p>
                  </div>
                )}

                {/* Navigation - Desktop */}
                <div className="hidden md:flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {currentQuestionIndex + 1} of {filteredQuestions.length}
                  </span>

                  <button
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === filteredQuestions.length - 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Question Navigator - Desktop Only */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sticky top-20">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  Questions
                </h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {filteredQuestions.map((question, index) => {
                    const answer = getAnswerForQuestion(question.id)
                    const isCurrent = index === currentQuestionIndex
                    const questionNumber = allQuestions.findIndex(q => q.id === question.id) + 1

                    return (
                      <button
                        key={question.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`aspect-square rounded-lg border-2 font-medium text-xs transition-all ${
                          isCurrent
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : answer?.is_correct
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                            : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}
                        title={answer?.is_correct ? 'Correct' : 'Incorrect'}
                      >
                        {questionNumber}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-indigo-500" />
                    <span className="text-gray-600 dark:text-gray-400">Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-50 dark:bg-green-900/20" />
                    <span className="text-gray-600 dark:text-gray-400">Correct</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50 dark:bg-red-900/20" />
                    <span className="text-gray-600 dark:text-gray-400">Incorrect</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      {activeTab === 'review' && (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 z-20 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {currentQuestionIndex + 1}/{filteredQuestions.length}
          </div>

          <button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === filteredQuestions.length - 1}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm font-medium"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
