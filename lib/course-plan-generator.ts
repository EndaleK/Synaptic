/**
 * Course Plan Generator
 *
 * Converts course syllabi into study plan sessions.
 * Works with both AI-generated syllabi and self-study plans.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  CourseSyllabus,
  WeeklyScheduleItem,
  LearningStyle,
  EducationalResource,
  GeneratedSyllabus,
  SelfStudyInput,
} from '@/lib/supabase/types'

// ============================================================================
// Types
// ============================================================================

export type StudyMode = 'flashcards' | 'podcast' | 'mindmap' | 'exam' | 'reading' | 'review' | 'chat'
export type SessionType = 'new' | 'review' | 'assessment' | 'final_review'

export interface CoursePlanSession {
  id?: string
  planId?: string
  userId: string
  scheduledDate: Date
  scheduledTime?: string
  estimatedMinutes: number
  mode: StudyMode
  topic: string
  weekNumber: number
  sessionType: SessionType
  status: 'pending' | 'completed' | 'skipped' | 'rescheduled'
  readings?: string[]
  assignments?: string[]
  learningObjectives?: string[]
}

export interface CoursePlanOptions {
  startDate: Date
  endDate: Date
  dailyTargetMinutes: number
  includeWeekends: boolean
  learningStyle?: LearningStyle
  resources?: EducationalResource[]
}

export interface GeneratedCoursePlan {
  title: string
  description: string
  syllabusId: string
  planType: 'course' | 'self_study'
  startDate: Date
  endDate: Date
  totalEstimatedHours: number
  sessionsTotal: number
  sessions: CoursePlanSession[]
  recommendedResources: EducationalResource[]
}

// ============================================================================
// Learning Style Mode Priorities
// ============================================================================

const LEARNING_STYLE_MODES: Record<LearningStyle | 'default', StudyMode[]> = {
  visual: ['mindmap', 'flashcards', 'reading', 'exam'],
  auditory: ['podcast', 'chat', 'flashcards', 'exam'],
  kinesthetic: ['exam', 'flashcards', 'chat', 'mindmap'],
  reading_writing: ['reading', 'flashcards', 'chat', 'exam'],
  mixed: ['flashcards', 'mindmap', 'podcast', 'exam'],
  default: ['flashcards', 'reading', 'chat', 'exam'],
}

const MODE_DURATION_MINUTES: Record<StudyMode, number> = {
  flashcards: 20,
  podcast: 25,
  mindmap: 15,
  exam: 30,
  reading: 30,
  review: 15,
  chat: 20,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get available study days between two dates
 */
function getAvailableDays(
  startDate: Date,
  endDate: Date,
  includeWeekends: boolean
): Date[] {
  const days: Date[] = []
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
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
 * Get preferred study modes for a learning style
 */
function getModesForStyle(learningStyle?: LearningStyle): StudyMode[] {
  return LEARNING_STYLE_MODES[learningStyle || 'default']
}

/**
 * Distribute weekly schedule items across available days
 */
function distributeWeeksAcrossDays(
  weeklySchedule: WeeklyScheduleItem[],
  availableDays: Date[],
  dailyTargetMinutes: number
): Map<number, Date[]> {
  const weekDays = new Map<number, Date[]>()

  if (weeklySchedule.length === 0 || availableDays.length === 0) {
    return weekDays
  }

  // Calculate days per week
  const daysPerWeek = Math.max(1, Math.floor(availableDays.length / weeklySchedule.length))

  let dayIndex = 0
  for (const week of weeklySchedule) {
    const daysForWeek: Date[] = []

    for (let i = 0; i < daysPerWeek && dayIndex < availableDays.length; i++) {
      daysForWeek.push(availableDays[dayIndex])
      dayIndex++
    }

    weekDays.set(week.week, daysForWeek)
  }

  // Distribute any remaining days to the last weeks
  while (dayIndex < availableDays.length) {
    const lastWeek = weeklySchedule[weeklySchedule.length - 1].week
    const existing = weekDays.get(lastWeek) || []
    existing.push(availableDays[dayIndex])
    weekDays.set(lastWeek, existing)
    dayIndex++
  }

  return weekDays
}

// ============================================================================
// Main Generation Functions
// ============================================================================

/**
 * Generate a study plan from a course syllabus
 */
export async function generateCoursePlanFromSyllabus(
  userId: string,
  syllabusId: string,
  options: CoursePlanOptions
): Promise<GeneratedCoursePlan> {
  const supabase = await createClient()

  // Fetch the syllabus
  const { data: syllabus, error } = await supabase
    .from('course_syllabi')
    .select('*')
    .eq('id', syllabusId)
    .single()

  if (error || !syllabus) {
    throw new Error(`Syllabus not found: ${syllabusId}`)
  }

  const weeklySchedule = syllabus.weekly_schedule as WeeklyScheduleItem[]
  const availableDays = getAvailableDays(options.startDate, options.endDate, options.includeWeekends)
  const modes = getModesForStyle(options.learningStyle)

  // Distribute weeks across days
  const weekDays = distributeWeeksAcrossDays(weeklySchedule, availableDays, options.dailyTargetMinutes)

  // Generate sessions for each week
  const sessions: CoursePlanSession[] = []

  for (const week of weeklySchedule) {
    const daysForWeek = weekDays.get(week.week) || []

    if (daysForWeek.length === 0) continue

    // Create sessions for this week's topic
    const sessionsForWeek = createSessionsForWeek(
      userId,
      week,
      daysForWeek,
      modes,
      options.dailyTargetMinutes
    )

    sessions.push(...sessionsForWeek)
  }

  // Calculate total hours
  const totalMinutes = sessions.reduce((sum, s) => sum + s.estimatedMinutes, 0)

  return {
    title: syllabus.course_name,
    description: syllabus.course_description || `Study plan for ${syllabus.course_name}`,
    syllabusId,
    planType: 'course',
    startDate: options.startDate,
    endDate: options.endDate,
    totalEstimatedHours: Math.round(totalMinutes / 60 * 10) / 10,
    sessionsTotal: sessions.length,
    sessions,
    recommendedResources: options.resources || [],
  }
}

/**
 * Generate a study plan from a GeneratedSyllabus (not yet saved to DB)
 */
export function generateCoursePlanFromGeneratedSyllabus(
  userId: string,
  syllabus: GeneratedSyllabus,
  options: CoursePlanOptions
): GeneratedCoursePlan {
  const weeklySchedule = syllabus.weeklySchedule
  const availableDays = getAvailableDays(options.startDate, options.endDate, options.includeWeekends)
  const modes = getModesForStyle(options.learningStyle)

  // Distribute weeks across days
  const weekDays = distributeWeeksAcrossDays(weeklySchedule, availableDays, options.dailyTargetMinutes)

  // Generate sessions for each week
  const sessions: CoursePlanSession[] = []

  for (const week of weeklySchedule) {
    const daysForWeek = weekDays.get(week.week) || []

    if (daysForWeek.length === 0) continue

    const sessionsForWeek = createSessionsForWeek(
      userId,
      week,
      daysForWeek,
      modes,
      options.dailyTargetMinutes
    )

    sessions.push(...sessionsForWeek)
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + s.estimatedMinutes, 0)

  return {
    title: syllabus.courseName,
    description: syllabus.courseDescription,
    syllabusId: '', // Will be set after saving syllabus
    planType: 'course',
    startDate: options.startDate,
    endDate: options.endDate,
    totalEstimatedHours: Math.round(totalMinutes / 60 * 10) / 10,
    sessionsTotal: sessions.length,
    sessions,
    recommendedResources: options.resources || [],
  }
}

/**
 * Generate a self-study plan from user input
 */
export async function generateSelfStudyPlan(
  userId: string,
  input: SelfStudyInput,
  resources: EducationalResource[],
  options: CoursePlanOptions
): Promise<GeneratedCoursePlan> {
  const { subject, specificTopic, learningGoals, durationWeeks } = input

  // Generate a simple weekly schedule based on the subject
  const weeklySchedule: WeeklyScheduleItem[] = []

  for (let week = 1; week <= durationWeeks; week++) {
    const topic = week === 1
      ? `Introduction to ${subject}`
      : week === durationWeeks
        ? `Review and Assessment: ${subject}`
        : `${subject} - Week ${week}: ${specificTopic || 'Core Concepts'}`

    weeklySchedule.push({
      week,
      topic,
      readings: resources.slice(0, 2).map((r) => r.title),
      assignments: week % 2 === 0 ? ['Practice exercises'] : [],
      learningObjectives: learningGoals ? [learningGoals] : [],
    })
  }

  const availableDays = getAvailableDays(options.startDate, options.endDate, options.includeWeekends)
  const modes = getModesForStyle(options.learningStyle)

  const weekDays = distributeWeeksAcrossDays(weeklySchedule, availableDays, options.dailyTargetMinutes)

  const sessions: CoursePlanSession[] = []

  for (const week of weeklySchedule) {
    const daysForWeek = weekDays.get(week.week) || []

    if (daysForWeek.length === 0) continue

    const sessionsForWeek = createSessionsForWeek(
      userId,
      week,
      daysForWeek,
      modes,
      options.dailyTargetMinutes
    )

    sessions.push(...sessionsForWeek)
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + s.estimatedMinutes, 0)

  return {
    title: `Self-Study: ${subject}`,
    description: `${durationWeeks}-week self-study plan for ${subject}. ${learningGoals || ''}`,
    syllabusId: '', // No syllabus for self-study
    planType: 'self_study',
    startDate: options.startDate,
    endDate: options.endDate,
    totalEstimatedHours: Math.round(totalMinutes / 60 * 10) / 10,
    sessionsTotal: sessions.length,
    sessions,
    recommendedResources: resources,
  }
}

/**
 * Create sessions for a single week
 */
function createSessionsForWeek(
  userId: string,
  week: WeeklyScheduleItem,
  days: Date[],
  modes: StudyMode[],
  dailyTargetMinutes: number
): CoursePlanSession[] {
  const sessions: CoursePlanSession[] = []

  if (days.length === 0) return sessions

  // Determine session types for the week
  // Day 1: New material (learning mode)
  // Day 2-n: Practice/review
  // Last day of week: Assessment

  for (let i = 0; i < days.length; i++) {
    const date = days[i]
    const isFirstDay = i === 0
    const isLastDay = i === days.length - 1

    let mode: StudyMode
    let sessionType: SessionType
    let estimatedMinutes: number

    if (isFirstDay) {
      // First day: reading/learning new material
      mode = modes.includes('reading') ? 'reading' : modes[0]
      sessionType = 'new'
      estimatedMinutes = Math.min(dailyTargetMinutes, MODE_DURATION_MINUTES[mode] * 2)
    } else if (isLastDay) {
      // Last day: assessment/exam
      mode = 'exam'
      sessionType = 'assessment'
      estimatedMinutes = MODE_DURATION_MINUTES.exam
    } else {
      // Middle days: practice with preferred modes
      const modeIndex = (i - 1) % modes.length
      mode = modes[modeIndex]
      sessionType = 'review'
      estimatedMinutes = Math.min(dailyTargetMinutes, MODE_DURATION_MINUTES[mode])
    }

    sessions.push({
      userId,
      scheduledDate: date,
      estimatedMinutes,
      mode,
      topic: week.topic,
      weekNumber: week.week,
      sessionType,
      status: 'pending',
      readings: week.readings,
      assignments: week.assignments,
      learningObjectives: week.learningObjectives,
    })
  }

  return sessions
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Save a generated course plan to the database
 */
export async function saveCoursePlan(
  plan: GeneratedCoursePlan,
  userId: string
): Promise<string> {
  const supabase = await createClient()

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  // Create the study plan
  const { data: studyPlan, error: planError } = await supabase
    .from('study_plans')
    .insert({
      user_id: profile.id,
      title: plan.title,
      description: plan.description,
      syllabus_id: plan.syllabusId || null,
      plan_type: plan.planType,
      start_date: plan.startDate.toISOString(),
      exam_date: plan.endDate.toISOString(),
      status: 'active',
      total_estimated_hours: plan.totalEstimatedHours,
      hours_completed: 0,
      daily_target_hours: Math.round(plan.totalEstimatedHours / plan.sessionsTotal * 10) / 10,
      sessions_completed: 0,
      sessions_total: plan.sessionsTotal,
      recommended_resources: plan.recommendedResources,
    })
    .select('id')
    .single()

  if (planError || !studyPlan) {
    throw new Error(`Failed to create study plan: ${planError?.message}`)
  }

  // Create sessions
  const sessionsToInsert = plan.sessions.map((session) => ({
    study_plan_id: studyPlan.id,
    user_id: profile.id,
    scheduled_date: session.scheduledDate.toISOString(),
    scheduled_time: session.scheduledTime,
    estimated_minutes: session.estimatedMinutes,
    mode: session.mode,
    topic: session.topic,
    week_number: session.weekNumber,
    session_type: session.sessionType,
    status: session.status,
  }))

  const { error: sessionsError } = await supabase
    .from('study_plan_sessions')
    .insert(sessionsToInsert)

  if (sessionsError) {
    console.error('Failed to create sessions:', sessionsError)
    // Plan was created, sessions failed - log but don't fail
  }

  return studyPlan.id
}

/**
 * Save a syllabus to the database
 */
export async function saveSyllabus(
  syllabus: GeneratedSyllabus,
  userId: string,
  courseInput: {
    university: string
    program?: string
    courseCode: string
    courseName: string
    semester: string
    year: number
  }
): Promise<string> {
  const supabase = await createClient()

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  const { data, error } = await supabase
    .from('course_syllabi')
    .insert({
      user_id: profile.id,
      university: courseInput.university,
      program: courseInput.program,
      course_code: courseInput.courseCode,
      course_name: courseInput.courseName,
      semester: courseInput.semester,
      year: courseInput.year,
      source_type: 'web_search',
      source_urls: syllabus.sourceUrls,
      course_description: syllabus.courseDescription,
      learning_objectives: syllabus.learningObjectives,
      weekly_schedule: syllabus.weeklySchedule,
      textbooks: syllabus.textbooks,
      additional_resources: syllabus.additionalResources,
      grading_scheme: syllabus.gradingScheme,
      confidence_score: syllabus.confidenceScore,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to save syllabus: ${error?.message}`)
  }

  return data.id
}
