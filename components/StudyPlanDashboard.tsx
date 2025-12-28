"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  BookOpen,
  Mic,
  Network,
  GraduationCap,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "./ToastContainer"

// ============================================
// Types
// ============================================

interface TopicMastery {
  topic: string
  documentId?: string
  documentName?: string
  flashcardAccuracy: number
  examScore: number | null
  timeSpentMinutes: number
  lastReviewedAt: string | null
  reviewCount: number
  masteryLevel: "weak" | "learning" | "mastered"
}

interface PlanProgress {
  planId: string
  planTitle: string
  examDate: string
  daysRemaining: number
  totalSessions: number
  completedSessions: number
  skippedSessions: number
  completionRate: number
  averagePerformance: number
  behindSchedule: boolean
  weakTopics: TopicMastery[]
  strongTopics: TopicMastery[]
  hoursRemaining: number
  hoursCompleted: number
}

interface StudySession {
  id: string
  mode: string
  topic?: string
  documentName?: string
  scheduledDate: string
  scheduledTime?: string
  estimatedMinutes: number
  status: "pending" | "in_progress" | "completed" | "skipped"
  sessionType: string
}

interface StudyPlanDashboardProps {
  planId: string
  onClose?: () => void
  onStartSession?: (session: StudySession) => void
}

// ============================================
// Mode Icons
// ============================================

const MODE_ICONS: Record<string, React.ReactNode> = {
  flashcards: <BookOpen className="w-4 h-4" />,
  podcast: <Mic className="w-4 h-4" />,
  mindmap: <Network className="w-4 h-4" />,
  exam: <GraduationCap className="w-4 h-4" />,
  chat: <Sparkles className="w-4 h-4" />,
  reading: <BookOpen className="w-4 h-4" />,
  review: <RotateCcw className="w-4 h-4" />,
}

const MODE_COLORS: Record<string, string> = {
  flashcards: "bg-blue-500",
  podcast: "bg-purple-500",
  mindmap: "bg-green-500",
  exam: "bg-red-500",
  chat: "bg-amber-500",
  reading: "bg-indigo-500",
  review: "bg-teal-500",
}

// ============================================
// Component
// ============================================

export default function StudyPlanDashboard({
  planId,
  onClose,
  onStartSession,
}: StudyPlanDashboardProps) {
  const toast = useToast()
  const [progress, setProgress] = useState<PlanProgress | null>(null)
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdapting, setIsAdapting] = useState(false)

  // Fetch plan data
  const fetchPlanData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch progress
      const progressRes = await fetch(`/api/study-plans/${planId}/adapt`)
      if (progressRes.ok) {
        const data = await progressRes.json()
        setProgress(data.progress)
      }

      // Fetch sessions
      const sessionsRes = await fetch(`/api/study-plans/${planId}`)
      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        const sessions = data.plan?.sessions || []

        const today = new Date().toISOString().split("T")[0]
        const todayList = sessions.filter(
          (s: StudySession) => s.scheduledDate === today
        )
        const upcomingList = sessions
          .filter(
            (s: StudySession) =>
              s.scheduledDate > today && s.status === "pending"
          )
          .slice(0, 5)

        setTodaySessions(todayList)
        setUpcomingSessions(upcomingList)
      }
    } catch (error) {
      console.error("Failed to fetch plan data:", error)
      toast.error("Failed to load study plan")
    } finally {
      setIsLoading(false)
    }
  }, [planId, toast])

  useEffect(() => {
    fetchPlanData()
  }, [fetchPlanData])

  // Adapt plan
  const handleAdaptPlan = async () => {
    setIsAdapting(true)
    try {
      const res = await fetch(`/api/study-plans/${planId}/adapt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule-weak" }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.result.message)
        await fetchPlanData()
      } else {
        throw new Error("Failed to adapt plan")
      }
    } catch (error) {
      toast.error("Failed to adapt plan")
    } finally {
      setIsAdapting(false)
    }
  }

  // Start session
  const handleStartSession = (session: StudySession) => {
    if (onStartSession) {
      onStartSession(session)
    }
  }

  // Complete session
  const handleCompleteSession = async (sessionId: string, score: number) => {
    try {
      const res = await fetch(`/api/study-plan-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", performanceScore: score }),
      })

      if (res.ok) {
        toast.success("Session completed!")
        await fetchPlanData()
      }
    } catch (error) {
      toast.error("Failed to complete session")
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6" />
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center">
        <p className="text-gray-500">Study plan not found</p>
      </div>
    )
  }

  const progressPercentage = Math.round(
    (progress.completedSessions / Math.max(1, progress.totalSessions)) * 100
  )

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{progress.planTitle}</h2>
            <div className="flex items-center gap-4 mt-1 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {progress.daysRemaining} days left
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {progress.hoursRemaining.toFixed(1)}h remaining
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress Ring */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progressPercentage * 2.51} 251`}
                className="text-violet-600"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {progressPercentage}%
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sessions Completed</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {progress.completedSessions} / {progress.totalSessions}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Average Performance</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {progress.averagePerformance}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Hours Studied</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {progress.hoursCompleted.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {progress.behindSchedule && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                You're behind schedule
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Consider adding more study sessions to catch up
              </p>
            </div>
            <button
              onClick={handleAdaptPlan}
              disabled={isAdapting}
              className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {isAdapting ? "Adapting..." : "Adapt Plan"}
            </button>
          </div>
        )}

        {/* Weak Topics */}
        {progress.weakTopics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-red-500" />
              Topics Needing Attention
            </h3>
            <div className="space-y-2">
              {progress.weakTopics.slice(0, 3).map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {topic.topic}
                    </p>
                    <p className="text-xs text-gray-500">
                      {topic.documentName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {topic.flashcardAccuracy}% accuracy
                    </p>
                    <p className="text-xs text-gray-500">
                      {topic.reviewCount} reviews
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strong Topics */}
        {progress.strongTopics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Mastered Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {progress.strongTopics.slice(0, 5).map((topic, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full"
                >
                  {topic.topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Today's Sessions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-500" />
            Today's Sessions
          </h3>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No sessions scheduled for today
            </p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    session.status === "completed"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : session.status === "skipped"
                      ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-violet-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                      MODE_COLORS[session.mode] || "bg-gray-500"
                    )}
                  >
                    {MODE_ICONS[session.mode] || <BookOpen className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {session.topic || `${session.mode} session`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.estimatedMinutes} min • {session.documentName}
                    </p>
                  </div>
                  {session.status === "completed" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : session.status === "pending" ? (
                    <button
                      onClick={() => handleStartSession(session)}
                      className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Upcoming Sessions
            </h3>
            <div className="space-y-2">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-white text-xs",
                      MODE_COLORS[session.mode] || "bg-gray-500"
                    )}
                  >
                    {MODE_ICONS[session.mode]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {session.topic || session.mode}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(session.scheduledDate).toLocaleDateString(
                      undefined,
                      { weekday: "short", month: "short", day: "numeric" }
                    )}
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adapt Button (if weak topics exist) */}
        {progress.weakTopics.length > 0 && !progress.behindSchedule && (
          <button
            onClick={handleAdaptPlan}
            disabled={isAdapting}
            className="w-full py-3 px-4 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isAdapting ? "Adapting Plan..." : "Add Review Sessions for Weak Topics"}
          </button>
        )}
      </div>
    </div>
  )
}
