'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  BookOpen,
  MessageSquare,
  Network,
  Mic,
  FileQuestion,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react'
import type { StudyGuideBreakdown, StudyGuideWeek as StudyGuideWeekType, StudyGuideDay as StudyGuideDayType } from '@/lib/supabase/types'
import ContentPreparationBanner from '@/components/ContentPreparationBanner'
import { STUDY_MODES, type StudyPlan } from './index'

// Dynamic import of StudyGuideGenerator
const StudyGuideGenerator = dynamic(() => import('./StudyGuideGenerator'), {
  ssr: false,
  loading: () => null,
})

interface TopicPages {
  startPage?: number
  endPage?: number
}

interface ScheduleViewProps {
  plans: StudyPlan[]
  selectedPlanId: string | null
  onSelectPlan: (planId: string) => void
  onNavigateToMode: (mode: string, documentId?: string, sessionTopic?: string, topicPages?: TopicPages) => void
  onRefresh: () => void
}

export default function ScheduleView({
  plans,
  selectedPlanId,
  onSelectPlan,
  onNavigateToMode,
  onRefresh,
}: ScheduleViewProps) {
  const [guideData, setGuideData] = useState<StudyGuideBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prepareError, setPrepareError] = useState<string | null>(null)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [preparingContent, setPreparingContent] = useState(false)
  const [preparationProgress, setPreparationProgress] = useState(0)
  const [showGenerator, setShowGenerator] = useState(false)

  // Fetch study guide data when plan is selected
  const fetchGuideData = useCallback(async (planId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/study-plans/${planId}/guide`)
      if (!response.ok) {
        throw new Error('Failed to fetch study guide')
      }
      const data = await response.json()
      setGuideData(data.guide)

      // Auto-expand current week
      if (data.guide?.weeks) {
        const today = new Date()
        const currentWeek = data.guide.weeks.find((w: StudyGuideWeekType) => {
          const weekStart = new Date(w.weekStart)
          const weekEnd = new Date(w.weekEnd)
          return today >= weekStart && today <= weekEnd
        })
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]))
        } else if (data.guide.weeks.length > 0) {
          setExpandedWeeks(new Set([data.guide.weeks[0].weekNumber]))
        }
      }
    } catch (err) {
      console.error('Error fetching guide:', err)
      setError(err instanceof Error ? err.message : 'Failed to load study guide')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPlanId) {
      fetchGuideData(selectedPlanId)
    }
  }, [selectedPlanId, fetchGuideData])

  // Trigger content preparation for today
  const handlePrepareContent = async () => {
    if (!selectedPlanId) return

    setPreparingContent(true)
    setPreparationProgress(0)
    setPrepareError(null)

    try {
      const response = await fetch('/api/study-guide/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to start content preparation')
      }

      // Poll for status
      const pollStatus = async () => {
        const statusResponse = await fetch(`/api/study-guide/status?planId=${selectedPlanId}`)
        if (statusResponse.ok) {
          const status = await statusResponse.json()
          setPreparationProgress(status.progress || 0)

          if (status.status === 'completed') {
            setPreparingContent(false)
            fetchGuideData(selectedPlanId)
          } else if (status.status === 'failed') {
            setPreparingContent(false)
            setPrepareError('Content preparation failed')
          } else {
            setTimeout(pollStatus, 3000)
          }
        }
      }

      pollStatus()
    } catch (err) {
      console.error('Error preparing content:', err)
      setPreparingContent(false)
      setPrepareError(err instanceof Error ? err.message : 'Failed to prepare content')
    }
  }

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekNumber)) {
        next.delete(weekNumber)
      } else {
        next.add(weekNumber)
      }
      return next
    })
  }

  const activePlans = plans.filter(p => p.status === 'active')

  if (activePlans.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
          <Calendar className="w-8 h-8 text-white/30" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No active study plans</h3>
        <p className="text-white/50 max-w-md mx-auto">
          Create a study plan first to see your personalized schedule with daily content.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan Selector (if multiple plans) */}
      {activePlans.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-white/60 text-sm">Study Plan:</label>
          <select
            value={selectedPlanId || ''}
            onChange={(e) => onSelectPlan(e.target.value)}
            className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {activePlans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.title} - Exam: {new Date(plan.examDate).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePrepareContent}
          disabled={preparingContent}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
        >
          {preparingContent ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Prepare Today&apos;s Content
            </>
          )}
        </button>

        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Generate Study Guide
        </button>
      </div>

      {/* Content Preparation Banner */}
      {preparingContent && (
        <ContentPreparationBanner progress={preparationProgress} />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400">{error}</span>
          <button
            onClick={() => selectedPlanId && fetchGuideData(selectedPlanId)}
            className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Prepare Error State */}
      {prepareError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-amber-400 flex-1">{prepareError}</span>
          <button
            onClick={() => setPrepareError(null)}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Guide Content */}
      {!loading && !error && guideData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 border border-white/10 rounded-xl">
              <div className="text-2xl font-bold text-white">{guideData.totalWeeks}</div>
              <div className="text-white/50 text-sm">Total Weeks</div>
            </div>
            <div className="p-4 bg-slate-800/50 border border-white/10 rounded-xl">
              <div className="text-2xl font-bold text-white">{guideData.totalDays}</div>
              <div className="text-white/50 text-sm">Study Days</div>
            </div>
            <div className="p-4 bg-slate-800/50 border border-white/10 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{guideData.daysCompleted || 0}</div>
              <div className="text-white/50 text-sm">Days Completed</div>
            </div>
            <div className="p-4 bg-slate-800/50 border border-white/10 rounded-xl">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round(((guideData.daysCompleted || 0) / guideData.totalDays) * 100)}%
              </div>
              <div className="text-white/50 text-sm">Progress</div>
            </div>
          </div>

          {/* Weeks Accordion */}
          <div className="space-y-4">
            {guideData.weeks.map((week) => (
              <StudyGuideWeek
                key={week.weekNumber}
                week={week}
                isExpanded={expandedWeeks.has(week.weekNumber)}
                onToggle={() => toggleWeek(week.weekNumber)}
                onNavigateToMode={onNavigateToMode}
                onRefreshDay={async (date) => {
                  await fetch(`/api/study-plans/${selectedPlanId}/guide/${date}`, {
                    method: 'POST',
                  })
                  if (selectedPlanId) {
                    fetchGuideData(selectedPlanId)
                  }
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && (!guideData || guideData.weeks.length === 0) && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No study sessions scheduled</h3>
          <p className="text-white/50 max-w-md mx-auto mb-6">
            Generate a study guide or add sessions manually to populate your schedule.
          </p>
          <button
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Generate Study Guide
          </button>
        </div>
      )}

      {/* Study Guide Generator Modal */}
      {showGenerator && (
        <StudyGuideGenerator
          planId={selectedPlanId}
          onClose={() => setShowGenerator(false)}
          onComplete={() => {
            setShowGenerator(false)
            if (selectedPlanId) {
              fetchGuideData(selectedPlanId)
            }
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

// Week Component
interface StudyGuideWeekProps {
  week: StudyGuideWeekType
  isExpanded: boolean
  onToggle: () => void
  onNavigateToMode: (mode: string, documentId?: string, sessionTopic?: string, topicPages?: TopicPages) => void
  onRefreshDay: (date: string) => Promise<void>
}

function StudyGuideWeek({ week, isExpanded, onToggle, onNavigateToMode, onRefreshDay }: StudyGuideWeekProps) {
  const today = new Date().toISOString().split('T')[0]
  const isCurrentWeek = week.days.some(d => d.date === today)
  const completedDays = week.days.filter(d => d.status === 'ready' || d.status === 'partial').length
  const weekProgress = Math.round((completedDays / week.days.length) * 100)

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isCurrentWeek ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 bg-slate-800/30'
    }`}>
      {/* Week Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-white/50" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white/50" />
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Week {week.weekNumber}</h3>
              {isCurrentWeek && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
                  Current
                </span>
              )}
            </div>
            <p className="text-white/50 text-sm">
              {new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {new Date(week.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-white font-medium">{weekProgress}%</div>
            <div className="text-white/40 text-xs">{completedDays}/{week.days.length} days</div>
          </div>
          <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${weekProgress}%` }}
            />
          </div>
        </div>
      </button>

      {/* Week Days */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-3">
          {week.days.map((day) => (
            <StudyGuideDay
              key={day.id}
              day={day}
              isToday={day.date === today}
              onNavigateToMode={onNavigateToMode}
              onRefresh={() => onRefreshDay(day.date)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Day Component
interface StudyGuideDayProps {
  day: StudyGuideDayType
  isToday: boolean
  onNavigateToMode: (mode: string, documentId?: string, sessionTopic?: string, topicPages?: TopicPages) => void
  onRefresh: () => Promise<void>
}

function StudyGuideDay({ day, isToday, onNavigateToMode, onRefresh }: StudyGuideDayProps) {
  const [refreshing, setRefreshing] = useState(false)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = dayNames[day.dayOfWeek]

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const getStatusBadge = () => {
    switch (day.status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        )
      case 'generating':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating
          </span>
        )
      case 'partial':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
            <Clock className="w-3 h-3" />
            Partial
          </span>
        )
      case 'skipped':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full text-xs">
            Skipped
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 text-white/50 rounded-full text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
    }
  }

  return (
    <div className={`p-4 rounded-xl transition-all ${
      isToday
        ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30'
        : 'bg-white/5 border border-transparent hover:border-white/10'
    }`}>
      {/* Day Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isToday ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/70'
          }`}>
            <span className="text-sm font-bold">{new Date(day.date).getDate()}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{dayName}</span>
              {isToday && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
                  Today
                </span>
              )}
            </div>
            <span className="text-white/40 text-sm">
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            onClick={handleRefresh}
            disabled={refreshing || day.status === 'generating'}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh content"
          >
            <RefreshCw className={`w-4 h-4 text-white/50 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Topics */}
      {day.topics && day.topics.length > 0 && (
        <div className="mb-4">
          <div className="text-white/50 text-xs mb-2">Topics for today:</div>
          <div className="flex flex-wrap gap-2">
            {day.topics.map((topic, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-white/5 text-white/70 rounded text-xs"
              >
                {topic.title}
                {topic.pageRange && (
                  <span className="text-white/40 ml-1">
                    (p.{topic.pageRange.start}-{topic.pageRange.end})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Study Mode Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StudyModeCard
          mode="flashcards"
          isAvailable={day.hasFlashcards}
          contentId={day.flashcardSetId}
          topic={day.topics?.[0]}
          onClick={() => {
            const topic = day.topics?.[0]
            onNavigateToMode(
              'flashcards',
              topic?.documentId,
              topic?.title,
              topic?.pageRange ? { startPage: topic.pageRange.start, endPage: topic.pageRange.end } : undefined
            )
          }}
        />
        <StudyModeCard
          mode="chat"
          isAvailable={day.hasChat}
          topic={day.topics?.[0]}
          onClick={() => {
            const topic = day.topics?.[0]
            onNavigateToMode(
              'chat',
              topic?.documentId,
              topic?.title,
              topic?.pageRange ? { startPage: topic.pageRange.start, endPage: topic.pageRange.end } : undefined
            )
          }}
        />
        <StudyModeCard
          mode="mindmap"
          isAvailable={day.hasMindmap}
          contentId={day.mindmapId}
          topic={day.topics?.[0]}
          onClick={() => {
            const topic = day.topics?.[0]
            onNavigateToMode(
              'mindmap',
              topic?.documentId,
              topic?.title,
              topic?.pageRange ? { startPage: topic.pageRange.start, endPage: topic.pageRange.end } : undefined
            )
          }}
        />
        <StudyModeCard
          mode="podcast"
          isAvailable={day.hasPodcast}
          contentId={day.podcastId}
          topic={day.topics?.[0]}
          onClick={() => {
            const topic = day.topics?.[0]
            onNavigateToMode(
              'podcast',
              topic?.documentId,
              topic?.title,
              topic?.pageRange ? { startPage: topic.pageRange.start, endPage: topic.pageRange.end } : undefined
            )
          }}
        />
      </div>

      {/* Daily Quiz */}
      {day.hasDailyQuiz && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              day.dailyQuizId
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-white/5 text-white/40 cursor-not-allowed'
            }`}
            disabled={!day.dailyQuizId}
          >
            <FileQuestion className="w-4 h-4" />
            Daily Quiz
          </button>
        </div>
      )}

      {/* Time Estimate */}
      <div className="mt-3 flex items-center justify-between text-xs text-white/40">
        <span>{day.estimatedTotalMinutes || 30} min estimated</span>
        {day.actualMinutesSpent && day.actualMinutesSpent > 0 && (
          <span>{day.actualMinutesSpent} min spent</span>
        )}
      </div>
    </div>
  )
}

// Study Mode Card Component
interface StudyModeCardProps {
  mode: keyof typeof STUDY_MODES
  isAvailable: boolean
  contentId?: string | null
  topic?: { title: string; documentId?: string; pageRange?: { start: number; end: number } }
  onClick: () => void
}

function StudyModeCard({ mode, isAvailable, contentId, onClick }: StudyModeCardProps) {
  const config = STUDY_MODES[mode]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
        isAvailable || contentId
          ? `bg-gradient-to-br ${config.color} bg-opacity-20 hover:bg-opacity-30 border border-white/10 hover:border-white/20`
          : 'bg-white/5 border border-white/5 opacity-50 cursor-default'
      }`}
      disabled={!isAvailable && !contentId}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        isAvailable || contentId
          ? `bg-gradient-to-br ${config.color}`
          : 'bg-white/10'
      }`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className={`text-xs font-medium ${isAvailable || contentId ? 'text-white' : 'text-white/40'}`}>
        {config.label}
      </span>
      {(isAvailable || contentId) && (
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      )}
    </button>
  )
}
