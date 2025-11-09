"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"
import {
  TrendingUp,
  Target,
  Clock,
  Award,
  BookOpen,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trophy,
  BarChart3
} from "lucide-react"

interface ExamAnalyticsProps {
  examId?: string // If provided, shows analytics for specific exam
  userId?: string // If provided, shows analytics for specific user (admin feature)
}

interface ExamAttempt {
  id: string
  exam_id: string
  exam_title: string
  completed_at: string
  score: number
  correct_answers: number
  total_questions: number
  time_taken_seconds: number
}

interface TopicPerformance {
  topic: string
  correct: number
  total: number
  percentage: number
}

interface DifficultyPerformance {
  difficulty: string
  correct: number
  total: number
  percentage: number
}

interface QuestionAnalytics {
  question_id: string
  question_text: string
  topic: string | null
  difficulty: string | null
  total_attempts: number
  correct_attempts: number
  success_rate: number
}

interface AnalyticsData {
  attempts: ExamAttempt[]
  topicPerformance: TopicPerformance[]
  difficultyPerformance: DifficultyPerformance[]
  questionAnalytics: QuestionAnalytics[]
  overallStats: {
    totalAttempts: number
    averageScore: number
    highestScore: number
    lowestScore: number
    totalTimeSpent: number
    averageTimePerQuestion: number
  }
}

export default function ExamAnalytics({ examId }: ExamAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>("overview")

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setIsLoading(true)

        const url = examId
          ? `/api/exams/${examId}/analytics`
          : `/api/exams/analytics`

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to load analytics')
        }

        const result = await response.json()
        setData(result.analytics)

      } catch (err) {
        console.error('Error loading analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [examId])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-800 dark:text-red-200 text-center">
            {error || 'Failed to load analytics'}
          </p>
        </div>
      </div>
    )
  }

  const { attempts, topicPerformance, difficultyPerformance, questionAnalytics, overallStats } = data

  // Prepare data for score trend chart
  const scoreTrendData = attempts.map(attempt => ({
    date: formatDate(attempt.completed_at),
    score: attempt.score,
    correct: attempt.correct_answers,
    total: attempt.total_questions
  })).reverse() // Show oldest to newest

  // Colors for charts
  const COLORS = {
    primary: '#6366f1', // indigo-600
    success: '#10b981', // green-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444', // red-500
    info: '#3b82f6', // blue-500
  }

  const DIFFICULTY_COLORS = {
    easy: COLORS.success,
    medium: COLORS.warning,
    hard: COLORS.danger
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
              {overallStats.averageScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Average Score</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
            {overallStats.totalAttempts} attempt{overallStats.totalAttempts !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-3xl font-bold text-green-900 dark:text-green-100">
              {overallStats.highestScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Highest Score</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Best performance
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {formatTime(overallStats.averageTimePerQuestion)}
            </span>
          </div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Avg Time/Question</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Total: {formatTime(overallStats.totalTimeSpent)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {overallStats.totalAttempts}
            </span>
          </div>
          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Total Attempts</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            All time
          </p>
        </div>
      </div>

      {/* Score Trend Over Time */}
      {attempts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <button
            onClick={() => toggleSection('trend')}
            className="flex items-center justify-between w-full mb-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Score Trend Over Time
            </h3>
            {expandedSection === 'trend' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'trend' && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, r: 5 }}
                  name="Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Performance by Topic */}
      {topicPerformance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <button
            onClick={() => toggleSection('topics')}
            className="flex items-center justify-between w-full mb-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Performance by Topic
            </h3>
            {expandedSection === 'topics' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'topics' && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="topic" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="percentage" fill={COLORS.info} name="Success Rate (%)" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 space-y-2">
                {topicPerformance.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{topic.topic}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {topic.correct} / {topic.total} correct
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            topic.percentage >= 70 ? 'bg-green-500' :
                            topic.percentage >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[50px] text-right">
                        {topic.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Performance by Difficulty */}
      {difficultyPerformance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <button
            onClick={() => toggleSection('difficulty')}
            className="flex items-center justify-between w-full mb-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance by Difficulty
            </h3>
            {expandedSection === 'difficulty' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'difficulty' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={difficultyPerformance}
                    dataKey="total"
                    nameKey="difficulty"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ difficulty, percentage }) => `${difficulty}: ${percentage.toFixed(1)}%`}
                  >
                    {difficultyPerformance.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DIFFICULTY_COLORS[entry.difficulty.toLowerCase() as keyof typeof DIFFICULTY_COLORS] || COLORS.info}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-4">
                {difficultyPerformance.map((diff, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        diff.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                        diff.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                        'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      }`}>
                        {diff.difficulty}
                      </span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {diff.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {diff.correct} correct out of {diff.total} questions
                    </p>
                    <div className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          diff.difficulty === 'easy' ? 'bg-green-500' :
                          diff.difficulty === 'medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${diff.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Most Challenging Questions */}
      {questionAnalytics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <button
            onClick={() => toggleSection('questions')}
            className="flex items-center justify-between w-full mb-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Most Challenging Questions
            </h3>
            {expandedSection === 'questions' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'questions' && (
            <div className="space-y-3">
              {questionAnalytics
                .sort((a, b) => a.success_rate - b.success_rate)
                .slice(0, 10)
                .map((question, index) => (
                  <div
                    key={question.question_id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white line-clamp-2">
                          {question.question_text}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {question.topic && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full">
                              {question.topic}
                            </span>
                          )}
                          {question.difficulty && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              question.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                              question.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                              'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                            }`}>
                              {question.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className={`text-2xl font-bold ${
                          question.success_rate >= 70 ? 'text-green-600 dark:text-green-400' :
                          question.success_rate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {question.success_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {question.correct_attempts}/{question.total_attempts}
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          question.success_rate >= 70 ? 'bg-green-500' :
                          question.success_rate >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${question.success_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Attempts */}
      {attempts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <button
            onClick={() => toggleSection('attempts')}
            className="flex items-center justify-between w-full mb-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5" />
              Recent Attempts
            </h3>
            {expandedSection === 'attempts' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'attempts' && (
            <div className="space-y-3">
              {attempts.slice(0, 10).map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {attempt.exam_title || 'Exam'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(attempt.completed_at)} • {formatTime(attempt.time_taken_seconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {attempt.correct_answers}/{attempt.total_questions}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                      attempt.score >= 70 ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      attempt.score >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}>
                      {attempt.score.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
