'use client'

import { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Target,
  Plus,
  BookOpen,
  MessageSquare,
  Network,
  Mic,
  GraduationCap,
  FileText,
  Flame,
  SkipForward,
  RotateCcw,
  Sparkles,
  Coffee,
  Brain,
} from 'lucide-react'
import { usePomodoroStore } from '@/lib/store/usePomodoroStore'
import { STUDY_MODES, type TodaySession, type StudyPlan } from './index'

interface StudyStats {
  streak: number
  totalMinutesToday: number
  dailyGoal: number
  weeklyProgress: number[]
  daysActive: number
}

interface TodayViewProps {
  sessions: TodaySession[]
  stats: StudyStats
  activePlan?: StudyPlan
  onSessionStart: (session: TodaySession) => void
  onSessionComplete: (sessionId: string) => void
  onNavigateToMode: (mode: string, documentId?: string, sessionTopic?: string, topicPages?: { startPage?: number; endPage?: number }) => void
  onCreatePlan: () => void
}

export default function TodayView({
  sessions,
  stats,
  activePlan,
  onSessionStart,
  onSessionComplete,
  onNavigateToMode,
  onCreatePlan,
}: TodayViewProps) {
  const pomodoroStore = usePomodoroStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Sync timer on mount (in case page was reloaded while timer was running)
    pomodoroStore.syncTimer()
  }, [])

  // Timer interval effect
  useEffect(() => {
    if (!mounted) return

    let interval: NodeJS.Timeout | null = null
    if (pomodoroStore.status === 'running') {
      interval = setInterval(() => {
        pomodoroStore.tick()
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [mounted, pomodoroStore.status])

  const pendingSessions = sessions.filter(s => s.status === 'scheduled')
  const completedSessions = sessions.filter(s => s.status === 'completed')
  const progressPercent = stats.dailyGoal > 0
    ? Math.min(100, Math.round((stats.totalMinutesToday / stats.dailyGoal) * 100))
    : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerLabel = () => {
    switch (pomodoroStore.timerType) {
      case 'focus': return 'Focus Time'
      case 'shortBreak': return 'Short Break'
      case 'longBreak': return 'Long Break'
    }
  }

  const getTimerColor = () => {
    switch (pomodoroStore.timerType) {
      case 'focus': return 'from-red-500 to-orange-500'
      case 'shortBreak': return 'from-green-500 to-emerald-500'
      case 'longBreak': return 'from-blue-500 to-cyan-500'
    }
  }

  const getTimerIcon = () => {
    switch (pomodoroStore.timerType) {
      case 'focus': return <Brain className="w-5 h-5" />
      case 'shortBreak': return <Coffee className="w-5 h-5" />
      case 'longBreak': return <Coffee className="w-5 h-5" />
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left Column - Today's Sessions */}
      <div className="lg:col-span-2 space-y-6">
        {/* Today's Sessions Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Today&apos;s Study Plan
          </h2>
          <button
            onClick={onCreatePlan}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Session Cards */}
        {pendingSessions.length === 0 && completedSessions.length === 0 ? (
          <div className="p-8 bg-slate-800/50 border border-white/10 rounded-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-white/5 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-white/30" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No sessions today</h3>
            <p className="text-white/50 text-sm mb-4">
              Create a study plan or generate a study guide to populate your daily sessions.
            </p>
            <button
              onClick={onCreatePlan}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition-all text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Create Study Plan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending Sessions */}
            {pendingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onStart={() => onSessionStart(session)}
                onComplete={() => onSessionComplete(session.id)}
                onNavigateToMode={onNavigateToMode}
              />
            ))}

            {/* Completed Sessions (collapsed) */}
            {completedSessions.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                  Completed ({completedSessions.length})
                </p>
                <div className="space-y-2">
                  {completedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-3 bg-slate-800/30 border border-white/5 rounded-xl opacity-60"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {session.topic || 'Study Session'}
                        </p>
                        <p className="text-white/40 text-xs">
                          {session.estimatedMinutes} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column - Timer & Progress */}
      <div className="space-y-6">
        {/* Embedded Pomodoro Timer */}
        {mounted && (
          <div className="p-5 bg-slate-800/50 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {getTimerIcon()}
                <span className="text-white font-medium">{getTimerLabel()}</span>
              </div>
              <span className="text-white/40 text-xs">
                Session {(pomodoroStore.sessionsCompleted % 4) + 1}/4
              </span>
            </div>

            {/* Timer Display */}
            <div className="relative mb-4">
              <div className="text-center">
                <div className={`text-5xl font-bold bg-gradient-to-br ${getTimerColor()} bg-clip-text text-transparent`}>
                  {formatTime(pomodoroStore.timeRemaining)}
                </div>
                <p className="text-white/40 text-xs mt-1">
                  {pomodoroStore.status === 'running' ? 'Stay focused!' : 'Ready when you are'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getTimerColor()} transition-all duration-1000`}
                  style={{
                    width: `${(1 - pomodoroStore.timeRemaining / (pomodoroStore.focusDuration * 60)) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => pomodoroStore.resetTimer()}
                disabled={pomodoroStore.status === 'idle'}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-white/70" />
              </button>

              <button
                onClick={() => pomodoroStore.status === 'running' ? pomodoroStore.pauseTimer() : pomodoroStore.startTimer()}
                className={`p-4 rounded-full bg-gradient-to-br ${getTimerColor()} hover:opacity-90 transition-all shadow-lg`}
              >
                {pomodoroStore.status === 'running' ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={() => {
                  if (pomodoroStore.timerType === 'focus') {
                    pomodoroStore.switchTimerType('shortBreak')
                  } else {
                    pomodoroStore.switchTimerType('focus')
                  }
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <SkipForward className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        )}

        {/* Today's Progress */}
        <div className="p-5 bg-slate-800/50 border border-white/10 rounded-2xl">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            Today&apos;s Progress
          </h3>

          {/* Progress Ring */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-white/10"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="url(#progress-gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progressPercent * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{progressPercent}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/50 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Study time
              </span>
              <span className="text-white font-medium">
                {stats.totalMinutesToday}/{stats.dailyGoal} min
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sessions
              </span>
              <span className="text-white font-medium">
                {completedSessions.length}/{sessions.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Streak
              </span>
              <span className="text-white font-medium">{stats.streak} days</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-5 bg-slate-800/50 border border-white/10 rounded-2xl">
          <h3 className="text-white font-medium mb-3">Quick Study</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['flashcards', 'chat', 'mindmap'] as const).map((mode) => {
              const config = STUDY_MODES[mode]
              const Icon = config.icon
              return (
                <button
                  key={mode}
                  onClick={() => onNavigateToMode(mode)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/70 text-xs font-medium group-hover:text-white">
                    {config.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Session Card Component
interface SessionCardProps {
  session: TodaySession
  onStart: () => void
  onComplete: () => void
  onNavigateToMode: (mode: string, documentId?: string, sessionTopic?: string, topicPages?: { startPage?: number; endPage?: number }) => void
}

function SessionCard({ session, onStart, onComplete, onNavigateToMode }: SessionCardProps) {
  const mode = session.mode || 'flashcards'
  const modeConfig = STUDY_MODES[mode] || STUDY_MODES.flashcards
  const ModeIcon = modeConfig.icon

  return (
    <div className="p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:border-white/20 transition-all">
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${modeConfig.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
          <ModeIcon className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white font-semibold truncate">{session.topic || 'Study Session'}</p>
            <span className="px-2 py-0.5 bg-white/10 text-white/60 rounded-full text-xs">
              {session.estimatedMinutes} min
            </span>
          </div>

          {session.documentName && (
            <p className="text-white/40 text-xs flex items-center gap-1 mb-2 truncate">
              <FileText className="w-3 h-3" />
              {session.documentName}
              {session.topicPages?.startPage && session.topicPages?.endPage && (
                <span className="text-white/30">
                  • Pages {session.topicPages.startPage}-{session.topicPages.endPage}
                </span>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onStart}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${modeConfig.color} text-white rounded-lg font-medium hover:opacity-90 transition-all text-sm`}
            >
              <Play className="w-3.5 h-3.5" />
              Start Session
            </button>

            <button
              onClick={onComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors text-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark Done
            </button>
          </div>

          {/* Quick access to other modes */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/30 text-xs mb-2">Or try:</p>
            <div className="flex gap-1">
              {(['flashcards', 'chat', 'mindmap', 'podcast'] as const)
                .filter(m => m !== mode)
                .slice(0, 4)
                .map((altMode) => {
                  const altConfig = STUDY_MODES[altMode]
                  const AltIcon = altConfig.icon
                  return (
                    <button
                      key={altMode}
                      onClick={() => onNavigateToMode(altMode, session.documentId, session.topic, session.topicPages)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                      title={altConfig.label}
                    >
                      <AltIcon className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
