/**
 * Achievement System
 * Handles badge definitions, progress tracking, and unlocking
 */

import { createClient } from '@/lib/supabase/server'

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type AchievementCategory = 'streak' | 'flashcards' | 'exams' | 'documents' | 'podcasts' | 'social' | 'special'
export type RequirementType = 'count' | 'streak' | 'score' | 'special'

export interface AchievementDefinition {
  id: string
  slug: string
  name: string
  description: string
  category: AchievementCategory
  icon: string
  tier: AchievementTier
  points: number
  requirement_type: RequirementType
  requirement_value: number
  requirement_description?: string
  is_secret: boolean
  is_active: boolean
  sort_order: number
}

export interface UserAchievement {
  id: string
  user_id: number
  achievement_id: string
  unlocked_at: string
  progress: number
  is_displayed: boolean
  achievement?: AchievementDefinition
}

export interface AchievementProgress {
  id: string
  user_id: number
  achievement_id: string
  current_value: number
  last_updated: string
}

// Tier colors and styling
// Updated to use Synaptic brand colors:
// - Gold: #FFA53F (Warm Amber)
// - Platinum: #00CCFF (Electric Cyan)
// - Diamond: #3F87DA → #00CCFF (Sapphire to Electric Cyan)
export const TIER_STYLES: Record<AchievementTier, {
  gradient: string
  bgColor: string
  textColor: string
  borderColor: string
  glowColor: string
}> = {
  bronze: {
    gradient: 'from-amber-600 to-amber-700',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-500',
    glowColor: 'shadow-amber-500/30'
  },
  silver: {
    gradient: 'from-slate-400 to-slate-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    textColor: 'text-gray-600 dark:text-gray-300',
    borderColor: 'border-slate-400',
    glowColor: 'shadow-slate-400/30'
  },
  gold: {
    gradient: 'from-[#FFA53F] to-amber-500', // Brand Warm Amber
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-400',
    glowColor: 'shadow-amber-400/40'
  },
  platinum: {
    gradient: 'from-[#00CCFF] to-cyan-500', // Brand Electric Cyan
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    borderColor: 'border-cyan-400',
    glowColor: 'shadow-cyan-400/40'
  },
  diamond: {
    gradient: 'from-[#3F87DA] via-blue-400 to-[#00CCFF]', // Sapphire to Electric Cyan
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-400',
    glowColor: 'shadow-blue-400/50'
  }
}

// Category icons and colors
export const CATEGORY_STYLES: Record<AchievementCategory, {
  color: string
  bgColor: string
}> = {
  streak: { color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  flashcards: { color: 'text-indigo-500', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  exams: { color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  documents: { color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  podcasts: { color: 'text-violet-500', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
  social: { color: 'text-pink-500', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  special: { color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' }
}

/**
 * Check and unlock achievements for a user
 */
export async function checkAchievements(
  userId: number,
  category: AchievementCategory,
  stats: {
    count?: number
    streak?: number
    score?: number
    specialCondition?: string
  }
): Promise<AchievementDefinition[]> {
  const supabase = await createClient()
  const unlockedAchievements: AchievementDefinition[] = []

  // Get all active achievements for this category
  const { data: achievements, error: achError } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)

  if (achError || !achievements) {
    console.error('Error fetching achievements:', achError)
    return []
  }

  // Get user's already unlocked achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  const unlockedIds = new Set(userAchievements?.map(a => a.achievement_id) || [])

  // Check each achievement
  for (const achievement of achievements) {
    // Skip if already unlocked
    if (unlockedIds.has(achievement.id)) continue

    let isUnlocked = false

    switch (achievement.requirement_type) {
      case 'count':
        isUnlocked = (stats.count || 0) >= achievement.requirement_value
        break
      case 'streak':
        isUnlocked = (stats.streak || 0) >= achievement.requirement_value
        break
      case 'score':
        isUnlocked = (stats.score || 0) >= achievement.requirement_value
        break
      case 'special':
        // Special achievements need specific condition checks
        isUnlocked = checkSpecialCondition(achievement.slug, stats.specialCondition)
        break
    }

    if (isUnlocked) {
      // Unlock the achievement
      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          progress: achievement.requirement_value
        })

      if (!insertError) {
        unlockedAchievements.push(achievement)
      }
    } else if (stats.count !== undefined || stats.streak !== undefined) {
      // Update progress
      const currentValue = stats.count || stats.streak || 0
      await supabase
        .from('achievement_progress')
        .upsert({
          user_id: userId,
          achievement_id: achievement.id,
          current_value: currentValue,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id,achievement_id'
        })
    }
  }

  return unlockedAchievements
}

/**
 * Check special achievement conditions
 */
function checkSpecialCondition(slug: string, condition?: string): boolean {
  if (!condition) return false

  switch (slug) {
    case 'early_bird':
      return condition === 'early_morning'
    case 'night_owl':
      return condition === 'late_night'
    case 'weekend_warrior':
      return condition === 'weekend_study'
    case 'speed_learner':
      return condition === 'speed_review'
    default:
      return false
  }
}

/**
 * Get all achievements with user's progress
 */
export async function getUserAchievements(userId: number): Promise<{
  unlocked: (UserAchievement & { achievement: AchievementDefinition })[]
  inProgress: (AchievementProgress & { achievement: AchievementDefinition })[]
  locked: AchievementDefinition[]
  totalPoints: number
}> {
  const supabase = await createClient()

  // Get all achievement definitions
  const { data: allAchievements } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  // Get user's unlocked achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievement_definitions(*)')
    .eq('user_id', userId)

  // Get user's progress
  const { data: progressData } = await supabase
    .from('achievement_progress')
    .select('*, achievement:achievement_definitions(*)')
    .eq('user_id', userId)

  const unlockedIds = new Set(userAchievements?.map(a => a.achievement_id) || [])
  const progressIds = new Set(progressData?.map(p => p.achievement_id) || [])

  const unlocked = (userAchievements || []) as (UserAchievement & { achievement: AchievementDefinition })[]
  const inProgress = (progressData || []).filter(p => !unlockedIds.has(p.achievement_id)) as (AchievementProgress & { achievement: AchievementDefinition })[]
  const locked = (allAchievements || []).filter(a =>
    !unlockedIds.has(a.id) &&
    !progressIds.has(a.id) &&
    !a.is_secret
  )

  const totalPoints = unlocked.reduce((sum, a) => sum + (a.achievement?.points || 0), 0)

  return { unlocked, inProgress, locked, totalPoints }
}

/**
 * Get recently unlocked achievements for a user
 */
export async function getRecentAchievements(
  userId: number,
  limit: number = 5
): Promise<(UserAchievement & { achievement: AchievementDefinition })[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievement_definitions(*)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(limit)

  return (data || []) as (UserAchievement & { achievement: AchievementDefinition })[]
}

/**
 * Toggle achievement display status
 */
export async function toggleAchievementDisplay(
  userId: number,
  achievementId: string,
  display: boolean
): Promise<boolean> {
  const supabase = await createClient()

  // If enabling display, check if user already has 3 displayed
  if (display) {
    const { data: displayed } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('is_displayed', true)

    if (displayed && displayed.length >= 3) {
      return false // Max 3 displayed badges
    }
  }

  const { error } = await supabase
    .from('user_achievements')
    .update({ is_displayed: display })
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)

  return !error
}

/**
 * Get user's displayed badges (for profile)
 */
export async function getDisplayedBadges(
  userId: number
): Promise<(UserAchievement & { achievement: AchievementDefinition })[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievement_definitions(*)')
    .eq('user_id', userId)
    .eq('is_displayed', true)
    .order('unlocked_at', { ascending: false })
    .limit(3)

  return (data || []) as (UserAchievement & { achievement: AchievementDefinition })[]
}
