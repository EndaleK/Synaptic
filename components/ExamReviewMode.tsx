"use client"

import { useState, useEffect } from "react"
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
  BookOpen
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
}

interface ExamWithQuestions extends Exam {
  exam_questions: ExamQuestion[]
}

interface AttemptWithExam {
  attempt: ExamAttempt
  exam: ExamWithQuestions
}

export default function ExamReviewMode({ attemptId, onRetake, onExit }: ExamReviewModeProps) {
  const [data, setData] = useState<AttemptWithExam | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all')

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
            {/* Score */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-2.5 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Score</p>
                  <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                    {scorePercentage.toFixed(1)}%
                  </p>
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

          {/* Filter Tabs */}
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No questions match this filter
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Question Review */}
            <div className="lg:col-span-3">
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
      </div>

      {/* Mobile Fixed Bottom Navigation */}
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
    </div>
  )
}
