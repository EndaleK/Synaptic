/**
 * Community Features Color System
 *
 * Unified colors for achievements, leaderboards, and challenges
 * aligned with the Synaptic brand design system.
 *
 * Brand Colors Reference:
 * - Sapphire: #3F87DA (primary brand, trust, focus)
 * - Electric Cyan: #00CCFF (highlights, clarity)
 * - Warm Amber: #FFA53F (energy, engagement, gold tier)
 * - Soft Teal: #00CCB6 (calm focus)
 * - Success Green: #00D98B (correct, achievements)
 * - Warning Amber: #FFB020 (attention needed)
 * - Error Red: #FF4757 (errors, alerts)
 */

import type { AchievementTier } from '@/lib/achievements'

/**
 * Achievement Tier Colors
 * Used by AchievementBadge and ShareAchievementCard
 */
export const TIER_COLORS: Record<AchievementTier, {
  gradient: string
  bg: string
  border: string
  text: string
  glow: string
  bgColor: string
  textColor: string
  borderColor: string
  glowColor: string
}> = {
  bronze: {
    gradient: 'from-amber-600 to-amber-700',
    bg: '#CD7F32',
    border: 'border-amber-500',
    text: 'text-amber-100',
    glow: 'shadow-amber-500/30',
    // Legacy compatibility (for AchievementBadge)
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-500',
    glowColor: 'shadow-amber-500/30'
  },
  silver: {
    gradient: 'from-slate-400 to-slate-500',
    bg: '#C0C0C0',
    border: 'border-slate-400',
    text: 'text-slate-100',
    glow: 'shadow-slate-400/30',
    // Legacy compatibility
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    textColor: 'text-gray-600 dark:text-gray-300',
    borderColor: 'border-slate-400',
    glowColor: 'shadow-slate-400/30'
  },
  gold: {
    gradient: 'from-[#FFA53F] to-amber-500', // Brand Warm Amber
    bg: '#FFA53F',
    border: 'border-amber-400',
    text: 'text-amber-50',
    glow: 'shadow-amber-400/40',
    // Legacy compatibility
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-400',
    glowColor: 'shadow-amber-400/40'
  },
  platinum: {
    gradient: 'from-[#00CCFF] to-cyan-500', // Brand Electric Cyan
    bg: '#00CCFF',
    border: 'border-cyan-400',
    text: 'text-cyan-50',
    glow: 'shadow-cyan-400/40',
    // Legacy compatibility
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    borderColor: 'border-cyan-400',
    glowColor: 'shadow-cyan-400/40'
  },
  diamond: {
    gradient: 'from-[#3F87DA] via-blue-400 to-[#00CCFF]', // Sapphire to Electric Cyan
    bg: '#3F87DA',
    border: 'border-blue-400',
    text: 'text-blue-50',
    glow: 'shadow-blue-400/50',
    // Legacy compatibility
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-400',
    glowColor: 'shadow-blue-400/50'
  }
}

/**
 * Leaderboard Rank Colors
 * Used by LeaderboardWidget
 */
export const RANK_COLORS = {
  first: {
    gradient: 'from-[#FFA53F] to-amber-500',   // Gold (Brand Warm Amber)
    glow: 'shadow-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400'
  },
  second: {
    gradient: 'from-slate-400 to-slate-500',   // Silver
    glow: 'shadow-slate-400/30',
    text: 'text-slate-600 dark:text-slate-400'
  },
  third: {
    gradient: 'from-amber-600 to-amber-700',   // Bronze
    glow: 'shadow-amber-600/30',
    text: 'text-amber-700 dark:text-amber-500'
  },
  currentUser: {
    gradient: 'from-[#3F87DA] to-blue-500',    // Sapphire (primary brand)
    glow: 'shadow-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20',
    border: 'border-blue-200 dark:border-blue-800'
  }
}

/**
 * Challenge Type Colors
 * Uses mode colors where applicable, aligned with brand
 */
export const CHALLENGE_COLORS = {
  flashcards: {
    gradient: 'from-indigo-500 to-indigo-600',  // --mode-flashcards
    text: 'text-indigo-600 dark:text-indigo-400'
  },
  streak: {
    gradient: 'from-[#FFA53F] to-amber-500',    // Warm Amber (energy)
    text: 'text-amber-600 dark:text-amber-400'
  },
  study_time: {
    gradient: 'from-[#00CCB6] to-teal-500',     // Soft Teal (focus)
    text: 'text-teal-600 dark:text-teal-400'
  },
  exams: {
    gradient: 'from-[#3F87DA] to-blue-500',     // Sapphire (achievement)
    text: 'text-blue-600 dark:text-blue-400'
  },
  custom: {
    gradient: 'from-emerald-500 to-emerald-600', // Mind map green
    text: 'text-emerald-600 dark:text-emerald-400'
  }
}

/**
 * Share Card Tier Colors (for ShareAchievementCard)
 * Provides full background gradients for the achievement share cards
 */
export const SHARE_CARD_COLORS: Record<AchievementTier, {
  bg: string
  border: string
  text: string
  glow: string
}> = {
  bronze: {
    bg: 'from-amber-700 via-amber-600 to-amber-800',
    border: 'border-amber-500',
    text: 'text-amber-100',
    glow: 'shadow-amber-500/50'
  },
  silver: {
    bg: 'from-slate-400 via-slate-300 to-slate-500',
    border: 'border-slate-300',
    text: 'text-slate-800',
    glow: 'shadow-slate-400/50'
  },
  gold: {
    bg: 'from-[#FFA53F] via-amber-400 to-amber-500',
    border: 'border-amber-400',
    text: 'text-amber-900',
    glow: 'shadow-amber-500/50'
  },
  platinum: {
    bg: 'from-[#00CCFF] via-cyan-400 to-cyan-500',
    border: 'border-cyan-300',
    text: 'text-cyan-900',
    glow: 'shadow-cyan-400/50'
  },
  diamond: {
    bg: 'from-[#3F87DA] via-blue-400 to-[#00CCFF]',
    border: 'border-blue-300',
    text: 'text-blue-900',
    glow: 'shadow-blue-400/50'
  }
}

/**
 * Tier Labels with emojis for display
 */
export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: '🥉 BRONZE',
  silver: '🥈 SILVER',
  gold: '🥇 GOLD',
  platinum: '💎 PLATINUM',
  diamond: '✨ DIAMOND'
}
