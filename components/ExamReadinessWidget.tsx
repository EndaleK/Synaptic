"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  AlertCircle,
  ChevronRight,
  Zap,
  BookOpen,
  Brain,
  Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReadinessFactors {
  topicCoverage: number
  masteryLevel: number
  mockExamPerformance: number
  consistencyBonus: number
}

interface WeakTopic {
  topic: string
  score: number
  reason: string
  suggestedAction: string
}

interface ReadinessData {
  score: number
  factors: ReadinessFactors
  trend: 'improving' | 'stable' | 'declining'
  weakTopics: WeakTopic[]
  daysUntilExam: number | null
  lastCalculated: string
}

interface SubjectReadiness {
  documentId: string
  documentName: string
  score: number
  flashcardCount: number
  masteredCount: number
  dueCount: number
  lastStudied: string | null
}

interface ExamReadinessWidgetProps {
  examId?: string
  documentId?: string
  onViewDetails?: () => void
  compact?: boolean
}

export default function ExamReadinessWidget({
  examId,
  documentId,
  onViewDetails,
  compact = false
}: ExamReadinessWidgetProps) {
  const { isLoaded, isSignedIn } = useUser()
  const [data, setData] = useState<ReadinessData | null>(null)
  const [subjects, setSubjects] = useState<SubjectReadiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllSubjects, setShowAllSubjects] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const fetchReadiness = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (examId) params.set('examId', examId)
        if (documentId) params.set('documentId', documentId)

        // Fetch overall readiness and per-subject readiness in parallel
        const [readinessResponse, subjectsResponse] = await Promise.all([
          fetch(`/api/exam-readiness?${params}`),
          fetch('/api/exam-readiness/by-subject')
        ])

        if (readinessResponse.ok) {
          const result = await readinessResponse.json()
          setData(result)
        } else if (readinessResponse.status !== 401) {
          setData(null)
        }

        if (subjectsResponse.ok) {
          const subjectsData = await subjectsResponse.json()
          setSubjects(subjectsData.subjects || [])
        }
      } catch (err) {
        // Silently fail - exam readiness feature may not be set up yet
        console.debug('Exam readiness not available:', err)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchReadiness()
  }, [isLoaded, isSignedIn, examId, documentId])

  if (!isLoaded || !isSignedIn) return null

  if (loading) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6",
        compact && "p-4"
      )}>
        <div className="animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden",
        compact ? "p-4" : "p-6"
      )}>
        {!compact && (
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <Target className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Exam Readiness</h3>
          </div>
        )}
        <div className="flex items-center gap-4">
          {/* Ready to start progress ring */}
          <div className={cn("relative flex-shrink-0", compact ? "w-14 h-14" : "w-20 h-20")}>
            <svg className={cn("w-full h-full -rotate-90", compact ? "w-14 h-14" : "w-20 h-20")}>
              <circle
                cx={compact ? "28" : "40"}
                cy={compact ? "28" : "40"}
                r={compact ? "24" : "34"}
                fill="none"
                stroke="currentColor"
                strokeWidth={compact ? "4" : "6"}
                className="text-gray-100 dark:text-gray-800"
              />
              <circle
                cx={compact ? "28" : "40"}
                cy={compact ? "28" : "40"}
                r={compact ? "24" : "34"}
                fill="none"
                strokeWidth={compact ? "4" : "6"}
                strokeLinecap="round"
                strokeDasharray="8 8"
                className="text-violet-200 dark:text-violet-800"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className={cn("text-violet-400", compact ? "w-5 h-5" : "w-7 h-7")} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-semibold text-gray-900 dark:text-white",
              compact ? "text-sm" : "text-base"
            )}>
              Ready to start
            </h4>
            <p className={cn(
              "text-gray-500 dark:text-gray-400",
              compact ? "text-xs" : "text-sm"
            )}>
              {error || "Upload notes and take a practice exam to track your progress"}
            </p>
            {!compact && (
              <button
                onClick={onViewDetails}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Create Study Plan
              </button>
            )}
          </div>

          {compact && <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </div>
    )
  }

  const { score, factors, trend, weakTopics, daysUntilExam } = data

  // Get color based on score
  const getScoreColor = (s: number) => {
    if (s < 50) return { ring: 'stroke-red-500', bg: 'bg-red-500', text: 'text-red-600' }
    if (s < 75) return { ring: 'stroke-amber-500', bg: 'bg-amber-500', text: 'text-amber-600' }
    return { ring: 'stroke-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-600' }
  }

  const colors = getScoreColor(score)

  // Get label based on score
  const getLabel = (s: number) => {
    if (s < 30) return 'Just Getting Started'
    if (s < 50) return 'Needs More Practice'
    if (s < 70) return 'Making Progress'
    if (s < 85) return 'Almost Ready'
    return 'Exam Ready!'
  }

  // Trend icon
  const TrendIcon = trend === 'improving' ? TrendingUp :
                    trend === 'declining' ? TrendingDown : Minus

  const trendColor = trend === 'improving' ? 'text-emerald-500' :
                     trend === 'declining' ? 'text-red-500' : 'text-gray-400'

  // Factor icons
  const factorConfig = [
    { key: 'topicCoverage', label: 'Coverage', icon: BookOpen, value: factors.topicCoverage },
    { key: 'masteryLevel', label: 'Mastery', icon: Brain, value: factors.masteryLevel },
    { key: 'mockExamPerformance', label: 'Practice', icon: Target, value: factors.mockExamPerformance },
    { key: 'consistencyBonus', label: 'Streak', icon: Flame, value: factors.consistencyBonus }
  ]

  // Helper to get score color
  const getSubjectScoreColor = (s: number) => {
    if (s < 50) return 'text-red-600 dark:text-red-400'
    if (s < 75) return 'text-amber-600 dark:text-amber-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  const getSubjectBgColor = (s: number) => {
    if (s < 50) return 'bg-red-500'
    if (s < 75) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  // Display subjects - show 3 by default in compact mode
  const displaySubjects = showAllSubjects ? subjects : subjects.slice(0, 3)

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        {/* Header */}
        <div
          onClick={onViewDetails}
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {/* Compact Progress Ring */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 150.8} 150.8`}
                className={colors.ring}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-sm font-bold", colors.text)}>{score}%</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                Exam Readiness
              </span>
              <TrendIcon className={cn("w-4 h-4", trendColor)} />
            </div>
            <p className="text-sm text-gray-500 truncate">{getLabel(score)}</p>
            {daysUntilExam !== null && (
              <p className="text-xs text-gray-400 mt-0.5">
                {daysUntilExam > 0 ? `${daysUntilExam} days left` : 'Exam day!'}
              </p>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* Actionable tip based on lowest factor */}
        {score < 70 && factors && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {factors.mockExamPerformance < factors.masteryLevel && factors.mockExamPerformance < factors.topicCoverage
                ? '💡 Take a practice exam to improve your score'
                : factors.masteryLevel < factors.topicCoverage
                ? '💡 Review your flashcards to boost mastery'
                : '💡 Generate more flashcards to increase coverage'}
            </p>
          </div>
        )}

        {/* Subjects breakdown */}
        {subjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
              By Subject
            </p>
            <div className="space-y-2">
              {displaySubjects.map((subject) => (
                <div key={subject.documentId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {subject.documentName.replace(/\.[^/.]+$/, '')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", getSubjectBgColor(subject.score))}
                          style={{ width: `${subject.score}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-medium w-8 text-right", getSubjectScoreColor(subject.score))}>
                        {subject.score}%
                      </span>
                    </div>
                  </div>
                  {subject.dueCount > 0 && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                      {subject.dueCount} due
                    </span>
                  )}
                </div>
              ))}
            </div>

            {subjects.length > 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAllSubjects(!showAllSubjects)
                }}
                className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {showAllSubjects ? (
                  <>Show less</>
                ) : (
                  <>Show all ({subjects.length - 3} more)</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Exam Readiness</h3>
          </div>
          {daysUntilExam !== null && (
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className={cn(
                daysUntilExam <= 3 ? 'text-red-600 font-medium' :
                daysUntilExam <= 7 ? 'text-amber-600' : 'text-gray-500'
              )}>
                {daysUntilExam > 0 ? `${daysUntilExam} days until exam` : 'Exam day!'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-6">
          {/* Large Progress Ring */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-100 dark:text-gray-800"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 301.6} 301.6`}
                className={cn(colors.ring, "transition-all duration-1000 ease-out")}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl font-bold", colors.text)}>{score}%</span>
              <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                <TrendIcon className="w-3 h-3" />
                <span>{trend}</span>
              </div>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1">
            <div className="mb-3">
              <h4 className={cn("text-lg font-semibold", colors.text)}>
                {getLabel(score)}
              </h4>
              <p className="text-sm text-gray-500">
                {score < 50
                  ? "Keep practicing to improve your readiness"
                  : score < 75
                  ? "You're making good progress!"
                  : "You're well prepared for your exam"}
              </p>
            </div>

            {/* Factor Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              {factorConfig.map(({ key, label, icon: Icon, value }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <Icon className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {value}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          value >= 70 ? "bg-emerald-500" :
                          value >= 50 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weak Topics */}
        {weakTopics.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Focus Areas
              </span>
            </div>
            <div className="space-y-2">
              {weakTopics.slice(0, 3).map((topic, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {topic.topic}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {topic.suggestedAction}
                    </p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    topic.score < 50 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {topic.score}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {onViewDetails && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onViewDetails}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            View Full Analysis
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
