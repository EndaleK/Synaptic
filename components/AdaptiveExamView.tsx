'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Brain,
  Clock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Target,
  BarChart3,
  AlertCircle,
  ArrowLeft,
  Flame,
  Award,
  BookOpen
} from 'lucide-react'
import { DifficultyLevel, getDifficultyIndicator, AdaptiveExamResult, TopicPerformance } from '@/lib/adaptive-exam-engine'

interface Question {
  id: string
  questionText: string
  questionType: 'mcq' | 'true_false' | 'short_answer'
  options?: string[]
  topic: string
  difficulty: DifficultyLevel
}

interface LastAnswer {
  questionId: string
  isCorrect: boolean
  correctAnswer: string
  explanation?: string
}

interface AdaptiveExamViewProps {
  examId?: string
  documentId?: string
  onComplete?: (attemptId: string, score: number) => void
  onExit?: () => void
}

export default function AdaptiveExamView({
  examId,
  documentId,
  onComplete,
  onExit
}: AdaptiveExamViewProps) {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Feedback state
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('medium')
  const [difficultyChanged, setDifficultyChanged] = useState(false)
  const [streak, setStreak] = useState(0)

  // Progress state
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Results state
  const [results, setResults] = useState<AdaptiveExamResult | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  // Start exam session
  useEffect(() => {
    const startExam = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/exams/adaptive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            examId,
            documentId,
            questionCount: 15,
            startingDifficulty: 'medium'
          })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to start exam')
        }

        const data = await response.json()
        setSessionId(data.sessionId)
        setCurrentQuestion(data.question)
        setTotalQuestions(data.totalQuestions)
        setCurrentDifficulty(data.currentDifficulty)
        setQuestionStartTime(Date.now())

        if (data.timeLimitMinutes) {
          setTimeRemaining(data.timeLimitMinutes * 60)
        }
      } catch (err) {
        console.error('[AdaptiveExam] Start error:', err)
        setError(err instanceof Error ? err.message : 'Failed to start exam')
      } finally {
        setIsLoading(false)
      }
    }

    startExam()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [examId, documentId])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          // Auto-submit on time out
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timeRemaining])

  const handleTimeUp = useCallback(() => {
    // Submit current answer if any, or mark as incomplete
    if (userAnswer) {
      handleSubmitAnswer()
    }
  }, [userAnswer])

  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion || isSubmitting) return

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/exams/adaptive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          userAnswer: userAnswer.trim(),
          timeSpentSeconds: timeSpent
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit answer')
      }

      const data = await response.json()

      // Update feedback
      setLastAnswer(data.lastAnswer)
      setShowFeedback(true)

      if (data.lastAnswer.isCorrect) {
        setCorrectCount(prev => prev + 1)
      }
      setAnsweredCount(prev => prev + 1)

      if (data.complete) {
        // Exam complete
        setResults(data.results)
        setIsComplete(true)
        if (onComplete && sessionId) {
          onComplete(sessionId, data.results.weightedScore)
        }
      } else {
        // Update for next question
        setCurrentDifficulty(data.currentDifficulty)
        setDifficultyChanged(data.difficultyChanged)
        setStreak(data.progress?.currentStreak || 0)
        setQuestionNumber(data.currentQuestion)

        // Wait for feedback, then show next question
        setTimeout(() => {
          setCurrentQuestion(data.question)
          setUserAnswer('')
          setShowFeedback(false)
          setDifficultyChanged(false)
          setQuestionStartTime(Date.now())
        }, 2000)
      }
    } catch (err) {
      console.error('[AdaptiveExam] Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectOption = (option: string) => {
    if (showFeedback || isSubmitting) return
    setUserAnswer(option)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyTrend = () => {
    if (difficultyChanged) {
      if (currentDifficulty === 'hard') {
        return { icon: TrendingUp, text: 'Difficulty increased!', color: 'text-orange-500' }
      }
      if (currentDifficulty === 'easy') {
        return { icon: TrendingDown, text: 'Difficulty adjusted', color: 'text-blue-500' }
      }
    }
    return { icon: Minus, text: '', color: 'text-gray-400' }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Preparing Adaptive Exam
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Calibrating difficulty to your level...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Start Exam
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error}
          </p>
          {onExit && (
            <button
              onClick={onExit}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  // Results state
  if (isComplete && results) {
    return (
      <AdaptiveExamResults
        results={results}
        onExit={onExit}
        onRetry={() => window.location.reload()}
      />
    )
  }

  // Main exam view
  const difficulty = getDifficultyIndicator(currentDifficulty)
  const trend = getDifficultyTrend()

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {onExit && (
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Exit</span>
          </button>
        )}

        <div className="flex items-center gap-4">
          {/* Timer */}
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              timeRemaining < 60 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
              timeRemaining < 300 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
            </div>
          )}

          {/* Difficulty indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${difficulty.bgColor}`}>
            <div className="flex gap-0.5">
              {[1, 2, 3].map(level => (
                <div
                  key={level}
                  className={`w-2 h-4 rounded-sm ${
                    level <= difficulty.level
                      ? 'bg-current'
                      : 'bg-gray-300 dark:bg-gray-600'
                  } ${difficulty.color}`}
                />
              ))}
            </div>
            <span className={`text-sm font-medium ${difficulty.color}`}>
              {difficulty.label}
            </span>
          </div>

          {/* Streak */}
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
            {correctCount}/{answeredCount} correct
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Difficulty change notification */}
      {difficultyChanged && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${difficulty.bgColor} animate-fadeIn`}>
          <trend.icon className={`w-4 h-4 ${trend.color}`} />
          <span className={`text-sm font-medium ${trend.color}`}>{trend.text}</span>
        </div>
      )}

      {/* Question card */}
      {currentQuestion && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
          {/* Topic badge */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                {currentQuestion.topic}
              </span>
            </div>
          </div>

          {/* Question text */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 leading-relaxed">
              {currentQuestion.questionText}
            </h2>

            {/* Answer options */}
            {currentQuestion.questionType === 'mcq' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = userAnswer === option
                  const letter = String.fromCharCode(65 + index)

                  let optionStyle = 'border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500'
                  let bgStyle = 'bg-white dark:bg-gray-800'

                  if (showFeedback && lastAnswer) {
                    if (option === lastAnswer.correctAnswer) {
                      optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      bgStyle = ''
                    } else if (isSelected && !lastAnswer.isCorrect) {
                      optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      bgStyle = ''
                    }
                  } else if (isSelected) {
                    optionStyle = 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    bgStyle = ''
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectOption(option)}
                      disabled={showFeedback || isSubmitting}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${optionStyle} ${bgStyle} ${
                        !showFeedback && !isSubmitting ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                          isSelected
                            ? 'bg-violet-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {letter}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 pt-1">{option}</span>

                        {showFeedback && option === lastAnswer?.correctAnswer && (
                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />
                        )}
                        {showFeedback && isSelected && option !== lastAnswer?.correctAnswer && (
                          <XCircle className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* True/False options */}
            {currentQuestion.questionType === 'true_false' && (
              <div className="flex gap-4">
                {['True', 'False'].map((option) => {
                  const isSelected = userAnswer.toLowerCase() === option.toLowerCase()

                  let optionStyle = 'border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  let textStyle = 'text-gray-900 dark:text-white'

                  if (showFeedback && lastAnswer) {
                    if (option.toLowerCase() === lastAnswer.correctAnswer.toLowerCase()) {
                      optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      textStyle = 'text-green-700 dark:text-green-300'
                    } else if (isSelected && !lastAnswer.isCorrect) {
                      optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      textStyle = 'text-red-700 dark:text-red-300'
                    }
                  } else if (isSelected) {
                    optionStyle = 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    textStyle = 'text-violet-700 dark:text-violet-300'
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => handleSelectOption(option)}
                      disabled={showFeedback || isSubmitting}
                      className={`flex-1 p-4 rounded-xl border-2 text-center font-semibold text-lg transition-all ${optionStyle} ${textStyle}`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Short answer input */}
            {currentQuestion.questionType === 'short_answer' && (
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={showFeedback || isSubmitting}
                placeholder="Type your answer here..."
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-violet-500 transition-colors"
                rows={3}
              />
            )}

            {/* Feedback message */}
            {showFeedback && lastAnswer && (
              <div className={`mt-6 p-4 rounded-xl ${
                lastAnswer.isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {lastAnswer.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-700 dark:text-green-400">Correct!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-700 dark:text-red-400">Incorrect</span>
                    </>
                  )}
                </div>
                {!lastAnswer.isCorrect && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Correct answer: <strong>{lastAnswer.correctAnswer}</strong>
                  </p>
                )}
                {lastAnswer.explanation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {lastAnswer.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit button */}
          {!showFeedback && (
            <div className="px-6 pb-6">
              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || isSubmitting}
                className="w-full py-3 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Submit Answer
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Results component
function AdaptiveExamResults({
  results,
  onExit,
  onRetry
}: {
  results: AdaptiveExamResult
  onExit?: () => void
  onRetry?: () => void
}) {
  const scoreColor = results.weightedScore >= 80 ? 'text-green-500' :
                     results.weightedScore >= 60 ? 'text-yellow-500' : 'text-red-500'

  const scoreGradient = results.weightedScore >= 80 ? 'from-green-500 to-emerald-500' :
                        results.weightedScore >= 60 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-500'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Score card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden mb-6">
        <div className={`bg-gradient-to-r ${scoreGradient} p-8 text-center text-white`}>
          <Award className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <p className="text-sm font-medium uppercase tracking-wider opacity-90 mb-2">
            Weighted Score
          </p>
          <div className="text-6xl font-black mb-2">
            {Math.round(results.weightedScore)}%
          </div>
          <p className="text-sm opacity-75">
            Raw Score: {Math.round(results.rawScore)}% • {results.correctAnswers}/{results.totalQuestions} correct
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {results.averageDifficulty.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Avg Difficulty</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(results.timeAnalysis.avgTimePerQuestion)}s
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Avg Time</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Object.keys(results.topicPerformance).length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Topics</p>
          </div>
        </div>

        {/* Difficulty breakdown */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Difficulty Breakdown
          </h3>
          <div className="space-y-3">
            {(['easy', 'medium', 'hard'] as const).map(diff => {
              const data = results.difficultyBreakdown[diff]
              if (data.attempted === 0) return null

              const indicator = getDifficultyIndicator(diff)
              return (
                <div key={diff} className="flex items-center gap-3">
                  <div className={`w-20 text-sm font-medium ${indicator.color}`}>
                    {indicator.label}
                  </div>
                  <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        data.accuracy >= 80 ? 'bg-green-500' :
                        data.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${data.accuracy}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm text-gray-500">
                    {data.correct}/{data.attempted} ({Math.round(data.accuracy)}%)
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Topic performance */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Topic Performance
          </h3>
          <div className="space-y-2">
            {Object.values(results.topicPerformance)
              .sort((a, b) => a.accuracy - b.accuracy)
              .map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    {topic.needsReview && (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {topic.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      topic.accuracy >= 80 ? 'text-green-600' :
                      topic.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(topic.accuracy)}%
                    </span>
                    <span className="text-xs text-gray-400">
                      ({topic.correctAnswers}/{topic.totalQuestions})
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {results.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-violet-500 mt-1">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {onExit && (
          <button
            onClick={onExit}
            className="flex-1 py-3 px-6 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
