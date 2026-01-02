"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Clock,
  Target,
  Zap,
  Brain,
  Headphones,
  CheckCircle2,
  Circle,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Flame,
  Play,
  X,
  Loader2,
  BookOpen,
  LayoutGrid
} from "lucide-react"
import {
  CramPlan,
  CramSession,
  CramSessionBlock,
  generateCramPlan,
  calculateCramProgress,
  getTodayCramSessions,
  getCramMotivation
} from "@/lib/cram-mode-generator"

interface CramModeViewProps {
  examDate: Date
  examId?: string
  weakTopics: string[]
  allTopics: string[]
  documentIds: string[]
  onStartSession: (session: CramSessionBlock) => void
  onClose: () => void
}

export default function CramModeView({
  examDate,
  examId,
  weakTopics,
  allTopics,
  documentIds,
  onStartSession,
  onClose
}: CramModeViewProps) {
  const [plan, setPlan] = useState<CramPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAllDays, setShowAllDays] = useState(false)

  // Generate cram plan on mount
  useEffect(() => {
    const cramPlan = generateCramPlan({
      examDate,
      weakTopics,
      allTopics,
      documentsIds: documentIds,
      dailyAvailableMinutes: 90, // 1.5 hours per day
      examId
    })
    setPlan(cramPlan)
    setIsLoading(false)

    // Select today by default
    const todaySession = getTodayCramSessions(cramPlan)
    if (todaySession) {
      setSelectedDay(todaySession.day)
    }
  }, [examDate, weakTopics, allTopics, documentIds, examId])

  const handleCompleteSession = (sessionId: string) => {
    if (!plan) return

    setPlan(prev => {
      if (!prev) return prev

      return {
        ...prev,
        dailySessions: prev.dailySessions.map(day => ({
          ...day,
          sessions: day.sessions.map(session =>
            session.id === sessionId
              ? { ...session, completed: true }
              : session
          )
        }))
      }
    })
  }

  if (isLoading || !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Generating your cram plan...</p>
        </div>
      </div>
    )
  }

  const progress = calculateCramProgress(plan)
  const todaySession = getTodayCramSessions(plan)
  const motivation = getCramMotivation(plan.daysUntilExam, progress.percentComplete)
  const selectedDayData = plan.dailySessions.find(d => d.day === selectedDay)

  const getSessionIcon = (type: CramSessionBlock['type']) => {
    switch (type) {
      case 'flashcard_review':
        return <LayoutGrid className="w-5 h-5" />
      case 'mini_exam':
        return <Target className="w-5 h-5" />
      case 'quick_podcast':
        return <Headphones className="w-5 h-5" />
      case 'weak_topic_drill':
        return <Brain className="w-5 h-5" />
      case 'full_review':
        return <BookOpen className="w-5 h-5" />
      default:
        return <Zap className="w-5 h-5" />
    }
  }

  const getPriorityColor = (priority: CramSessionBlock['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800 text-orange-800 dark:text-orange-200'
      case 'medium':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    }
  }

  const getDayLabel = (daysUntilExam: number): string => {
    if (daysUntilExam === 0) return "Exam Day"
    if (daysUntilExam === 1) return "Tomorrow"
    return `${daysUntilExam} days`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Cram Mode</h1>
                <p className="text-sm text-orange-100">Week Before Exam</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Countdown */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold">{plan.daysUntilExam}</p>
              <p className="text-xs text-orange-100">Days Left</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold">{progress.percentComplete}%</p>
              <p className="text-xs text-orange-100">Complete</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold">{weakTopics.length}</p>
              <p className="text-xs text-orange-100">Focus Areas</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/20 rounded-full h-2 mb-3">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>

          {/* Motivation */}
          <p className="text-sm text-orange-100 italic">{motivation}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4">
        {/* Today's Focus Card */}
        {todaySession && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-4 border-2 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today's Sessions</h2>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {todaySession.sessions.filter(s => s.completed).length}/{todaySession.sessions.length} done
              </span>
            </div>

            <div className="space-y-3">
              {todaySession.sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    session.completed
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 opacity-75'
                      : getPriorityColor(session.priority)
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        session.completed
                          ? 'bg-green-200 dark:bg-green-800'
                          : 'bg-white/50 dark:bg-gray-700/50'
                      }`}>
                        {session.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          getSessionIcon(session.type)
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {session.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {session.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            {session.estimatedMinutes} min
                          </span>
                          {session.topic && (
                            <span className="text-xs px-2 py-0.5 bg-white/50 dark:bg-gray-700 rounded-full">
                              {session.topic}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!session.completed && (
                      <button
                        onClick={() => {
                          onStartSession(session)
                          handleCompleteSession(session.id)
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium flex-shrink-0"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Topics Focus */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Focus Areas</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.focusAreas.filter(f => f.priority === 'critical' || f.priority === 'high').map((focus) => (
              <div
                key={focus.topic}
                className={`p-3 rounded-lg border ${
                  focus.priority === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className={`w-4 h-4 ${
                      focus.priority === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                    }`} />
                    <span className="font-medium text-gray-900 dark:text-white">{focus.topic}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    focus.priority === 'critical'
                      ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                      : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                  }`}>
                    {focus.sessionsAllocated} sessions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Study Schedule</h2>
            </div>
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showAllDays ? 'Show less' : 'View all days'}
            </button>
          </div>

          <div className="space-y-2">
            {(showAllDays ? plan.dailySessions : plan.dailySessions.slice(0, 4)).map((day) => {
              const completedCount = day.sessions.filter(s => s.completed).length
              const isToday = day.day === todaySession?.day
              const isPast = new Date(day.date) < new Date()

              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.day === selectedDay ? null : day.day)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    isToday
                      ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                      : selectedDay === day.day
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  } ${isPast && completedCount < day.sessions.length ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                        completedCount === day.sessions.length
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                          : isToday
                          ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {day.day === 0 ? '!' : day.day}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getDayLabel(day.day)}
                          {isToday && <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">(Today)</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {completedCount}/{day.sessions.length}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {day.estimatedMinutes} min
                        </p>
                      </div>
                      <ArrowRight className={`w-4 h-4 transition-transform ${
                        selectedDay === day.day ? 'rotate-90' : ''
                      } text-gray-400`} />
                    </div>
                  </div>

                  {/* Expanded day view */}
                  {selectedDay === day.day && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      {day.sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            session.completed
                              ? 'bg-green-100/50 dark:bg-green-900/20'
                              : 'bg-gray-100/50 dark:bg-gray-700/50'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {session.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={`text-sm flex-1 ${
                            session.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {session.title}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {session.estimatedMinutes}m
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Progress Status */}
        {!progress.onTrack && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-200">
                  You're a bit behind schedule
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Try to complete at least {Math.ceil((progress.totalSessions - progress.completedSessions) / plan.daysUntilExam)} sessions today to catch up.
                  Focus on critical priority items first.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
