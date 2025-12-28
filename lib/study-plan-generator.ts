/**
 * Study Plan Generator
 *
 * Creates intelligent study schedules based on:
 * - Exam date and available time
 * - Document complexity and topic analysis
 * - Spaced repetition principles (SM-2 inspired)
 * - Learning style preferences
 * - User's daily study capacity
 *
 * Key algorithm features:
 * - Distributes study hours evenly across available days
 * - Schedules harder topics earlier with more review cycles
 * - Interleaves topics for better retention
 * - Reserves final review days before exam
 * - Respects user's preferred study modes
 */

import { createClient } from '@/lib/supabase/server'
import { getDocumentAnalysis, type DocumentAnalysis, type DocumentTopic } from '@/lib/document-analyzer'

// ============================================
// Types
// ============================================

export type StudyMode = 'flashcards' | 'podcast' | 'mindmap' | 'exam' | 'reading' | 'review' | 'chat'
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
export type SessionType = 'new' | 'review' | 'weak_topic' | 'final_review'
export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'abandoned'

export interface StudyPlanDocument {
  documentId: string
  documentName: string
  estimatedHours: number
  priority: number // 1 = highest
  topics: DocumentTopic[]
  analysis?: DocumentAnalysis
}

export interface StudyPlanSession {
  id?: string
  planId?: string
  userId: string
  scheduledDate: Date
  scheduledTime?: string
  estimatedMinutes: number
  mode: StudyMode
  topic?: string
  documentId?: string
  documentName?: string
  sessionType: SessionType
  reviewNumber: number
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled'
}

export interface StudyPlan {
  id?: string
  userId: string
  title: string
  description?: string
  examEventId?: string
  examDate: Date
  examTitle?: string
  documents: StudyPlanDocument[]
  status: PlanStatus
  totalEstimatedHours: number
  hoursCompleted: number
  dailyTargetHours: number
  startDate: Date
  learningStyle: LearningStyle
  modePriorities: Record<StudyMode, number>
  masteryThreshold: number
  weakTopics: string[]
  sessionsCompleted: number
  sessionsTotal: number
  sessions: StudyPlanSession[]
}

export interface GeneratePlanOptions {
  examDate: Date
  examTitle?: string
  examEventId?: string
  documentIds: string[]
  learningStyle?: LearningStyle
  dailyTargetHours?: number
  startDate?: Date
  includeWeekends?: boolean
  masteryThreshold?: number
  priorityModes?: StudyMode[]
}

// ============================================
// Spaced Repetition Intervals
// ============================================

/**
 * Review intervals based on topic difficulty.
 * Harder topics get more frequent reviews.
 */
const REVIEW_INTERVALS: Record<'easy' | 'medium' | 'hard', number[]> = {
  easy: [1, 4, 9], // Review at day 1, 4, 9 after initial learning
  medium: [1, 3, 6, 10], // More frequent reviews
  hard: [1, 2, 4, 7, 11], // Most frequent reviews
}

/**
 * Mode priorities by learning style.
 * Lower number = higher priority.
 */
const LEARNING_STYLE_MODE_PRIORITIES: Record<LearningStyle, Record<StudyMode, number>> = {
  visual: { mindmap: 1, flashcards: 2, exam: 3, reading: 4, podcast: 5, review: 6, chat: 7 },
  auditory: { podcast: 1, chat: 2, flashcards: 3, reading: 4, mindmap: 5, exam: 6, review: 7 },
  kinesthetic: { exam: 1, flashcards: 2, chat: 3, mindmap: 4, reading: 5, podcast: 6, review: 7 },
  reading_writing: { flashcards: 1, reading: 2, chat: 3, exam: 4, mindmap: 5, podcast: 6, review: 7 },
  mixed: { flashcards: 1, mindmap: 2, podcast: 3, exam: 4, reading: 5, chat: 6, review: 7 },
}

/**
 * Estimated minutes per mode for a topic.
 */
const MODE_DURATION_MINUTES: Record<StudyMode, number> = {
  flashcards: 15,
  podcast: 20,
  mindmap: 10,
  exam: 25,
  reading: 30,
  review: 10,
  chat: 15,
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate the number of available study days between two dates.
 */
function getAvailableDays(startDate: Date, endDate: Date, includeWeekends: boolean): Date[] {
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
 * Distribute topics across available days with spaced repetition.
 */
function distributeTopicsWithSpacing(
  topics: Array<{ topic: DocumentTopic; documentId: string; documentName: string }>,
  availableDays: Date[],
  learningStyle: LearningStyle,
  dailyTargetMinutes: number
): StudyPlanSession[] {
  const sessions: StudyPlanSession[] = []
  const modePriorities = LEARNING_STYLE_MODE_PRIORITIES[learningStyle]

  // Sort topics by difficulty (harder first) and estimated time
  const sortedTopics = [...topics].sort((a, b) => {
    const difficultyOrder = { hard: 0, medium: 1, easy: 2 }
    const aDiff = difficultyOrder[a.topic.difficulty] ?? 1
    const bDiff = difficultyOrder[b.topic.difficulty] ?? 1
    if (aDiff !== bDiff) return aDiff - bDiff
    return b.topic.estimatedMinutes - a.topic.estimatedMinutes
  })

  // Track minutes used per day
  const dayMinutes: Map<string, number> = new Map()
  const getDateKey = (d: Date) => d.toISOString().split('T')[0]

  // Initialize day tracking
  for (const day of availableDays) {
    dayMinutes.set(getDateKey(day), 0)
  }

  // Reserve last 2 days for final review
  const reviewDays = availableDays.slice(-2)
  const learningDays = availableDays.slice(0, -2)

  if (learningDays.length === 0) {
    // If less than 3 days, use all days for learning
    learningDays.push(...availableDays)
    reviewDays.length = 0
  }

  // Schedule initial learning sessions
  let dayIndex = 0
  for (const { topic, documentId, documentName } of sortedTopics) {
    if (dayIndex >= learningDays.length) {
      dayIndex = 0 // Wrap around if more topics than days
    }

    const day = learningDays[dayIndex]
    const dateKey = getDateKey(day)
    const currentMinutes = dayMinutes.get(dateKey) || 0

    // Check if we have room for this topic
    if (currentMinutes + topic.estimatedMinutes > dailyTargetMinutes && dayIndex < learningDays.length - 1) {
      // Try next day
      dayIndex++
      continue
    }

    // Select primary mode based on learning style and content type
    const primaryMode = selectModeForTopic(topic, modePriorities)

    // Create initial learning session
    sessions.push({
      userId: '', // Will be set when saving
      scheduledDate: new Date(day),
      estimatedMinutes: topic.estimatedMinutes || MODE_DURATION_MINUTES[primaryMode],
      mode: primaryMode,
      topic: topic.title,
      documentId,
      documentName,
      sessionType: 'new',
      reviewNumber: 1,
      status: 'pending',
    })

    dayMinutes.set(dateKey, currentMinutes + topic.estimatedMinutes)

    // Schedule review sessions based on difficulty
    const intervals = REVIEW_INTERVALS[topic.difficulty] || REVIEW_INTERVALS.medium
    for (let i = 0; i < intervals.length; i++) {
      const reviewDayIndex = dayIndex + intervals[i]
      if (reviewDayIndex < learningDays.length) {
        const reviewDay = learningDays[reviewDayIndex]
        const reviewDateKey = getDateKey(reviewDay)
        const reviewMinutes = dayMinutes.get(reviewDateKey) || 0

        if (reviewMinutes + MODE_DURATION_MINUTES.review <= dailyTargetMinutes * 1.5) {
          sessions.push({
            userId: '',
            scheduledDate: new Date(reviewDay),
            estimatedMinutes: MODE_DURATION_MINUTES.review,
            mode: 'flashcards', // Reviews primarily use flashcards
            topic: topic.title,
            documentId,
            documentName,
            sessionType: 'review',
            reviewNumber: i + 2,
            status: 'pending',
          })

          dayMinutes.set(reviewDateKey, reviewMinutes + MODE_DURATION_MINUTES.review)
        }
      }
    }

    dayIndex++
  }

  // Schedule final review sessions
  for (const reviewDay of reviewDays) {
    for (const { topic, documentId, documentName } of sortedTopics.slice(0, 5)) {
      // Focus on top 5 most important topics
      sessions.push({
        userId: '',
        scheduledDate: new Date(reviewDay),
        estimatedMinutes: MODE_DURATION_MINUTES.review,
        mode: 'flashcards',
        topic: topic.title,
        documentId,
        documentName,
        sessionType: 'final_review',
        reviewNumber: 99, // Final review marker
        status: 'pending',
      })
    }
  }

  return sessions
}

/**
 * Select the best study mode for a topic based on content type and learning style.
 */
function selectModeForTopic(
  topic: DocumentTopic,
  modePriorities: Record<StudyMode, number>
): StudyMode {
  // Map content types to preferred modes
  const contentModeMap: Record<string, StudyMode[]> = {
    concepts: ['mindmap', 'flashcards', 'podcast'],
    procedures: ['exam', 'flashcards', 'chat'],
    facts: ['flashcards', 'reading', 'podcast'],
    formulas: ['exam', 'flashcards', 'chat'],
  }

  const preferredModes = contentModeMap[topic.contentType] || ['flashcards']

  // Find the highest priority mode from preferred modes
  let bestMode: StudyMode = 'flashcards'
  let bestPriority = Infinity

  for (const mode of preferredModes) {
    const priority = modePriorities[mode] || 99
    if (priority < bestPriority) {
      bestPriority = priority
      bestMode = mode
    }
  }

  return bestMode
}

// ============================================
// Main Generator Function
// ============================================

/**
 * Generate a comprehensive study plan.
 */
export async function generateStudyPlan(
  userId: string,
  options: GeneratePlanOptions
): Promise<StudyPlan> {
  const supabase = await createClient()

  const {
    examDate,
    examTitle,
    examEventId,
    documentIds,
    learningStyle = 'mixed',
    dailyTargetHours = 2,
    startDate = new Date(),
    includeWeekends = true,
    masteryThreshold = 80,
    priorityModes,
  } = options

  // 1. Fetch document analyses
  const documents: StudyPlanDocument[] = []
  let totalEstimatedHours = 0

  for (let i = 0; i < documentIds.length; i++) {
    const docId = documentIds[i]

    // Get document info
    const { data: doc } = await supabase
      .from('documents')
      .select('id, file_name')
      .eq('id', docId)
      .single()

    if (!doc) continue

    // Get analysis
    const analysis = await getDocumentAnalysis(docId)

    const docEstimatedHours = analysis?.estimatedStudyHours || 2

    documents.push({
      documentId: docId,
      documentName: doc.file_name,
      estimatedHours: docEstimatedHours,
      priority: i + 1,
      topics: analysis?.topics || [],
      analysis: analysis || undefined,
    })

    totalEstimatedHours += docEstimatedHours
  }

  // 2. Calculate available days
  const availableDays = getAvailableDays(startDate, examDate, includeWeekends)

  if (availableDays.length === 0) {
    throw new Error('No available study days between start date and exam date')
  }

  // 3. Flatten all topics across documents
  const allTopics = documents.flatMap((doc) =>
    doc.topics.map((topic) => ({
      topic,
      documentId: doc.documentId,
      documentName: doc.documentName,
    }))
  )

  // 4. Generate sessions with spaced repetition
  const dailyTargetMinutes = dailyTargetHours * 60
  const sessions = distributeTopicsWithSpacing(
    allTopics,
    availableDays,
    learningStyle,
    dailyTargetMinutes
  )

  // Set userId on all sessions
  for (const session of sessions) {
    session.userId = userId
  }

  // 5. Calculate mode priorities
  const modePriorities = priorityModes
    ? Object.fromEntries(priorityModes.map((m, i) => [m, i + 1])) as Record<StudyMode, number>
    : LEARNING_STYLE_MODE_PRIORITIES[learningStyle]

  // 6. Build study plan
  const plan: StudyPlan = {
    userId,
    title: examTitle || `Study Plan for ${new Date(examDate).toLocaleDateString()}`,
    description: `Comprehensive study plan covering ${documents.length} document(s) with ${sessions.length} scheduled sessions.`,
    examEventId,
    examDate: new Date(examDate),
    examTitle,
    documents,
    status: 'draft',
    totalEstimatedHours,
    hoursCompleted: 0,
    dailyTargetHours,
    startDate: new Date(startDate),
    learningStyle,
    modePriorities,
    masteryThreshold,
    weakTopics: [],
    sessionsCompleted: 0,
    sessionsTotal: sessions.length,
    sessions,
  }

  return plan
}

/**
 * Save a generated study plan to the database.
 */
export async function saveStudyPlan(plan: StudyPlan): Promise<StudyPlan> {
  const supabase = await createClient()

  // 1. Insert study plan
  const { data: savedPlan, error: planError } = await supabase
    .from('study_plans')
    .insert({
      user_id: plan.userId,
      title: plan.title,
      description: plan.description,
      exam_event_id: plan.examEventId,
      exam_date: plan.examDate.toISOString().split('T')[0],
      exam_title: plan.examTitle,
      documents: plan.documents.map((d) => ({
        documentId: d.documentId,
        documentName: d.documentName,
        estimatedHours: d.estimatedHours,
        priority: d.priority,
        topics: d.topics,
      })),
      status: 'active',
      total_estimated_hours: plan.totalEstimatedHours,
      hours_completed: 0,
      daily_target_hours: plan.dailyTargetHours,
      start_date: plan.startDate.toISOString().split('T')[0],
      learning_style: plan.learningStyle,
      mode_priorities: plan.modePriorities,
      mastery_threshold: plan.masteryThreshold,
      weak_topics: [],
      sessions_completed: 0,
      sessions_total: plan.sessions.length,
    })
    .select()
    .single()

  if (planError || !savedPlan) {
    console.error('[StudyPlanGenerator] Error saving plan:', planError)
    throw new Error('Failed to save study plan')
  }

  plan.id = savedPlan.id
  plan.status = 'active'

  // 2. Insert sessions
  const sessionsToInsert = plan.sessions.map((session) => ({
    plan_id: savedPlan.id,
    user_id: session.userId,
    scheduled_date: session.scheduledDate.toISOString().split('T')[0],
    scheduled_time: session.scheduledTime,
    estimated_minutes: session.estimatedMinutes,
    mode: session.mode,
    topic: session.topic,
    document_id: session.documentId,
    document_name: session.documentName,
    session_type: session.sessionType,
    review_number: session.reviewNumber,
    status: 'pending',
  }))

  if (sessionsToInsert.length > 0) {
    const { error: sessionsError } = await supabase
      .from('study_plan_sessions')
      .insert(sessionsToInsert)

    if (sessionsError) {
      console.error('[StudyPlanGenerator] Error saving sessions:', sessionsError)
      // Don't fail the whole operation, plan is still created
    }
  }

  // 3. Link exam event to plan if provided
  if (plan.examEventId) {
    await supabase
      .from('study_schedule')
      .update({ linked_plan_id: savedPlan.id })
      .eq('id', plan.examEventId)
  }

  console.log(
    `[StudyPlanGenerator] Plan saved: ${savedPlan.id} with ${sessionsToInsert.length} sessions`
  )

  return plan
}

/**
 * Get a study plan by ID.
 */
export async function getStudyPlan(planId: string, userId: string): Promise<StudyPlan | null> {
  const supabase = await createClient()

  // Get plan
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single()

  if (planError || !plan) {
    return null
  }

  // Get sessions
  const { data: sessions } = await supabase
    .from('study_plan_sessions')
    .select('*')
    .eq('plan_id', planId)
    .order('scheduled_date', { ascending: true })

  return {
    id: plan.id,
    userId: plan.user_id,
    title: plan.title,
    description: plan.description,
    examEventId: plan.exam_event_id,
    examDate: new Date(plan.exam_date),
    examTitle: plan.exam_title,
    documents: plan.documents as StudyPlanDocument[],
    status: plan.status as PlanStatus,
    totalEstimatedHours: plan.total_estimated_hours,
    hoursCompleted: plan.hours_completed,
    dailyTargetHours: plan.daily_target_hours,
    startDate: new Date(plan.start_date || plan.created_at),
    learningStyle: plan.learning_style as LearningStyle,
    modePriorities: plan.mode_priorities as Record<StudyMode, number>,
    masteryThreshold: plan.mastery_threshold,
    weakTopics: plan.weak_topics as string[],
    sessionsCompleted: plan.sessions_completed,
    sessionsTotal: plan.sessions_total,
    sessions: (sessions || []).map((s) => ({
      id: s.id,
      planId: s.plan_id,
      userId: s.user_id,
      scheduledDate: new Date(s.scheduled_date),
      scheduledTime: s.scheduled_time,
      estimatedMinutes: s.estimated_minutes,
      mode: s.mode as StudyMode,
      topic: s.topic,
      documentId: s.document_id,
      documentName: s.document_name,
      sessionType: s.session_type as SessionType,
      reviewNumber: s.review_number,
      status: s.status,
    })),
  }
}

/**
 * Get user's active study plans.
 */
export async function getUserStudyPlans(userId: string): Promise<StudyPlan[]> {
  const supabase = await createClient()

  const { data: plans, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])
    .order('exam_date', { ascending: true })

  if (error || !plans) {
    return []
  }

  return plans.map((plan) => ({
    id: plan.id,
    userId: plan.user_id,
    title: plan.title,
    description: plan.description,
    examEventId: plan.exam_event_id,
    examDate: new Date(plan.exam_date),
    examTitle: plan.exam_title,
    documents: plan.documents as StudyPlanDocument[],
    status: plan.status as PlanStatus,
    totalEstimatedHours: plan.total_estimated_hours,
    hoursCompleted: plan.hours_completed,
    dailyTargetHours: plan.daily_target_hours,
    startDate: new Date(plan.start_date || plan.created_at),
    learningStyle: plan.learning_style as LearningStyle,
    modePriorities: plan.mode_priorities as Record<StudyMode, number>,
    masteryThreshold: plan.mastery_threshold,
    weakTopics: plan.weak_topics as string[],
    sessionsCompleted: plan.sessions_completed,
    sessionsTotal: plan.sessions_total,
    sessions: [], // Sessions not loaded in list view
  }))
}

/**
 * Update study plan status.
 */
export async function updatePlanStatus(
  planId: string,
  userId: string,
  status: PlanStatus
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('study_plans')
    .update({ status })
    .eq('id', planId)
    .eq('user_id', userId)

  return !error
}

/**
 * Complete a study session and update plan progress.
 */
export async function completeSession(
  sessionId: string,
  userId: string,
  performanceScore?: number,
  actualMinutes?: number
): Promise<boolean> {
  const supabase = await createClient()

  // 1. Update session
  const { data: session, error: sessionError } = await supabase
    .from('study_plan_sessions')
    .update({
      status: 'completed',
      performance_score: performanceScore,
      actual_minutes: actualMinutes,
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('plan_id, estimated_minutes')
    .single()

  if (sessionError || !session) {
    return false
  }

  // 2. Update plan progress
  const hoursCompleted = (actualMinutes || session.estimated_minutes) / 60

  await supabase.rpc('increment_plan_progress', {
    p_plan_id: session.plan_id,
    p_hours: hoursCompleted,
  })

  // If RPC doesn't exist, fallback to manual update
  const { data: plan } = await supabase
    .from('study_plans')
    .select('sessions_completed, hours_completed')
    .eq('id', session.plan_id)
    .single()

  if (plan) {
    await supabase
      .from('study_plans')
      .update({
        sessions_completed: (plan.sessions_completed || 0) + 1,
        hours_completed: (plan.hours_completed || 0) + hoursCompleted,
      })
      .eq('id', session.plan_id)
  }

  return true
}

/**
 * Get today's scheduled sessions for a user.
 */
export async function getTodaysSessions(userId: string): Promise<StudyPlanSession[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: sessions, error } = await supabase
    .from('study_plan_sessions')
    .select(`
      *,
      study_plans (
        id,
        title,
        exam_date
      )
    `)
    .eq('user_id', userId)
    .eq('scheduled_date', today)
    .in('status', ['pending', 'in_progress'])
    .order('scheduled_time', { ascending: true, nullsFirst: true })

  if (error || !sessions) {
    return []
  }

  return sessions.map((s) => ({
    id: s.id,
    planId: s.plan_id,
    userId: s.user_id,
    scheduledDate: new Date(s.scheduled_date),
    scheduledTime: s.scheduled_time,
    estimatedMinutes: s.estimated_minutes,
    mode: s.mode as StudyMode,
    topic: s.topic,
    documentId: s.document_id,
    documentName: s.document_name,
    sessionType: s.session_type as SessionType,
    reviewNumber: s.review_number,
    status: s.status,
  }))
}
