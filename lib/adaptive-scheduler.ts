/**
 * Adaptive Scheduler
 *
 * Dynamically adjusts study plans based on user performance and progress.
 * Key features:
 * - Detects weak topics from flashcard accuracy and exam scores
 * - Reschedules missed sessions intelligently
 * - Adds extra review sessions for struggling topics
 * - Adjusts difficulty progression based on mastery
 * - Respects daily study limits
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type StudyMode = 'flashcards' | 'podcast' | 'mindmap' | 'exam' | 'reading' | 'review' | 'chat'

export interface TopicMastery {
  topic: string
  documentId?: string
  documentName?: string
  flashcardAccuracy: number // 0-100
  examScore: number | null // 0-100
  timeSpentMinutes: number
  lastReviewedAt: Date | null
  reviewCount: number
  masteryLevel: 'weak' | 'learning' | 'mastered'
}

export interface PlanProgress {
  planId: string
  planTitle: string
  examDate: Date
  daysRemaining: number
  totalSessions: number
  completedSessions: number
  skippedSessions: number
  completionRate: number
  averagePerformance: number // 0-100
  behindSchedule: boolean
  weakTopics: TopicMastery[]
  strongTopics: TopicMastery[]
  hoursRemaining: number
  hoursCompleted: number
}

export interface RescheduleResult {
  success: boolean
  sessionsAdded: number
  sessionsRescheduled: number
  newWeakTopicSessions: number
  message: string
}

export interface SessionAdjustment {
  sessionId: string
  action: 'reschedule' | 'skip' | 'extend' | 'add_review'
  newDate?: string
  newEstimatedMinutes?: number
  reason: string
}

// ============================================
// Constants
// ============================================

const MASTERY_THRESHOLD = {
  WEAK: 50,      // Below this = weak topic
  LEARNING: 75,  // Below this = still learning
  MASTERED: 85,  // Above this = mastered
}

const MAX_DAILY_HOURS = 4 // Maximum study hours per day

// ============================================
// Core Functions
// ============================================

/**
 * Evaluate overall progress for a study plan
 */
export async function evaluatePlanProgress(
  planId: string,
  userId: string
): Promise<PlanProgress | null> {
  const supabase = await createClient()

  // Get plan details
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single()

  if (planError || !plan) {
    console.error('[AdaptiveScheduler] Failed to fetch plan:', planError)
    return null
  }

  // Get all sessions for this plan
  const { data: sessions, error: sessionsError } = await supabase
    .from('study_plan_sessions')
    .select('*')
    .eq('plan_id', planId)
    .order('scheduled_date', { ascending: true })

  if (sessionsError) {
    console.error('[AdaptiveScheduler] Failed to fetch sessions:', sessionsError)
    return null
  }

  const allSessions = sessions || []
  const completedSessions = allSessions.filter(s => s.status === 'completed')
  const skippedSessions = allSessions.filter(s => s.status === 'skipped')
  const pendingSessions = allSessions.filter(s => s.status === 'pending' || s.status === 'in_progress')

  // Calculate days remaining
  const examDate = new Date(plan.exam_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysRemaining = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  // Calculate performance
  const performanceScores = completedSessions
    .filter(s => s.performance_score !== null)
    .map(s => s.performance_score)
  const averagePerformance = performanceScores.length > 0
    ? Math.round(performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length)
    : 0

  // Calculate completion rate
  const totalSessions = allSessions.length
  const completionRate = totalSessions > 0
    ? Math.round((completedSessions.length / totalSessions) * 100)
    : 0

  // Calculate hours
  const hoursCompleted = completedSessions.reduce((sum, s) => sum + (s.actual_minutes || s.estimated_minutes || 0), 0) / 60
  const hoursRemaining = pendingSessions.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0) / 60

  // Check if behind schedule
  const expectedCompletionRate = calculateExpectedProgress(plan.created_at, plan.exam_date)
  const behindSchedule = completionRate < expectedCompletionRate - 10 // 10% tolerance

  // Get topic mastery data
  const topicMastery = await getTopicMastery(userId, plan.documents as any[])

  const weakTopics = topicMastery.filter(t => t.masteryLevel === 'weak')
  const strongTopics = topicMastery.filter(t => t.masteryLevel === 'mastered')

  return {
    planId,
    planTitle: plan.title,
    examDate,
    daysRemaining,
    totalSessions,
    completedSessions: completedSessions.length,
    skippedSessions: skippedSessions.length,
    completionRate,
    averagePerformance,
    behindSchedule,
    weakTopics,
    strongTopics,
    hoursRemaining,
    hoursCompleted,
  }
}

/**
 * Get topic mastery across flashcards and exams
 */
async function getTopicMastery(
  userId: string,
  documents: Array<{ documentId: string; documentName: string }>
): Promise<TopicMastery[]> {
  const supabase = await createClient()
  const topicMastery: TopicMastery[] = []

  for (const doc of documents || []) {
    // Get flashcard performance for this document
    const { data: flashcards, error: fcError } = await supabase
      .from('flashcards')
      .select('topic, times_reviewed, times_correct, last_reviewed_at')
      .eq('document_id', doc.documentId)
      .eq('user_id', userId)

    if (fcError) {
      console.error('[AdaptiveScheduler] Failed to fetch flashcards:', fcError)
      continue
    }

    // Group by topic
    const topicStats = new Map<string, {
      totalReviewed: number
      totalCorrect: number
      lastReviewed: Date | null
      count: number
    }>()

    for (const fc of flashcards || []) {
      const topic = fc.topic || 'General'
      const existing = topicStats.get(topic) || {
        totalReviewed: 0,
        totalCorrect: 0,
        lastReviewed: null,
        count: 0,
      }

      existing.totalReviewed += fc.times_reviewed || 0
      existing.totalCorrect += fc.times_correct || 0
      existing.count++

      if (fc.last_reviewed_at) {
        const reviewDate = new Date(fc.last_reviewed_at)
        if (!existing.lastReviewed || reviewDate > existing.lastReviewed) {
          existing.lastReviewed = reviewDate
        }
      }

      topicStats.set(topic, existing)
    }

    // Convert to TopicMastery objects
    for (const [topic, stats] of topicStats) {
      const accuracy = stats.totalReviewed > 0
        ? Math.round((stats.totalCorrect / stats.totalReviewed) * 100)
        : 0

      let masteryLevel: TopicMastery['masteryLevel'] = 'learning'
      if (accuracy < MASTERY_THRESHOLD.WEAK) {
        masteryLevel = 'weak'
      } else if (accuracy >= MASTERY_THRESHOLD.MASTERED && stats.totalReviewed >= 5) {
        masteryLevel = 'mastered'
      }

      topicMastery.push({
        topic,
        documentId: doc.documentId,
        documentName: doc.documentName,
        flashcardAccuracy: accuracy,
        examScore: null, // TODO: Get from mock exams
        timeSpentMinutes: stats.totalReviewed * 1.5, // Approximate
        lastReviewedAt: stats.lastReviewed,
        reviewCount: stats.totalReviewed,
        masteryLevel,
      })
    }
  }

  return topicMastery.sort((a, b) => a.flashcardAccuracy - b.flashcardAccuracy)
}

/**
 * Calculate expected progress percentage based on time elapsed
 */
function calculateExpectedProgress(startDate: string, examDate: string): number {
  const start = new Date(startDate)
  const exam = new Date(examDate)
  const today = new Date()

  const totalDays = (exam.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

  if (totalDays <= 0) return 100

  return Math.min(100, Math.round((elapsedDays / totalDays) * 100))
}

/**
 * Reschedule weak topics with additional review sessions
 */
export async function rescheduleWeakTopics(
  planId: string,
  userId: string
): Promise<RescheduleResult> {
  const supabase = await createClient()

  // Get plan progress
  const progress = await evaluatePlanProgress(planId, userId)
  if (!progress) {
    return {
      success: false,
      sessionsAdded: 0,
      sessionsRescheduled: 0,
      newWeakTopicSessions: 0,
      message: 'Failed to evaluate plan progress',
    }
  }

  if (progress.weakTopics.length === 0) {
    return {
      success: true,
      sessionsAdded: 0,
      sessionsRescheduled: 0,
      newWeakTopicSessions: 0,
      message: 'No weak topics found - great progress!',
    }
  }

  // Get available days before exam
  const availableDays = getAvailableDays(new Date(), progress.examDate)
  if (availableDays.length === 0) {
    return {
      success: false,
      sessionsAdded: 0,
      sessionsRescheduled: 0,
      newWeakTopicSessions: 0,
      message: 'No available days before exam',
    }
  }

  // Calculate existing sessions per day
  const { data: existingSessions } = await supabase
    .from('study_plan_sessions')
    .select('scheduled_date, estimated_minutes')
    .eq('plan_id', planId)
    .eq('status', 'pending')

  const dailyMinutes = new Map<string, number>()
  for (const session of existingSessions || []) {
    const dateKey = session.scheduled_date
    dailyMinutes.set(dateKey, (dailyMinutes.get(dateKey) || 0) + session.estimated_minutes)
  }

  // Add review sessions for weak topics
  const newSessions: any[] = []
  let sessionIndex = 0

  for (const weakTopic of progress.weakTopics.slice(0, 5)) { // Max 5 weak topics
    // Find a day with available capacity
    for (const day of availableDays) {
      const dateKey = day.toISOString().split('T')[0]
      const currentMinutes = dailyMinutes.get(dateKey) || 0

      if (currentMinutes < MAX_DAILY_HOURS * 60) {
        // Add flashcard review session
        newSessions.push({
          plan_id: planId,
          user_id: userId,
          scheduled_date: dateKey,
          estimated_minutes: 20,
          mode: 'flashcards',
          topic: weakTopic.topic,
          document_id: weakTopic.documentId,
          document_name: weakTopic.documentName,
          session_type: 'weak_topic',
          status: 'pending',
        })

        dailyMinutes.set(dateKey, currentMinutes + 20)
        sessionIndex++
        break
      }
    }
  }

  // Insert new sessions
  if (newSessions.length > 0) {
    const { error: insertError } = await supabase
      .from('study_plan_sessions')
      .insert(newSessions)

    if (insertError) {
      console.error('[AdaptiveScheduler] Failed to insert sessions:', insertError)
      return {
        success: false,
        sessionsAdded: 0,
        sessionsRescheduled: 0,
        newWeakTopicSessions: 0,
        message: 'Failed to add review sessions',
      }
    }

    // Update plan weak_topics
    const { error: updateError } = await supabase
      .from('study_plans')
      .update({
        weak_topics: progress.weakTopics.map(t => t.topic),
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)

    if (updateError) {
      console.error('[AdaptiveScheduler] Failed to update plan:', updateError)
    }
  }

  return {
    success: true,
    sessionsAdded: newSessions.length,
    sessionsRescheduled: 0,
    newWeakTopicSessions: newSessions.length,
    message: `Added ${newSessions.length} review session${newSessions.length !== 1 ? 's' : ''} for weak topics`,
  }
}

/**
 * Handle a missed session by rescheduling or marking as skipped
 */
export async function handleMissedSession(
  sessionId: string,
  userId: string,
  action: 'reschedule' | 'skip'
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('study_plan_sessions')
    .select('*, study_plans(*)')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    return { success: false, message: 'Session not found' }
  }

  if (action === 'skip') {
    // Mark as skipped
    const { error: updateError } = await supabase
      .from('study_plan_sessions')
      .update({ status: 'skipped' })
      .eq('id', sessionId)

    if (updateError) {
      return { success: false, message: 'Failed to skip session' }
    }

    return { success: true, message: 'Session skipped' }
  }

  // Reschedule to next available day
  const plan = session.study_plans as any
  const examDate = new Date(plan.exam_date)
  const today = new Date()
  today.setDate(today.getDate() + 1) // Start from tomorrow

  const availableDays = getAvailableDays(today, examDate)
  if (availableDays.length === 0) {
    return { success: false, message: 'No available days to reschedule' }
  }

  const newDate = availableDays[0].toISOString().split('T')[0]

  const { error: updateError } = await supabase
    .from('study_plan_sessions')
    .update({
      scheduled_date: newDate,
      status: 'pending',
    })
    .eq('id', sessionId)

  if (updateError) {
    return { success: false, message: 'Failed to reschedule session' }
  }

  return {
    success: true,
    message: `Session rescheduled to ${new Date(newDate).toLocaleDateString()}`,
  }
}

/**
 * Adapt plan based on current progress
 */
export async function adaptPlan(
  planId: string,
  userId: string
): Promise<RescheduleResult> {
  // First, evaluate progress
  const progress = await evaluatePlanProgress(planId, userId)
  if (!progress) {
    return {
      success: false,
      sessionsAdded: 0,
      sessionsRescheduled: 0,
      newWeakTopicSessions: 0,
      message: 'Failed to evaluate plan',
    }
  }

  // If behind schedule, add more sessions
  if (progress.behindSchedule) {
    return await rescheduleWeakTopics(planId, userId)
  }

  // If weak topics exist, add review sessions
  if (progress.weakTopics.length > 0) {
    return await rescheduleWeakTopics(planId, userId)
  }

  return {
    success: true,
    sessionsAdded: 0,
    sessionsRescheduled: 0,
    newWeakTopicSessions: 0,
    message: 'Plan is on track - no adjustments needed',
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get available study days between two dates (excluding today)
 */
function getAvailableDays(startDate: Date, endDate: Date, includeWeekends = true): Date[] {
  const days: Date[] = []
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current < end) {
    const dayOfWeek = current.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (includeWeekends || !isWeekend) {
      days.push(new Date(current))
    }

    current.setDate(current.getDate() + 1)
  }

  return days
}

/**
 * Get study buddy context for current plan status
 */
export async function getStudyBuddyPlanContext(
  userId: string,
  userProfileId: string
): Promise<string | null> {
  const supabase = await createClient()

  // Get active plans
  const { data: plans, error } = await supabase
    .from('study_plans')
    .select('id, title, exam_date, status')
    .eq('user_id', userProfileId)
    .eq('status', 'active')
    .order('exam_date', { ascending: true })
    .limit(1)

  if (error || !plans || plans.length === 0) {
    return null
  }

  const plan = plans[0]
  const progress = await evaluatePlanProgress(plan.id, userProfileId)

  if (!progress) {
    return null
  }

  // Build context string
  const contextParts: string[] = [
    `The student has an active study plan: "${progress.planTitle}"`,
    `Exam date: ${progress.examDate.toLocaleDateString()} (${progress.daysRemaining} days remaining)`,
    `Progress: ${progress.completedSessions}/${progress.totalSessions} sessions completed (${progress.completionRate}%)`,
  ]

  if (progress.behindSchedule) {
    contextParts.push('The student is behind schedule and may need encouragement.')
  }

  if (progress.weakTopics.length > 0) {
    const weakTopicNames = progress.weakTopics.slice(0, 3).map(t => t.topic).join(', ')
    contextParts.push(`Weak topics that need attention: ${weakTopicNames}`)
  }

  if (progress.strongTopics.length > 0) {
    const strongTopicNames = progress.strongTopics.slice(0, 2).map(t => t.topic).join(', ')
    contextParts.push(`Topics the student has mastered: ${strongTopicNames}`)
  }

  return contextParts.join('\n')
}
