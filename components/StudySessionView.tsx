"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  MessageSquare,
  Network,
  Mic,
  FileQuestion,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  Trophy,
  Target,
  Sparkles,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface ContentItem {
  id: string
  name?: string
  title?: string
  count?: number
  questionCount?: number
  nodeCount?: number
  duration?: number
  audioUrl?: string
}

interface SessionContent {
  flashcards?: ContentItem
  podcast?: ContentItem
  mindmap?: ContentItem
  dailyQuiz?: ContentItem
  weeklyExam?: ContentItem
}

type ContentStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'skipped'

interface StudySessionViewProps {
  sessionId: string
  planId: string
  planTitle: string
  topic: string
  topicPages?: { startPage?: number; endPage?: number }
  documentId?: string
  documentName?: string
  estimatedMinutes: number
  sessionType: string
  weekNumber: number
  hasDailyQuiz: boolean
  hasWeeklyExam: boolean
  onClose: () => void
  onComplete: () => void
  onNavigateToMode: (mode: string, contentId?: string) => void
}

// ============================================
// Content Mode Cards
// ============================================

const CONTENT_MODES = {
  flashcards: {
    icon: BookOpen,
    label: 'Flashcards',
    color: 'from-indigo-500 to-violet-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description: 'Review with spaced repetition',
  },
  chat: {
    icon: MessageSquare,
    label: 'Focus Chat',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Ask questions about this topic',
  },
  mindmap: {
    icon: Network,
    label: 'Mind Map',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Visualize concepts',
  },
  podcast: {
    icon: Mic,
    label: 'Podcast',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    description: 'Listen and learn',
  },
  dailyQuiz: {
    icon: FileQuestion,
    label: 'Daily Quiz',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Test your knowledge',
  },
  weeklyExam: {
    icon: Trophy,
    label: 'Weekly Exam',
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    description: 'Comprehensive review',
  },
}

// ============================================
// Main Component
// ============================================

export default function StudySessionView({
  sessionId,
  planId,
  planTitle,
  topic,
  topicPages,
  documentId,
  documentName,
  estimatedMinutes,
  sessionType,
  weekNumber,
  hasDailyQuiz,
  hasWeeklyExam,
  onClose,
  onComplete,
  onNavigateToMode,
}: StudySessionViewProps) {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<SessionContent>({})
  const [contentStatus, setContentStatus] = useState<Record<string, ContentStatus>>({})
  const [allReady, setAllReady] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Fetch session content
  const fetchContent = useCallback(async () => {
    try {
      const response = await fetch(`/api/study-plan-sessions/${sessionId}/content`)
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }

      const data = await response.json()
      setContent(data.content || {})
      setContentStatus(data.contentStatus || {})
      setAllReady(data.allReady || false)
    } catch (err) {
      console.error('Error fetching content:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Start session and generate content
  const startSession = async () => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/study-plan-sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to start session')
      }

      const data = await response.json()

      if (data.status === 'ready') {
        setContent(data.content || {})
        setContentStatus(data.contentStatus || {})
        setAllReady(true)
      } else {
        // Poll for updates
        const pollInterval = setInterval(async () => {
          await fetchContent()
        }, 3000)

        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval)
          setGenerating(false)
        }, 120000)
      }

      setSessionStarted(true)
      setTimerRunning(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setGenerating(false)
    }
  }

  // Complete session
  const completeSession = async () => {
    try {
      await fetch(`/api/study-plan-sessions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          status: 'completed',
          actualMinutes: Math.ceil(elapsedSeconds / 60),
        }),
      })

      onComplete()
    } catch (err) {
      console.error('Error completing session:', err)
    }
  }

  // Initial load
  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get status icon
  const getStatusIcon = (status: ContentStatus) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'generating':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'skipped':
        return <SkipForward className="w-4 h-4 text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  // Handle mode click
  const handleModeClick = (mode: string, contentId?: string) => {
    // Add session context to the navigation
    const params = new URLSearchParams()
    params.set('sessionId', sessionId)
    params.set('topic', topic)
    if (topicPages?.startPage) params.set('startPage', topicPages.startPage.toString())
    if (topicPages?.endPage) params.set('endPage', topicPages.endPage.toString())
    if (contentId) params.set('contentId', contentId)

    onNavigateToMode(mode, contentId)
  }

  // Render content card
  const renderContentCard = (
    modeKey: keyof typeof CONTENT_MODES,
    contentItem?: ContentItem,
    status?: ContentStatus
  ) => {
    const mode = CONTENT_MODES[modeKey]
    const isReady = status === 'ready' && contentItem
    const isGenerating = status === 'generating'
    const isFailed = status === 'failed'

    return (
      <button
        key={modeKey}
        onClick={() => isReady && handleModeClick(modeKey, contentItem?.id)}
        disabled={!isReady}
        className={cn(
          "flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
          mode.bgColor,
          mode.borderColor,
          isReady
            ? "cursor-pointer hover:scale-105 hover:shadow-lg"
            : "opacity-60 cursor-not-allowed"
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-2",
          `bg-gradient-to-br ${mode.color}`
        )}>
          <mode.icon className="w-6 h-6 text-white" />
        </div>

        <span className="font-medium text-gray-900 dark:text-white text-sm mb-1">
          {mode.label}
        </span>

        {/* Status/Count */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {getStatusIcon(status || 'pending')}
          {isReady && (
            <span>
              {contentItem?.count && `${contentItem.count} cards`}
              {contentItem?.questionCount && `${contentItem.questionCount} Q`}
              {contentItem?.nodeCount && `${contentItem.nodeCount} nodes`}
              {contentItem?.duration && `${Math.ceil(contentItem.duration / 60)}m`}
            </span>
          )}
          {isGenerating && <span>Generating...</span>}
          {isFailed && <span>Failed</span>}
          {!status && <span>Not started</span>}
        </div>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {topic}
                </h2>
                <p className="text-sm text-gray-500">
                  {planTitle} - Week {weekNumber}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Session Info Card */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-xl p-4 mb-6 border border-violet-200 dark:border-violet-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-violet-600" />
                  <span className="font-medium text-violet-900 dark:text-violet-100">
                    Today's Focus
                  </span>
                </div>
                {topicPages?.startPage && topicPages?.endPage ? (
                  <p className="text-sm text-violet-700 dark:text-violet-300">
                    Pages {topicPages.startPage} - {topicPages.endPage}
                  </p>
                ) : (
                  <p className="text-sm text-violet-700 dark:text-violet-300">
                    {documentName || 'Full topic review'}
                  </p>
                )}
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                  Estimated: {estimatedMinutes} minutes
                </p>
              </div>

              {/* Timer */}
              {sessionStarted && (
                <div className="flex items-center gap-2">
                  <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm">
                    <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                      {formatTime(elapsedSeconds)}
                    </span>
                  </div>
                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {timerRunning ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          )}

          {/* Start Session Button */}
          {!loading && !sessionStarted && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-violet-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ready to Study?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                We'll generate personalized content for this session
              </p>
              <button
                onClick={startSession}
                disabled={generating}
                className={cn(
                  "px-6 py-3 rounded-xl font-medium text-white transition-all",
                  "bg-gradient-to-r from-violet-600 to-purple-600",
                  "hover:from-violet-700 hover:to-purple-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "shadow-lg hover:shadow-xl"
                )}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing Content...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Start Studying
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Content Cards */}
          {!loading && sessionStarted && (
            <>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Study Materials
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {renderContentCard('flashcards', content.flashcards, contentStatus.flashcards)}
                {renderContentCard('mindmap', content.mindmap, contentStatus.mindmap)}
                {renderContentCard('podcast', content.podcast, contentStatus.podcast)}
                <button
                  onClick={() => handleModeClick('chat')}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
                    "bg-blue-50 dark:bg-blue-950/30",
                    "border-blue-200 dark:border-blue-800",
                    "cursor-pointer hover:scale-105 hover:shadow-lg"
                  )}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2 bg-gradient-to-br from-blue-500 to-cyan-500">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                    Focus Chat
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Ready</span>
                  </div>
                </button>
              </div>

              {/* Quiz/Exam Section */}
              {(hasDailyQuiz || hasWeeklyExam) && (
                <>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    Assessments
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {hasDailyQuiz && renderContentCard(
                      'dailyQuiz',
                      content.dailyQuiz,
                      contentStatus.daily_quiz
                    )}
                    {hasWeeklyExam && renderContentCard(
                      'weeklyExam',
                      content.weeklyExam,
                      contentStatus.weekly_exam
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {sessionStarted && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {allReady
                  ? 'All content ready! Choose a study mode.'
                  : 'Content is being generated...'}
              </p>
              <button
                onClick={completeSession}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
