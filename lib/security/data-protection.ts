/**
 * Data Protection Utilities
 *
 * Handles:
 * - PII detection and redaction
 * - Data retention policies
 * - GDPR/CCPA compliance helpers
 * - Secure data deletion
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * PII (Personally Identifiable Information) patterns
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
}

/**
 * Detect PII in text content
 */
export function detectPII(content: string): {
  hasPII: boolean
  types: string[]
  count: number
} {
  const detectedTypes: string[] = []
  let totalCount = 0

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = content.match(pattern)
    if (matches && matches.length > 0) {
      detectedTypes.push(type)
      totalCount += matches.length
    }
  }

  return {
    hasPII: detectedTypes.length > 0,
    types: detectedTypes,
    count: totalCount
  }
}

/**
 * Redact PII from content for logging/display
 */
export function redactPII(content: string): string {
  let redacted = content

  // Redact emails
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]')

  // Redact phone numbers
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]')

  // Redact SSNs
  redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]')

  // Redact credit cards
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[CC_REDACTED]')

  // Redact IP addresses (keep for internal logs, redact for user-facing)
  // redacted = redacted.replace(PII_PATTERNS.ipAddress, '[IP_REDACTED]')

  return redacted
}

/**
 * Data retention configuration (in days)
 */
export const DATA_RETENTION = {
  // User data after account deletion
  deletedAccountData: 30,

  // Chat history
  chatHistory: 365,

  // Study sessions
  studySessions: 365,

  // Uploaded documents (active accounts)
  documents: -1, // Never auto-delete for active accounts

  // Flashcard review history
  flashcardHistory: 365,

  // Usage logs
  usageLogs: 90,

  // Webhook events (for deduplication)
  webhookEvents: 30,
}

/**
 * Delete all user data (GDPR Article 17 - Right to Erasure)
 */
export async function deleteUserData(clerkUserId: string): Promise<{
  success: boolean
  deletedCounts: Record<string, number>
  errors: string[]
}> {
  const supabase = await createClient()
  const deletedCounts: Record<string, number> = {}
  const errors: string[] = []

  logger.info('Starting user data deletion', { clerkUserId })

  try {
    // 1. Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (!profile) {
      return {
        success: false,
        deletedCounts,
        errors: ['User profile not found']
      }
    }

    const userProfileId = profile.id

    // 2. Delete flashcards
    const { count: flashcardCount, error: flashcardError } = await supabase
      .from('flashcards')
      .delete()
      .eq('user_id', userProfileId)

    if (flashcardError) {
      errors.push(`Flashcards: ${flashcardError.message}`)
    } else {
      deletedCounts.flashcards = flashcardCount || 0
    }

    // 3. Delete documents (and associated storage files)
    const { data: documents } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('user_id', userProfileId)

    if (documents) {
      // Delete storage files
      for (const doc of documents) {
        if (doc.storage_path) {
          await supabase.storage
            .from('documents')
            .remove([doc.storage_path])
        }
      }

      // Delete document records
      const { count: docCount, error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', userProfileId)

      if (docError) {
        errors.push(`Documents: ${docError.message}`)
      } else {
        deletedCounts.documents = docCount || 0
      }
    }

    // 4. Delete podcasts
    const { count: podcastCount, error: podcastError } = await supabase
      .from('podcasts')
      .delete()
      .eq('user_id', userProfileId)

    if (podcastError) {
      errors.push(`Podcasts: ${podcastError.message}`)
    } else {
      deletedCounts.podcasts = podcastCount || 0
    }

    // 5. Delete mind maps
    const { count: mindmapCount, error: mindmapError } = await supabase
      .from('mindmaps')
      .delete()
      .eq('user_id', userProfileId)

    if (mindmapError) {
      errors.push(`Mind maps: ${mindmapError.message}`)
    } else {
      deletedCounts.mindmaps = mindmapCount || 0
    }

    // 6. Delete essays
    const { count: essayCount, error: essayError } = await supabase
      .from('essays')
      .delete()
      .eq('user_id', userProfileId)

    if (essayError) {
      errors.push(`Essays: ${essayError.message}`)
    } else {
      deletedCounts.essays = essayCount || 0
    }

    // 7. Delete chat history
    const { count: chatCount, error: chatError } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userProfileId)

    if (chatError) {
      errors.push(`Chat history: ${chatError.message}`)
    } else {
      deletedCounts.chatHistory = chatCount || 0
    }

    // 8. Delete study sessions
    const { count: sessionCount, error: sessionError } = await supabase
      .from('study_sessions')
      .delete()
      .eq('user_id', userProfileId)

    if (sessionError) {
      errors.push(`Study sessions: ${sessionError.message}`)
    } else {
      deletedCounts.studySessions = sessionCount || 0
    }

    // 9. Delete learning profile
    const { error: learningError } = await supabase
      .from('learning_profiles')
      .delete()
      .eq('user_id', userProfileId)

    if (learningError) {
      errors.push(`Learning profile: ${learningError.message}`)
    } else {
      deletedCounts.learningProfile = 1
    }

    // 10. Delete usage tracking
    const { count: usageCount, error: usageError } = await supabase
      .from('usage_tracking')
      .delete()
      .eq('user_id', clerkUserId)

    if (usageError) {
      errors.push(`Usage tracking: ${usageError.message}`)
    } else {
      deletedCounts.usageTracking = usageCount || 0
    }

    // 11. Finally, delete user profile (must be last due to foreign keys)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('clerk_user_id', clerkUserId)

    if (profileError) {
      errors.push(`User profile: ${profileError.message}`)
    } else {
      deletedCounts.userProfile = 1
    }

    logger.info('User data deletion completed', {
      clerkUserId,
      deletedCounts,
      errorCount: errors.length
    })

    return {
      success: errors.length === 0,
      deletedCounts,
      errors
    }

  } catch (error) {
    logger.error('User data deletion failed', error, { clerkUserId })
    return {
      success: false,
      deletedCounts,
      errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`]
    }
  }
}

/**
 * Export all user data (GDPR Article 20 - Right to Data Portability)
 */
export async function exportUserData(clerkUserId: string): Promise<{
  success: boolean
  data?: Record<string, any>
  error?: string
}> {
  const supabase = await createClient()

  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'User not found' }
    }

    const userProfileId = profile.id

    // Collect all user data
    const exportData: Record<string, any> = {
      profile: {
        ...profile,
        // Redact sensitive fields
        stripe_customer_id: profile.stripe_customer_id ? '[REDACTED]' : null,
        stripe_subscription_id: profile.stripe_subscription_id ? '[REDACTED]' : null,
      },
      exportedAt: new Date().toISOString(),
      dataCategories: []
    }

    // Get documents (metadata only, not content)
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, file_name, file_type, file_size, created_at, updated_at')
      .eq('user_id', userProfileId)

    if (documents) {
      exportData.documents = documents
      exportData.dataCategories.push('documents')
    }

    // Get flashcards
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id, front, back, created_at, times_reviewed, times_correct, mastery_level')
      .eq('user_id', userProfileId)

    if (flashcards) {
      exportData.flashcards = flashcards
      exportData.dataCategories.push('flashcards')
    }

    // Get study sessions
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userProfileId)

    if (sessions) {
      exportData.studySessions = sessions
      exportData.dataCategories.push('studySessions')
    }

    // Get learning profile
    const { data: learningProfile } = await supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', userProfileId)
      .single()

    if (learningProfile) {
      exportData.learningProfile = learningProfile
      exportData.dataCategories.push('learningProfile')
    }

    // Get essays
    const { data: essays } = await supabase
      .from('essays')
      .select('id, title, content, created_at, updated_at, word_count')
      .eq('user_id', userProfileId)

    if (essays) {
      exportData.essays = essays
      exportData.dataCategories.push('essays')
    }

    logger.info('User data export completed', {
      clerkUserId,
      categories: exportData.dataCategories
    })

    return { success: true, data: exportData }

  } catch (error) {
    logger.error('User data export failed', error, { clerkUserId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    }
  }
}

/**
 * Anonymize user data instead of deleting (for analytics retention)
 */
export async function anonymizeUserData(clerkUserId: string): Promise<boolean> {
  const supabase = await createClient()

  try {
    const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Update profile to anonymized state
    await supabase
      .from('user_profiles')
      .update({
        email: `${anonymousId}@deleted.local`,
        full_name: 'Deleted User',
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_tier: 'free',
        subscription_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('clerk_user_id', clerkUserId)

    logger.info('User data anonymized', { clerkUserId, anonymousId })
    return true

  } catch (error) {
    logger.error('User anonymization failed', error, { clerkUserId })
    return false
  }
}

/**
 * Check if user data should be purged (after retention period)
 */
export function shouldPurgeData(deletedAt: Date, retentionDays: number): boolean {
  const now = new Date()
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000
  return now.getTime() - deletedAt.getTime() > retentionMs
}

/**
 * Log data access for audit trail (GDPR compliance)
 */
export async function logDataAccess(
  clerkUserId: string,
  accessType: 'view' | 'export' | 'delete' | 'modify',
  dataCategory: string,
  ipAddress?: string
): Promise<void> {
  // This would typically write to an audit log table
  logger.info('Data access logged', {
    clerkUserId,
    accessType,
    dataCategory,
    ipAddress: ipAddress ? redactPII(ipAddress) : 'unknown',
    timestamp: new Date().toISOString()
  })
}
