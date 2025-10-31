/**
 * Usage limits and enforcement utilities
 * Centralized logic for checking subscription tier limits
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Usage limits per tier
export const USAGE_LIMITS = {
  free: {
    documents: 10,
    flashcards: 50,
    podcasts: 5,
    mindmaps: 10
  },
  premium: {
    documents: Infinity,
    flashcards: Infinity,
    podcasts: Infinity,
    mindmaps: Infinity
  },
  enterprise: {
    documents: Infinity,
    flashcards: Infinity,
    podcasts: Infinity,
    mindmaps: Infinity
  }
}

export type FeatureType = 'documents' | 'flashcards' | 'podcasts' | 'mindmaps'

export interface UsageCheckResult {
  allowed: boolean
  tier: string
  used: number
  limit: number
  remaining: number
  message?: string
}

/**
 * Check if user can perform an action based on their subscription tier and current usage
 * @param clerkUserId - Clerk user ID
 * @param feature - Feature type to check (documents, flashcards, podcasts, mindmaps)
 * @returns UsageCheckResult with allowed status and usage details
 */
export async function checkUsageLimit(
  clerkUserId: string,
  feature: FeatureType
): Promise<UsageCheckResult> {
  try {
    const supabase = await createClient()

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, subscription_tier, subscription_status, monthly_document_count')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !profile) {
      logger.error('Failed to fetch user profile for usage check', profileError, { clerkUserId, feature })
      return {
        allowed: false,
        tier: 'unknown',
        used: 0,
        limit: 0,
        remaining: 0,
        message: 'Unable to verify subscription status'
      }
    }

    const tier = profile.subscription_tier || 'free'
    const limits = USAGE_LIMITS[tier as keyof typeof USAGE_LIMITS] || USAGE_LIMITS.free

    // Premium and Enterprise tiers have unlimited access
    if (tier === 'premium' || tier === 'enterprise') {
      // But check if subscription is active
      if (profile.subscription_status !== 'active') {
        return {
          allowed: false,
          tier,
          used: 0,
          limit: limits[feature],
          remaining: 0,
          message: `Your ${tier} subscription is ${profile.subscription_status}. Please update your payment method.`
        }
      }

      return {
        allowed: true,
        tier,
        used: 0,
        limit: limits[feature],
        remaining: Infinity
      }
    }

    // For free tier, check actual usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    let used = 0

    if (feature === 'documents') {
      // Use monthly_document_count from profile
      used = profile.monthly_document_count || 0
    } else {
      // Query usage_tracking table for other features
      const actionTypeMap = {
        flashcards: ['flashcard_generation', 'flashcard'],
        podcasts: ['podcast_generation', 'podcast'],
        mindmaps: ['mindmap_generation', 'mindmap']
      }

      const actionTypes = actionTypeMap[feature as keyof typeof actionTypeMap] || []

      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('action_type')
        .eq('user_id', profile.id)
        .gte('created_at', startOfMonth.toISOString())

      if (usageError) {
        logger.error('Failed to fetch usage data', usageError, { clerkUserId, feature })
      }

      // Count matching action types
      used = usageData?.filter(record =>
        actionTypes.some(type => record.action_type === type || record.action_type.includes(type))
      ).length || 0
    }

    const limit = limits[feature]
    const remaining = Math.max(0, limit - used)
    const allowed = used < limit

    return {
      allowed,
      tier,
      used,
      limit,
      remaining,
      message: allowed
        ? undefined
        : `You've reached your monthly ${feature} limit (${limit}). Upgrade to Premium for unlimited access.`
    }

  } catch (error: any) {
    logger.error('Usage limit check failed', error, { clerkUserId, feature })
    return {
      allowed: false,
      tier: 'error',
      used: 0,
      limit: 0,
      remaining: 0,
      message: 'Unable to verify usage limits. Please try again.'
    }
  }
}

/**
 * Increment usage count for a feature
 * Should be called after successful action completion
 */
export async function incrementUsage(
  clerkUserId: string,
  feature: FeatureType
): Promise<void> {
  try {
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (!profile) {
      logger.error('Cannot increment usage: profile not found', { clerkUserId, feature })
      return
    }

    // Map feature to action_type
    const actionTypeMap: Record<FeatureType, string> = {
      documents: 'document_upload',
      flashcards: 'flashcard_generation',
      podcasts: 'podcast_generation',
      mindmaps: 'mindmap_generation'
    }

    const actionType = actionTypeMap[feature]

    // Insert usage tracking record
    const { error } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: profile.id,
        action_type: actionType,
        metadata: { feature }
      })

    if (error) {
      logger.error('Failed to increment usage', error, { clerkUserId, feature })
    }

  } catch (error: any) {
    logger.error('Usage increment failed', error, { clerkUserId, feature })
  }
}
