'use client'

import { Flame, Star, Trophy, Crown, Zap } from 'lucide-react'

interface StreakBadgeProps {
  days: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

interface MilestoneInfo {
  threshold: number
  icon: typeof Flame
  label: string
  gradient: string
  textColor: string
  borderColor: string
}

const MILESTONES: MilestoneInfo[] = [
  {
    threshold: 100,
    icon: Crown,
    label: 'Legendary',
    gradient: 'from-amber-400 via-yellow-500 to-orange-500',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-400'
  },
  {
    threshold: 60,
    icon: Trophy,
    label: 'Champion',
    gradient: 'from-purple-400 via-violet-500 to-indigo-500',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-400'
  },
  {
    threshold: 30,
    icon: Star,
    label: 'Master',
    gradient: 'from-blue-400 via-cyan-500 to-teal-500',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-400'
  },
  {
    threshold: 14,
    icon: Zap,
    label: 'Dedicated',
    gradient: 'from-green-400 via-emerald-500 to-teal-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-400'
  },
  {
    threshold: 7,
    icon: Flame,
    label: 'Committed',
    gradient: 'from-orange-400 via-red-500 to-pink-500',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-400'
  }
]

export function getMilestoneForStreak(days: number): MilestoneInfo | null {
  return MILESTONES.find(m => days >= m.threshold) || null
}

export function getNextMilestone(days: number): { milestone: MilestoneInfo; daysLeft: number } | null {
  // Find the next milestone the user hasn't reached
  const sortedMilestones = [...MILESTONES].sort((a, b) => a.threshold - b.threshold)
  const nextMilestone = sortedMilestones.find(m => days < m.threshold)

  if (!nextMilestone) {
    return null // User has achieved all milestones
  }

  return {
    milestone: nextMilestone,
    daysLeft: nextMilestone.threshold - days
  }
}

export function isNewMilestone(days: number): boolean {
  return MILESTONES.some(m => m.threshold === days)
}

export default function StreakBadge({ days, size = 'md', showLabel = true }: StreakBadgeProps) {
  const milestone = getMilestoneForStreak(days)

  if (!milestone) {
    // No milestone reached yet - show basic flame
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1.5">
          <Flame className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} text-gray-400`} />
        </div>
        {showLabel && (
          <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-500`}>
            {days} day{days !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  const IconComponent = milestone.icon
  const sizeClasses = {
    sm: { container: 'p-1', icon: 'w-3 h-3', text: 'text-xs' },
    md: { container: 'p-1.5', icon: 'w-4 h-4', text: 'text-sm' },
    lg: { container: 'p-2', icon: 'w-6 h-6', text: 'text-base' }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          flex items-center justify-center rounded-full
          bg-gradient-to-br ${milestone.gradient}
          ${sizeClasses[size].container}
          shadow-lg
          animate-pulse-subtle
        `}
      >
        <IconComponent className={`${sizeClasses[size].icon} text-white drop-shadow-sm`} />
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-bold ${milestone.textColor} ${sizeClasses[size].text}`}>
            {days} days
          </span>
          <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 -mt-0.5`}>
            {milestone.label}
          </span>
        </div>
      )}
    </div>
  )
}

// Compact badge for inline use
export function StreakBadgeCompact({ days }: { days: number }) {
  const milestone = getMilestoneForStreak(days)

  if (!milestone) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <Flame className="w-3 h-3 text-orange-400" />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{days}</span>
      </div>
    )
  }

  const IconComponent = milestone.icon

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        bg-gradient-to-r ${milestone.gradient}
        shadow-sm
      `}
    >
      <IconComponent className="w-3 h-3 text-white" />
      <span className="text-xs font-bold text-white">{days}</span>
    </div>
  )
}
