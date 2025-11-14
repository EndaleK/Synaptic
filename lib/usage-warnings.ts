/**
 * Usage Warnings System
 *
 * Provides soft warnings when users approach their usage limits (80% threshold).
 * Helps improve UX by proactively notifying users before hard blocks occur.
 *
 * Created: Nov 14, 2025 - Part of free tier growth strategy
 */

import { checkUsageLimit, type FeatureType } from './usage-limits'
import { logger } from './logger'

export interface UsageWarning {
  feature: FeatureType
  used: number
  limit: number
  percentage: number
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export interface UsageWarningsResult {
  hasWarnings: boolean
  warnings: UsageWarning[]
  criticalWarnings: UsageWarning[] // 90%+ usage
  approachingLimit: UsageWarning[] // 80-89% usage
}

/**
 * Check all usage limits and generate warnings for features approaching limits
 * @param clerkUserId - Clerk user ID
 * @param threshold - Percentage threshold for warnings (default: 80%)
 * @returns Array of warnings for features approaching limits
 */
export async function checkAllUsageWarnings(
  clerkUserId: string,
  threshold: number = 80
): Promise<UsageWarningsResult> {
  const features: FeatureType[] = ['documents', 'flashcards', 'podcasts', 'mindmaps', 'exams', 'chat_messages']
  const warnings: UsageWarning[] = []

  for (const feature of features) {
    try {
      const usageCheck = await checkUsageLimit(clerkUserId, feature)

      // Skip if unlimited (premium tier)
      if (usageCheck.limit === Infinity) {
        continue
      }

      // Calculate percentage used
      const percentage = (usageCheck.used / usageCheck.limit) * 100

      // Generate warning if above threshold
      if (percentage >= threshold) {
        const severity: 'info' | 'warning' | 'critical' =
          percentage >= 95 ? 'critical' :
          percentage >= 90 ? 'warning' : 'info'

        warnings.push({
          feature,
          used: usageCheck.used,
          limit: usageCheck.limit,
          percentage: Math.round(percentage),
          message: generateWarningMessage(feature, usageCheck.used, usageCheck.limit, percentage),
          severity
        })
      }
    } catch (error) {
      logger.error('Failed to check usage warning', error, { clerkUserId, feature })
    }
  }

  // Categorize warnings
  const criticalWarnings = warnings.filter(w => w.severity === 'critical')
  const approachingLimit = warnings.filter(w => w.severity === 'info' || w.severity === 'warning')

  logger.debug('Usage warnings checked', {
    clerkUserId,
    totalWarnings: warnings.length,
    critical: criticalWarnings.length,
    approaching: approachingLimit.length
  })

  return {
    hasWarnings: warnings.length > 0,
    warnings,
    criticalWarnings,
    approachingLimit
  }
}

/**
 * Check usage for a single feature and return warning if approaching limit
 * @param clerkUserId - Clerk user ID
 * @param feature - Feature to check
 * @param threshold - Percentage threshold (default: 80%)
 * @returns Warning object if approaching limit, null otherwise
 */
export async function checkFeatureWarning(
  clerkUserId: string,
  feature: FeatureType,
  threshold: number = 80
): Promise<UsageWarning | null> {
  try {
    const usageCheck = await checkUsageLimit(clerkUserId, feature)

    // Skip if unlimited
    if (usageCheck.limit === Infinity) {
      return null
    }

    const percentage = (usageCheck.used / usageCheck.limit) * 100

    if (percentage >= threshold) {
      const severity: 'info' | 'warning' | 'critical' =
        percentage >= 95 ? 'critical' :
        percentage >= 90 ? 'warning' : 'info'

      return {
        feature,
        used: usageCheck.used,
        limit: usageCheck.limit,
        percentage: Math.round(percentage),
        message: generateWarningMessage(feature, usageCheck.used, usageCheck.limit, percentage),
        severity
      }
    }

    return null
  } catch (error) {
    logger.error('Failed to check feature warning', error, { clerkUserId, feature })
    return null
  }
}

/**
 * Generate a user-friendly warning message
 */
function generateWarningMessage(
  feature: FeatureType,
  used: number,
  limit: number,
  percentage: number
): string {
  const featureName = formatFeatureName(feature)
  const remaining = limit - used

  if (percentage >= 100) {
    return `You've reached your monthly limit for ${featureName} (${used}/${limit}). Upgrade to Premium for unlimited access.`
  } else if (percentage >= 95) {
    return `Almost at your limit! You have ${remaining} ${featureName} remaining this month (${used}/${limit}).`
  } else if (percentage >= 90) {
    return `You're running low on ${featureName}. Only ${remaining} remaining this month (${used}/${limit}).`
  } else {
    return `You've used ${used} of ${limit} ${featureName} this month (${Math.round(percentage)}%).`
  }
}

/**
 * Format feature name for display
 */
function formatFeatureName(feature: FeatureType): string {
  const names: Record<FeatureType, string> = {
    documents: 'documents',
    flashcards: 'flashcards',
    podcasts: 'podcasts',
    mindmaps: 'mind maps',
    exams: 'practice exams',
    chat_messages: 'chat messages'
  }
  return names[feature]
}

/**
 * Determine if a warning should be shown based on when it was last shown
 * Prevents warning fatigue by not showing the same warning too frequently
 * @param lastShownTime - Timestamp when warning was last shown (milliseconds)
 * @param cooldownMinutes - Minimum minutes between showing same warning (default: 60)
 * @returns True if warning should be shown
 */
export function shouldShowWarning(
  lastShownTime: number | null,
  cooldownMinutes: number = 60
): boolean {
  if (!lastShownTime) {
    return true // Never shown before
  }

  const cooldownMs = cooldownMinutes * 60 * 1000
  const timeSinceLastShown = Date.now() - lastShownTime

  return timeSinceLastShown >= cooldownMs
}

/**
 * Get upgrade CTA message based on current usage
 */
export function getUpgradeMessage(warnings: UsageWarning[]): string {
  if (warnings.length === 0) {
    return "Upgrade to Premium for unlimited access to all features."
  }

  const criticalFeatures = warnings
    .filter(w => w.percentage >= 90)
    .map(w => formatFeatureName(w.feature))

  if (criticalFeatures.length > 0) {
    const features = criticalFeatures.slice(0, 2).join(' and ')
    return `You're running low on ${features}. Upgrade to Premium for unlimited access.`
  }

  return `Get unlimited ${formatFeatureName(warnings[0].feature)} and all other features with Premium.`
}
