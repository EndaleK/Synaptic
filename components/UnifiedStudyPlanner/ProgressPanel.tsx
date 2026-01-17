'use client'

import {
  TrendingUp,
  Flame,
  Target,
  Clock,
  Calendar,
  CheckCircle2,
  Trophy,
  BookOpen,
} from 'lucide-react'
import { type StudyPlan } from './index'

interface StudyStats {
  streak: number
  totalMinutesToday: number
  dailyGoal: number
  weeklyProgress: number[]
  daysActive: number
}

interface ProgressPanelProps {
  stats: StudyStats
  plans: StudyPlan[]
  activePlan?: StudyPlan
}

export default function ProgressPanel({ stats, plans, activePlan }: ProgressPanelProps) {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date().getDay()

  // Calculate weekly total
  const weeklyTotal = stats.weeklyProgress.reduce((sum, val) => sum + val, 0)
  const weeklyGoal = stats.dailyGoal * 7

  // Get active plan progress
  const planProgress = activePlan
    ? Math.round((activePlan.sessionsCompleted / (activePlan.sessionsTotal || 1)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/20"
          label="Current Streak"
          value={`${stats.streak} days`}
          trend={stats.streak > 0 ? 'Keep it going!' : 'Start today!'}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/20"
          label="Today's Study Time"
          value={`${stats.totalMinutesToday} min`}
          trend={`Goal: ${stats.dailyGoal} min`}
          progress={Math.min(100, (stats.totalMinutesToday / stats.dailyGoal) * 100)}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          label="Days Active"
          value={stats.daysActive.toString()}
          trend="This week"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          label="Plan Progress"
          value={`${planProgress}%`}
          trend={activePlan?.title || 'No active plan'}
          progress={planProgress}
        />
      </div>

      {/* Weekly Heat Map */}
      <div className="p-6 bg-slate-800/50 border border-white/10 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          This Week&apos;s Activity
        </h3>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayLabels.map((label, idx) => {
            const minutes = stats.weeklyProgress[idx] || 0
            const intensity = Math.min(100, (minutes / stats.dailyGoal) * 100)
            const isToday = idx === today

            return (
              <div key={label} className="text-center">
                <div className="text-white/40 text-xs mb-2">{label}</div>
                <div
                  className={`relative w-full aspect-square rounded-lg transition-all ${
                    isToday ? 'ring-2 ring-purple-500' : ''
                  }`}
                  style={{
                    backgroundColor: intensity > 0
                      ? `rgba(168, 85, 247, ${Math.max(0.2, intensity / 100)})`
                      : 'rgba(255, 255, 255, 0.05)'
                  }}
                  title={`${minutes} minutes`}
                >
                  {intensity >= 100 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className="text-white/40 text-xs mt-1">
                  {minutes > 0 ? `${minutes}m` : '-'}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-white/50">
            Weekly total: <span className="text-white font-medium">{weeklyTotal} min</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">Less</span>
            <div className="flex gap-1">
              {[0.1, 0.3, 0.5, 0.7, 1].map((intensity, idx) => (
                <div
                  key={idx}
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: `rgba(168, 85, 247, ${intensity})` }}
                />
              ))}
            </div>
            <span className="text-white/40">More</span>
          </div>
        </div>
      </div>

      {/* Active Plans Progress */}
      {plans.length > 0 && (
        <div className="p-6 bg-slate-800/50 border border-white/10 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Study Plans
          </h3>

          <div className="space-y-4">
            {plans.map((plan) => {
              const progress = plan.sessionsTotal > 0
                ? Math.round((plan.sessionsCompleted / plan.sessionsTotal) * 100)
                : 0
              const daysUntilExam = Math.ceil(
                (new Date(plan.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )

              return (
                <div
                  key={plan.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">{plan.title}</h4>
                      <p className="text-white/40 text-sm">
                        {plan.sessionsCompleted}/{plan.sessionsTotal} sessions • {daysUntilExam} days left
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : plan.status === 'completed'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {plan.status}
                    </span>
                  </div>

                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                    <span>{progress}% complete</span>
                    <span>{plan.hoursCompleted.toFixed(1)}/{plan.totalEstimatedHours.toFixed(1)}h studied</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Goals Section */}
      <div className="p-6 bg-slate-800/50 border border-white/10 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Daily Goals
        </h3>

        <div className="space-y-4">
          <GoalProgress
            label="Study Time"
            current={stats.totalMinutesToday}
            target={stats.dailyGoal}
            unit="min"
            color="from-purple-500 to-pink-500"
          />
          <GoalProgress
            label="Streak Days"
            current={stats.streak}
            target={7}
            unit="days"
            color="from-orange-500 to-red-500"
          />
          <GoalProgress
            label="Weekly Progress"
            current={weeklyTotal}
            target={weeklyGoal}
            unit="min"
            color="from-blue-500 to-cyan-500"
          />
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  label: string
  value: string
  trend?: string
  progress?: number
}

function StatCard({ icon, iconColor, iconBg, label, value, trend, progress }: StatCardProps) {
  return (
    <div className="p-5 bg-slate-800/50 border border-white/10 rounded-xl">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-white/40 text-sm">{label}</div>
      {trend && (
        <div className="text-white/50 text-xs mt-2">{trend}</div>
      )}
      {progress !== undefined && (
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Goal Progress Component
interface GoalProgressProps {
  label: string
  current: number
  target: number
  unit: string
  color: string
}

function GoalProgress({ label, current, target, unit, color }: GoalProgressProps) {
  const progress = Math.min(100, (current / target) * 100)
  const isComplete = current >= target

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{label}</span>
          {isComplete && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
        </div>
        <span className="text-white/60 text-sm">
          {current}/{target} {unit}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
