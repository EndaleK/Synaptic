/**
 * Smart Recommendations Engine
 *
 * Provides intelligent "what to study next" recommendations based on:
 * 1. Due flashcards (SM-2 spaced repetition)
 * 2. Scheduled study plan sessions
 * 3. Weak topics needing reinforcement
 * 4. Recent document activity
 * 5. Learning style preferences
 * 6. Time of day optimization
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type RecommendationPriority = 'urgent' | 'high' | 'normal' | 'low'

export type StudyMode =
  | 'flashcards'
  | 'podcast'
  | 'mindmap'
  | 'exam'
  | 'chat'
  | 'reading'
  | 'review'
  | 'quick-summary'

export type LearningStyle =
  | 'visual'
  | 'auditory'
  | 'kinesthetic'
  | 'reading_writing'
  | 'mixed'

export interface StudyRecommendation {
  id: string
  priority: RecommendationPriority
  mode: StudyMode
  documentId?: string
  documentName?: string
  topic?: string
  reason: string
  reasonDetail?: string
  estimatedMinutes: number
  icon: string // Lucide icon name
  action: {
    label: string
    href?: string
    mode?: string // For mode switching
  }
  metadata?: {
    dueCount?: number
    sessionId?: string
    planId?: string
    masteryScore?: number
    streak?: number
  }
}

export interface RecommendationsResult {
  recommendations: StudyRecommendation[]
  stats: {
    flashcardsDue: number
    sessionsToday: number
    weakTopicsCount: number
    currentStreak: number
  }
}

// ============================================
// Learning Style Mode Priorities
// ============================================

const LEARNING_STYLE_MODE_PRIORITY: Record<LearningStyle, StudyMode[]> = {
  visual: ['mindmap', 'flashcards', 'exam', 'podcast'],
  auditory: ['podcast', 'chat', 'flashcards', 'quick-summary'],
  kinesthetic: ['exam', 'flashcards', 'chat', 'mindmap'],
  reading_writing: ['flashcards', 'chat', 'reading', 'exam'],
  mixed: ['flashcards', 'mindmap', 'podcast', 'exam'],
}

// Time-of-day mode preferences
const TIME_BASED_MODE_BOOST: Record<string, StudyMode[]> = {
  morning: ['flashcards', 'exam', 'reading'], // High focus activities
  afternoon: ['chat', 'mindmap', 'flashcards'], // Interactive activities
  evening: ['podcast', 'quick-summary', 'review'], // Lower effort activities
}

// ============================================
// Main Recommendation Function
// ============================================

export async function getStudyRecommendations(
  userId: string,
  userProfileId: string,
  options?: {
    limit?: number
    learningStyle?: LearningStyle
  }
): Promise<RecommendationsResult> {
  const supabase = await createClient()
  const limit = options?.limit ?? 5

  const recommendations: StudyRecommendation[] = []
  let flashcardsDue = 0
  let sessionsToday = 0
  let weakTopicsCount = 0
  let currentStreak = 0

  // Get current time context
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // ----------------------------------------
  // 1. Check for due flashcards (URGENT)
  // ----------------------------------------
  try {
    const { data: reviewQueue, error } = await supabase
      .from('review_queue')
      .select(
        `
        id,
        flashcard_id,
        due_date,
        ease_factor,
        interval_days,
        flashcards (
          id,
          front,
          document_id,
          documents (
            id,
            file_name
          )
        )
      `
      )
      .eq('user_id', userProfileId)
      .lte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (!error && reviewQueue) {
      flashcardsDue = reviewQueue.length

      if (flashcardsDue > 0) {
        // Group by document for better UX
        const documentGroups = new Map<
          string,
          { count: number; name: string; id: string }
        >()

        for (const item of reviewQueue) {
          const doc = (item.flashcards as any)?.documents
          if (doc) {
            const existing = documentGroups.get(doc.id) || {
              count: 0,
              name: doc.file_name,
              id: doc.id,
            }
            existing.count++
            documentGroups.set(doc.id, existing)
          }
        }

        // Add urgent recommendation for due flashcards
        recommendations.push({
          id: 'flashcards-due',
          priority: flashcardsDue > 10 ? 'urgent' : 'high',
          mode: 'flashcards',
          reason: `${flashcardsDue} flashcard${flashcardsDue > 1 ? 's' : ''} due for review`,
          reasonDetail:
            flashcardsDue > 10
              ? "Don't let your streak break! Review now to maintain retention."
              : 'Keep your memory fresh with spaced repetition.',
          estimatedMinutes: Math.min(flashcardsDue * 1.5, 30), // ~1.5 min per card, max 30
          icon: 'Zap',
          action: {
            label: 'Review Now',
            mode: 'flashcards',
          },
          metadata: {
            dueCount: flashcardsDue,
          },
        })
      }
    }
  } catch (error) {
    console.error('[SmartRecommendations] Error fetching review queue:', error)
  }

  // ----------------------------------------
  // 2. Check for scheduled study plan sessions (HIGH)
  // ----------------------------------------
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: todaySessions, error } = await supabase
      .from('study_plan_sessions')
      .select(
        `
        id,
        mode,
        topic,
        estimated_minutes,
        session_type,
        document_id,
        document_name,
        status,
        study_plans (
          id,
          title,
          exam_date
        )
      `
      )
      .eq('user_id', userProfileId)
      .eq('scheduled_date', today)
      .in('status', ['pending', 'in_progress'])
      .order('scheduled_time', { ascending: true, nullsFirst: false })

    if (!error && todaySessions) {
      sessionsToday = todaySessions.length

      for (const session of todaySessions.slice(0, 2)) {
        // Max 2 session recommendations
        const plan = session.study_plans as any
        const daysUntilExam = plan?.exam_date
          ? Math.ceil(
              (new Date(plan.exam_date).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null

        recommendations.push({
          id: `session-${session.id}`,
          priority: session.status === 'in_progress' ? 'urgent' : 'high',
          mode: session.mode as StudyMode,
          documentId: session.document_id,
          documentName: session.document_name,
          topic: session.topic,
          reason:
            session.status === 'in_progress'
              ? 'Continue your study session'
              : `Scheduled: ${session.mode} session`,
          reasonDetail: daysUntilExam
            ? `${daysUntilExam} day${daysUntilExam > 1 ? 's' : ''} until your ${plan.title} exam`
            : undefined,
          estimatedMinutes: session.estimated_minutes,
          icon: getModeIcon(session.mode as StudyMode),
          action: {
            label:
              session.status === 'in_progress' ? 'Continue' : 'Start Session',
            mode: session.mode,
          },
          metadata: {
            sessionId: session.id,
            planId: plan?.id,
          },
        })
      }
    }
  } catch (error) {
    console.error(
      '[SmartRecommendations] Error fetching study sessions:',
      error
    )
  }

  // ----------------------------------------
  // 3. Check for weak topics (HIGH)
  // ----------------------------------------
  try {
    const { data: plans, error } = await supabase
      .from('study_plans')
      .select('id, title, weak_topics, documents')
      .eq('user_id', userProfileId)
      .eq('status', 'active')

    if (!error && plans) {
      for (const plan of plans) {
        const weakTopics = (plan.weak_topics as string[]) || []
        weakTopicsCount += weakTopics.length

        if (weakTopics.length > 0) {
          const docs = (plan.documents as any[]) || []
          const firstDoc = docs[0]

          recommendations.push({
            id: `weak-${plan.id}`,
            priority: 'high',
            mode: 'flashcards', // Review weak topics with flashcards
            documentId: firstDoc?.documentId,
            documentName: firstDoc?.documentName,
            topic: weakTopics[0],
            reason: `Strengthen weak topic: ${weakTopics[0]}`,
            reasonDetail: `${weakTopics.length} topic${weakTopics.length > 1 ? 's need' : ' needs'} more practice`,
            estimatedMinutes: 15,
            icon: 'Target',
            action: {
              label: 'Practice Now',
              mode: 'flashcards',
            },
            metadata: {
              planId: plan.id,
              masteryScore: 50, // Below threshold
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('[SmartRecommendations] Error fetching weak topics:', error)
  }

  // ----------------------------------------
  // 4. Recent document activity (NORMAL)
  // ----------------------------------------
  try {
    const { data: recentDocs, error } = await supabase
      .from('documents')
      .select('id, file_name, updated_at')
      .eq('user_id', userProfileId)
      .order('updated_at', { ascending: false })
      .limit(3)

    if (!error && recentDocs && recentDocs.length > 0) {
      // Check if we already have recommendations for this document
      const existingDocIds = new Set(
        recommendations.map((r) => r.documentId).filter(Boolean)
      )

      for (const doc of recentDocs) {
        if (existingDocIds.has(doc.id)) continue

        // Get learning style preference for mode suggestion
        const learningStyle = options?.learningStyle || 'mixed'
        const preferredModes = LEARNING_STYLE_MODE_PRIORITY[learningStyle]
        const timeBoost = TIME_BASED_MODE_BOOST[timeOfDay]

        // Find best mode based on learning style + time of day
        const suggestedMode =
          preferredModes.find((m) => timeBoost.includes(m)) || preferredModes[0]

        recommendations.push({
          id: `continue-${doc.id}`,
          priority: 'normal',
          mode: suggestedMode,
          documentId: doc.id,
          documentName: doc.file_name,
          reason: `Continue with ${doc.file_name}`,
          reasonDetail: `Best for ${learningStyle} learners in the ${timeOfDay}`,
          estimatedMinutes: 20,
          icon: getModeIcon(suggestedMode),
          action: {
            label: `Open ${suggestedMode}`,
            mode: suggestedMode,
          },
        })
        break // Only add one "continue" recommendation
      }
    }
  } catch (error) {
    console.error('[SmartRecommendations] Error fetching recent docs:', error)
  }

  // ----------------------------------------
  // 5. Learning style based suggestion (NORMAL)
  // ----------------------------------------
  if (recommendations.length < limit) {
    const learningStyle = options?.learningStyle || 'mixed'
    const preferredModes = LEARNING_STYLE_MODE_PRIORITY[learningStyle]

    // Suggest the top preferred mode that isn't already recommended
    const existingModes = new Set(recommendations.map((r) => r.mode))
    const suggestedMode = preferredModes.find((m) => !existingModes.has(m))

    if (suggestedMode) {
      recommendations.push({
        id: `style-${suggestedMode}`,
        priority: 'normal',
        mode: suggestedMode,
        reason: `Recommended for ${learningStyle} learners`,
        reasonDetail: getModeDescription(suggestedMode, learningStyle),
        estimatedMinutes: 15,
        icon: getModeIcon(suggestedMode),
        action: {
          label: `Try ${formatModeName(suggestedMode)}`,
          mode: suggestedMode,
        },
      })
    }
  }

  // ----------------------------------------
  // 6. Get current streak for stats
  // ----------------------------------------
  try {
    const { data: streakData, error } = await supabase
      .from('user_profiles')
      .select('current_streak')
      .eq('id', userProfileId)
      .single()

    if (!error && streakData) {
      currentStreak = streakData.current_streak || 0
    }
  } catch (error) {
    console.error('[SmartRecommendations] Error fetching streak:', error)
  }

  // ----------------------------------------
  // Sort and limit recommendations
  // ----------------------------------------
  const priorityOrder: Record<RecommendationPriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  }

  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  )

  return {
    recommendations: recommendations.slice(0, limit),
    stats: {
      flashcardsDue,
      sessionsToday,
      weakTopicsCount,
      currentStreak,
    },
  }
}

// ============================================
// Helper Functions
// ============================================

function getModeIcon(mode: StudyMode): string {
  const icons: Record<StudyMode, string> = {
    flashcards: 'BookOpen',
    podcast: 'Mic',
    mindmap: 'Network',
    exam: 'GraduationCap',
    chat: 'MessageSquare',
    reading: 'FileText',
    review: 'RefreshCw',
    'quick-summary': 'Clock',
  }
  return icons[mode] || 'BookOpen'
}

function formatModeName(mode: StudyMode): string {
  const names: Record<StudyMode, string> = {
    flashcards: 'Flashcards',
    podcast: 'Podcast',
    mindmap: 'Mind Map',
    exam: 'Mock Exam',
    chat: 'AI Chat',
    reading: 'Reading',
    review: 'Review',
    'quick-summary': 'Quick Summary',
  }
  return names[mode] || mode
}

function getModeDescription(mode: StudyMode, learningStyle: LearningStyle): string {
  const descriptions: Record<LearningStyle, Record<StudyMode, string>> = {
    visual: {
      flashcards: 'Visual cues help cement memory',
      podcast: 'Audio reinforces visual learning',
      mindmap: 'Perfect for seeing the big picture',
      exam: 'Test your visual recall',
      chat: 'Interactive visual explanations',
      reading: 'Build detailed mental images',
      review: 'Refresh your mental maps',
      'quick-summary': 'Quick visual overview',
    },
    auditory: {
      flashcards: 'Read cards aloud for better retention',
      podcast: 'Your optimal learning channel',
      mindmap: 'Verbalize connections as you explore',
      exam: 'Hear yourself think through problems',
      chat: 'Conversational learning works best for you',
      reading: 'Try reading aloud',
      review: 'Talk through concepts',
      'quick-summary': 'Quick audio learning',
    },
    kinesthetic: {
      flashcards: 'Active recall through interaction',
      podcast: 'Learn while moving',
      mindmap: 'Build maps hands-on',
      exam: 'Apply knowledge practically',
      chat: 'Interactive problem-solving',
      reading: 'Take notes as you read',
      review: 'Practice makes perfect',
      'quick-summary': 'Quick active learning',
    },
    reading_writing: {
      flashcards: 'Written format suits your style',
      podcast: 'Take notes while listening',
      mindmap: 'Outline structure appeals to you',
      exam: 'Written responses strengthen memory',
      chat: 'Detailed written explanations',
      reading: 'Your comfort zone',
      review: 'Re-read and annotate',
      'quick-summary': 'Condensed written form',
    },
    mixed: {
      flashcards: 'Versatile learning tool',
      podcast: 'Learn on the go',
      mindmap: 'Visual organization',
      exam: 'Test your knowledge',
      chat: 'Interactive learning',
      reading: 'Deep dive into content',
      review: 'Reinforce learning',
      'quick-summary': 'Quick overview',
    },
  }
  return descriptions[learningStyle]?.[mode] || 'Great for learning'
}

// ============================================
// Utility: Get next recommended activity
// ============================================

export async function getNextRecommendedActivity(
  userId: string,
  userProfileId: string,
  learningStyle?: LearningStyle
): Promise<StudyRecommendation | null> {
  const result = await getStudyRecommendations(userId, userProfileId, {
    limit: 1,
    learningStyle,
  })
  return result.recommendations[0] || null
}
