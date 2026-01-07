'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  ArrowLeft,
  Target,
  RefreshCw,
  Brain,
  AlertTriangle,
  TrendingUp,
  Clock,
  BookOpen,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore, useDocumentStore } from '@/lib/store/useStore'
import {
  estimateStudyMinutes,
  formatStudyTime,
  getMasteryColorClass,
  getUrgencyBgClass,
  getUrgencyTextClass,
} from '@/lib/knowledge-gap-calculator'

// Types matching API response
interface TopicAnalysis {
  topic: string
  documentId: string | null
  documentName: string | null
  cardCount: number
  masteryProgress: {
    new: number
    learning: number
    young: number
    mature: number
  }
  accuracy: number | null
  averageEaseFactor: number
  lastReviewedAt: string | null
  estimatedRetention: number | null
  trend: 'improving' | 'stable' | 'declining'
  needsAttention: boolean
  reason: string | null
}

interface CardDetail {
  id: string
  front: string
  back: string
  topic: string | null
  documentName: string | null
  easeFactor: number
  accuracy: number
  timesReviewed: number
  lastQualityRating: number | null
  daysSinceReview: number | null
  estimatedRetention: number | null
  reason: 'low_ease' | 'low_accuracy' | 'repeated_failures' | 'at_risk'
  urgency?: 'critical' | 'high' | 'medium'
}

interface QuickAction {
  id: string
  type: 'review_topic' | 'review_struggling' | 'review_at_risk'
  label: string
  description: string
  cardCount: number
  estimatedMinutes: number
  topicFilter?: string
  documentId?: string
}

interface KnowledgeGapData {
  summary: {
    totalCards: number
    totalTopics: number
    overallMastery: number
    atRiskCount: number
    strugglingCount: number
    averageAccuracy: number
  }
  topicBreakdown: TopicAnalysis[]
  strugglingCards: CardDetail[]
  atRiskKnowledge: CardDetail[]
  quickActions: QuickAction[]
}

export default function KnowledgeGapsPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()
  const { setActiveMode } = useUIStore()
  const { setCurrentDocument } = useDocumentStore()

  const [data, setData] = useState<KnowledgeGapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStruggling, setExpandedStruggling] = useState(false)
  const [expandedAtRisk, setExpandedAtRisk] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/knowledge-gaps')

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please sign in to view knowledge gaps')
            return
          }
          throw new Error('Failed to fetch knowledge gap data')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching knowledge gaps:', err)
        setError('Failed to load knowledge gap analysis')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isLoaded, isSignedIn])

  const handleQuickStudy = (topic?: string, documentId?: string) => {
    // Navigate to flashcard review with topic filter
    // Store topic filter in sessionStorage for the review page to pick up
    if (topic) {
      sessionStorage.setItem('review-topic-filter', topic)
    }
    if (documentId) {
      sessionStorage.setItem('review-document-filter', documentId)
    }
    setActiveMode('flashcards')
    router.push('/dashboard')
  }

  const handleQuickAction = (action: QuickAction) => {
    switch (action.type) {
      case 'review_struggling':
        sessionStorage.setItem('review-mode', 'struggling')
        break
      case 'review_at_risk':
        sessionStorage.setItem('review-mode', 'at-risk')
        break
      case 'review_topic':
        if (action.topicFilter) {
          sessionStorage.setItem('review-topic-filter', action.topicFilter)
        }
        break
    }
    setActiveMode('flashcards')
    router.push('/dashboard')
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>

          {/* Summary skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Unable to Load Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.summary.totalCards === 0) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Gaps</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Find and fix weak areas in your knowledge
              </p>
            </div>
          </div>

          {/* Empty state */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Flashcards Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create flashcards from your study materials to see knowledge gap analysis and get personalized study recommendations.
            </p>
            <button
              onClick={() => {
                setActiveMode('flashcards')
                router.push('/dashboard')
              }}
              className="px-6 py-3 bg-violet-500 text-white rounded-xl font-semibold hover:bg-violet-600 transition-colors"
            >
              Create Flashcards
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { summary, topicBreakdown, strugglingCards, atRiskKnowledge, quickActions } = data

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f]">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/30 via-white to-amber-50/20 dark:from-rose-950/10 dark:via-[#0a0a0f] dark:to-amber-950/5" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Gaps</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {summary.totalCards} cards across {summary.totalTopics} topics
              </p>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Overall Mastery */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mastery</p>
                <p className={cn("text-2xl font-bold", getMasteryColorClass(summary.overallMastery))}>
                  {summary.overallMastery}%
                </p>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${summary.overallMastery}%` }}
              />
            </div>
          </div>

          {/* Average Accuracy */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Accuracy</p>
                <p className={cn("text-2xl font-bold", getMasteryColorClass(summary.averageAccuracy))}>
                  {summary.averageAccuracy}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Across all reviews
            </p>
          </div>

          {/* Struggling Cards */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Struggling</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {summary.strugglingCount}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cards with low ease
            </p>
          </div>

          {/* At-Risk Cards */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">At Risk</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {summary.atRiskCount}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need refresh soon
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.slice(0, 3).map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all hover:scale-[1.02]",
                    action.type === 'review_struggling'
                      ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 hover:border-rose-300 dark:hover:border-rose-700"
                      : action.type === 'review_at_risk'
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700"
                        : "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700"
                  )}
                >
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {action.label}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {action.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {action.cardCount} cards · {formatStudyTime(action.estimatedMinutes)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Topic Mastery */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-500" />
                Topic Mastery
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
              {topicBreakdown.map((topic, index) => {
                const masteryPct = Math.round(
                  (topic.masteryProgress.mature / topic.cardCount) * 100
                )
                return (
                  <div
                    key={index}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {topic.topic}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {topic.cardCount} cards
                          {topic.documentName && ` · ${topic.documentName}`}
                        </p>
                      </div>
                      {topic.needsAttention && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full whitespace-nowrap">
                          Needs attention
                        </span>
                      )}
                    </div>

                    {/* Maturity progress bar */}
                    <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-gray-300 dark:bg-gray-700"
                        style={{ width: `${(topic.masteryProgress.new / topic.cardCount) * 100}%` }}
                        title={`New: ${topic.masteryProgress.new}`}
                      />
                      <div
                        className="bg-blue-400 dark:bg-blue-600"
                        style={{ width: `${(topic.masteryProgress.learning / topic.cardCount) * 100}%` }}
                        title={`Learning: ${topic.masteryProgress.learning}`}
                      />
                      <div
                        className="bg-purple-400 dark:bg-purple-600"
                        style={{ width: `${(topic.masteryProgress.young / topic.cardCount) * 100}%` }}
                        title={`Young: ${topic.masteryProgress.young}`}
                      />
                      <div
                        className="bg-emerald-500 dark:bg-emerald-600"
                        style={{ width: `${(topic.masteryProgress.mature / topic.cardCount) * 100}%` }}
                        title={`Mature: ${topic.masteryProgress.mature}`}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{masteryPct}% mastered</span>
                        {topic.accuracy !== null && (
                          <span>{topic.accuracy}% accuracy</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuickStudy(topic.topic, topic.documentId || undefined)}
                        className="px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                      >
                        Study
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Struggling & At-Risk Panels */}
          <div className="space-y-6">
            {/* Struggling Cards */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setExpandedStruggling(!expandedStruggling)}
                className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Struggling Cards
                  <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full">
                    {strugglingCards.length}
                  </span>
                </h3>
                {expandedStruggling ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedStruggling && strugglingCards.length > 0 && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                  {strugglingCards.map(card => (
                    <div key={card.id} className="p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {card.front}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>Ease: {card.easeFactor.toFixed(2)}</span>
                        <span>{card.accuracy}% accuracy</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded",
                          card.reason === 'low_ease' ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" :
                          card.reason === 'repeated_failures' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        )}>
                          {card.reason === 'low_ease' ? 'Low ease' :
                           card.reason === 'repeated_failures' ? 'Repeated fails' :
                           'Low accuracy'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expandedStruggling && strugglingCards.length === 0 && (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No struggling cards found
                </div>
              )}
            </div>

            {/* At-Risk Knowledge */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setExpandedAtRisk(!expandedAtRisk)}
                className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  At-Risk Knowledge
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                    {atRiskKnowledge.length}
                  </span>
                </h3>
                {expandedAtRisk ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedAtRisk && atRiskKnowledge.length > 0 && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                  {atRiskKnowledge.map(card => (
                    <div key={card.id} className="p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {card.front}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{card.daysSinceReview} days ago</span>
                        <span>{card.estimatedRetention}% retention</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded",
                          getUrgencyBgClass(card.urgency || 'medium'),
                          getUrgencyTextClass(card.urgency || 'medium')
                        )}>
                          {card.urgency === 'critical' ? 'Critical' :
                           card.urgency === 'high' ? 'High priority' :
                           'Medium'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expandedAtRisk && atRiskKnowledge.length === 0 && (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No at-risk cards found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Card Maturity Legend</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-700" />
              <span className="text-gray-600 dark:text-gray-400">New</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-400 dark:bg-blue-600" />
              <span className="text-gray-600 dark:text-gray-400">Learning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-400 dark:bg-purple-600" />
              <span className="text-gray-600 dark:text-gray-400">Young</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500 dark:bg-emerald-600" />
              <span className="text-gray-600 dark:text-gray-400">Mature (Mastered)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
