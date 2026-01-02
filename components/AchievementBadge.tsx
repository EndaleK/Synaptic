"use client"

import { useState, useEffect } from 'react'
import {
  Flame, Zap, Star, Trophy, Crown, BookOpen, Brain, GraduationCap, Target,
  FileText, Files, FolderTree, Headphones, Mic, Clock, Sunrise, Moon,
  Calendar, Rocket, Sparkles, Lock, Check
} from 'lucide-react'
import { TIER_STYLES, type AchievementTier, type AchievementDefinition } from '@/lib/achievements'

// Icon mapping
const ICON_MAP: Record<string, typeof Flame> = {
  Flame, Zap, Star, Trophy, Crown, BookOpen, Brain, GraduationCap, Target,
  FileText, Files, FolderTree, Headphones, Mic, Clock, Sunrise, Moon,
  Calendar, Rocket, Sparkles, Lock, Check
}

interface AchievementBadgeProps {
  achievement: AchievementDefinition
  unlocked?: boolean
  unlockedAt?: string
  progress?: number
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  isNew?: boolean
  onClick?: () => void
}

export default function AchievementBadge({
  achievement,
  unlocked = false,
  unlockedAt,
  progress = 0,
  size = 'md',
  showProgress = false,
  isNew = false,
  onClick
}: AchievementBadgeProps) {
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(isNew)
  const IconComponent = ICON_MAP[achievement.icon] || Star
  const tierStyle = TIER_STYLES[achievement.tier]

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-12 h-12',
      icon: 'w-5 h-5',
      ring: 'w-14 h-14',
      text: 'text-xs',
      padding: 'p-2'
    },
    md: {
      container: 'w-16 h-16',
      icon: 'w-7 h-7',
      ring: 'w-[72px] h-[72px]',
      text: 'text-sm',
      padding: 'p-3'
    },
    lg: {
      container: 'w-20 h-20',
      icon: 'w-9 h-9',
      ring: 'w-[88px] h-[88px]',
      text: 'text-base',
      padding: 'p-4'
    }
  }

  const config = sizeConfig[size]
  const progressPercent = showProgress && !unlocked
    ? Math.min((progress / achievement.requirement_value) * 100, 100)
    : unlocked ? 100 : 0

  // Dismiss animation after 3 seconds
  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowUnlockAnimation(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isNew])

  return (
    <div
      className={`relative flex flex-col items-center gap-2 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Unlock animation overlay */}
      {showUnlockAnimation && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 animate-ping-once rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 opacity-50" />
          <div className="absolute -inset-4 animate-sparkle">
            {[...Array(8)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute w-4 h-4 text-yellow-400 animate-float"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Progress ring (for in-progress achievements) */}
      {showProgress && !unlocked && progressPercent > 0 && (
        <svg
          className={`absolute ${config.ring} -m-1`}
          viewBox="0 0 36 36"
        >
          <path
            className="stroke-gray-200 dark:stroke-gray-700"
            strokeWidth="2.5"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={`stroke-current ${tierStyle.textColor}`}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${progressPercent}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
      )}

      {/* Badge container */}
      <div
        className={`
          relative ${config.container} ${config.padding}
          rounded-full flex items-center justify-center
          transition-all duration-300
          ${unlocked
            ? `bg-gradient-to-br ${tierStyle.gradient} shadow-lg ${tierStyle.glowColor} hover:scale-110`
            : 'bg-gray-200 dark:bg-gray-700 opacity-60 grayscale'
          }
          ${isNew ? 'animate-bounce-subtle' : ''}
        `}
      >
        <IconComponent
          className={`
            ${config.icon}
            ${unlocked ? 'text-white drop-shadow-md' : 'text-gray-400 dark:text-gray-500'}
          `}
        />

        {/* Lock icon for locked achievements */}
        {!unlocked && !showProgress && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <Lock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </div>
        )}

        {/* Check mark for unlocked */}
        {unlocked && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-md">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}

        {/* New badge indicator */}
        {isNew && (
          <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white shadow-md animate-pulse">
            NEW
          </div>
        )}
      </div>

      {/* Name and tier */}
      <div className="text-center max-w-[100px]">
        <p className={`font-semibold ${config.text} ${unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'} truncate`}>
          {achievement.name}
        </p>
        <p className={`text-xs ${tierStyle.textColor} capitalize`}>
          {achievement.tier}
        </p>
      </div>

      {/* Progress text */}
      {showProgress && !unlocked && progressPercent > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {progress}/{achievement.requirement_value}
        </p>
      )}
    </div>
  )
}

// Achievement unlock toast/notification component
export function AchievementUnlockToast({
  achievement,
  onClose
}: {
  achievement: AchievementDefinition
  onClose: () => void
}) {
  const IconComponent = ICON_MAP[achievement.icon] || Star
  const tierStyle = TIER_STYLES[achievement.tier]

  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`
        flex items-center gap-4 p-4 pr-6
        bg-white dark:bg-gray-800 rounded-2xl
        shadow-2xl border-2 ${tierStyle.borderColor}
        ${tierStyle.glowColor}
      `}>
        {/* Animated badge */}
        <div className={`
          w-14 h-14 rounded-full flex items-center justify-center
          bg-gradient-to-br ${tierStyle.gradient}
          animate-bounce-subtle shadow-lg
        `}>
          <IconComponent className="w-7 h-7 text-white drop-shadow-md" />
        </div>

        {/* Text content */}
        <div>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            Achievement Unlocked!
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {achievement.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {achievement.description}
          </p>
          <p className={`text-xs font-semibold mt-1 ${tierStyle.textColor}`}>
            +{achievement.points} points
          </p>
        </div>

        {/* Sparkle effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(6)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute w-4 h-4 text-yellow-400 animate-float opacity-60"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <span className="sr-only">Close</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Achievement grid for displaying all badges
export function AchievementGrid({
  achievements,
  userAchievements,
  progressData,
  onBadgeClick
}: {
  achievements: AchievementDefinition[]
  userAchievements: { achievement_id: string; unlocked_at: string }[]
  progressData: { achievement_id: string; current_value: number }[]
  onBadgeClick?: (achievement: AchievementDefinition) => void
}) {
  const unlockedMap = new Map(userAchievements.map(a => [a.achievement_id, a.unlocked_at]))
  const progressMap = new Map(progressData.map(p => [p.achievement_id, p.current_value]))

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4">
      {achievements.map(achievement => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          unlocked={unlockedMap.has(achievement.id)}
          unlockedAt={unlockedMap.get(achievement.id)}
          progress={progressMap.get(achievement.id) || 0}
          showProgress={true}
          onClick={() => onBadgeClick?.(achievement)}
        />
      ))}
    </div>
  )
}
