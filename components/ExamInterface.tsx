"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Circle, AlertCircle, Loader2, Flag, Send } from "lucide-react"
import type { Exam, ExamQuestion, ExamAnswer, QuestionType } from "@/lib/supabase/types"

interface ExamInterfaceProps {
  examId: string
  onComplete: (attemptId: string, score: number) => void
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

export default function ExamInterface({ examId, onComplete, onExit }: ExamInterfaceProps) {
  // Data state
  const [exam, setExam] = useState<ExamWithQuestions | null>(null)
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const [answers, setAnswers] = useState<Map<string, ExamAnswer>>(new Map())

  // UI state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNavigator, setShowNavigator] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  // Refs
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load exam and start attempt
  useEffect(() => {
    async function initializeExam() {
      try {
        setIsLoading(true)

        // Fetch exam with questions
        const examResponse = await fetch(`/api/exams/${examId}?includeQuestions=true`)
        if (!examResponse.ok) {
          throw new Error('Failed to load exam')
        }
        const examData = await examResponse.json()
        setExam(examData.exam)

        // Start exam attempt
        const attemptResponse = await fetch(`/api/exams/${examId}/attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'timed' })
        })

        if (!attemptResponse.ok) {
          throw new Error('Failed to start exam attempt')
        }

        const attemptData = await attemptResponse.json()
        setAttempt(attemptData.attempt)

        // Initialize timer if exam has time limit
        if (attemptData.attempt.time_limit_seconds) {
          setTimeRemaining(attemptData.attempt.time_limit_seconds)
        }

        // Sort questions by order
        if (examData.exam.exam_questions) {
          examData.exam.exam_questions.sort((a: ExamQuestion, b: ExamQuestion) =>
            a.question_order - b.question_order
          )
        }

      } catch (err) {
        console.error('Error initializing exam:', err)
        setError(err instanceof Error ? err.message : 'Failed to load exam')
      } finally {
        setIsLoading(false)
      }
    }

    initializeExam()

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [examId])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          // Time's up - auto-submit
          handleSubmitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [timeRemaining])

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (!attempt) return

    autoSaveIntervalRef.current = setInterval(() => {
      saveAnswers()
    }, 30000) // 30 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [attempt, answers])

  const saveAnswers = useCallback(async () => {
    if (!attempt || answers.size === 0) return

    try {
      await fetch(`/api/exams/${examId}/attempts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: attempt.id,
          answers: Array.from(answers.values())
        })
      })
    } catch (err) {
      console.error('Error auto-saving answers:', err)
    }
  }, [attempt, answers, examId])

  const handleAnswerChange = useCallback((questionId: string, userAnswer: string) => {
    if (!exam) return

    const question = exam.exam_questions.find(q => q.id === questionId)
    if (!question) return

    const isCorrect = userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()

    const answer: ExamAnswer = {
      question_id: questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      time_spent_seconds: 0 // Can be tracked per question if needed
    }

    setAnswers(prev => new Map(prev).set(questionId, answer))
  }, [exam])

  const handleNextQuestion = useCallback(() => {
    if (!exam) return
    if (currentQuestionIndex < exam.exam_questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [exam, currentQuestionIndex])

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [currentQuestionIndex])

  const handleSubmitExam = useCallback(async () => {
    if (!attempt || !exam || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const startTime = new Date(attempt.started_at).getTime()
      const timeTaken = Math.floor((Date.now() - startTime) / 1000)

      const response = await fetch(`/api/exams/${examId}/attempts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: attempt.id,
          answers: Array.from(answers.values()),
          status: 'completed',
          time_taken_seconds: timeTaken
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit exam')
      }

      const data = await response.json()

      // Clear intervals
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)

      // Notify parent component
      onComplete(attempt.id, data.attempt.score || 0)

    } catch (err) {
      console.error('Error submitting exam:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit exam')
      setIsSubmitting(false)
    }
  }, [attempt, exam, answers, examId, isSubmitting, onComplete])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (error || !exam || !attempt) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-800 dark:text-red-200 text-center mb-4">
            {error || 'Failed to load exam'}
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

  const currentQuestion = exam.exam_questions[currentQuestionIndex]
  const answeredCount = answers.size
  const totalQuestions = exam.exam_questions.length
  const progress = (answeredCount / totalQuestions) * 100

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {exam.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>

            {/* Timer */}
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'
              }`}>
                <Clock className={`w-5 h-5 ${
                  timeRemaining < 300 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                }`} />
                <span className={`font-mono font-bold ${
                  timeRemaining < 300 ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'
                }`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}

            {/* Progress */}
            <div className="ml-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {answeredCount}/{totalQuestions} answered
              </div>
              <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Display */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              {/* Question */}
              <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
                    {currentQuestion.question_text}
                  </h2>
                  {currentQuestion.difficulty && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${
                      currentQuestion.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}>
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>

                {currentQuestion.topic && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Topic: {currentQuestion.topic}
                  </p>
                )}
              </div>

              {/* Answer Input */}
              <div className="space-y-4">
                {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = answers.get(currentQuestion.id)?.user_answer === option
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerChange(currentQuestion.id, option)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-gray-400 dark:border-gray-500'
                            }`}>
                              {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                            </div>
                            <span className="text-gray-900 dark:text-gray-100">
                              {option}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQuestion.question_type === 'true_false' && (
                  <div className="space-y-3">
                    {['True', 'False'].map((option) => {
                      const isSelected = answers.get(currentQuestion.id)?.user_answer === option
                      return (
                        <button
                          key={option}
                          onClick={() => handleAnswerChange(currentQuestion.id, option)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-gray-400 dark:border-gray-500'
                            }`}>
                              {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                            </div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {option}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQuestion.question_type === 'short_answer' && (
                  <div>
                    <textarea
                      value={answers.get(currentQuestion.id)?.user_answer || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Enter your answer..."
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Provide a brief answer (1-2 sentences)
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>

                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Send className="w-5 h-5" />
                  Submit Exam
                </button>

                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Questions
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {exam.exam_questions.map((question, index) => {
                  const isAnswered = answers.has(question.id)
                  const isCurrent = index === currentQuestionIndex
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`aspect-square rounded-lg border-2 font-medium text-sm transition-all ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : isAnswered
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-500" />
                  <span className="text-gray-600 dark:text-gray-400">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50 dark:bg-green-900/20" />
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600" />
                  <span className="text-gray-600 dark:text-gray-400">Not answered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Submit Exam?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              You have answered {answeredCount} out of {totalQuestions} questions.
            </p>
            {answeredCount < totalQuestions && (
              <p className="text-orange-600 dark:text-orange-400 text-sm mb-4">
                ⚠️ You have {totalQuestions - answeredCount} unanswered question(s).
              </p>
            )}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to submit your exam? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
