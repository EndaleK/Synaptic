/**
 * Study Plan Optimizer
 *
 * Generates optimized study plans based on:
 * - Exam dates and topic weights
 * - User's available study time
 * - Spaced repetition principles
 * - Topic difficulty and prerequisites
 */

export interface StudyPlanInput {
  examDate: string                    // ISO format YYYY-MM-DD
  examName: string
  topics: TopicInput[]
  dailyTargetHours: number           // Default: 2
  includeWeekends: boolean           // Default: true
  startDate?: string                 // Default: today
  existingMasteryLevels?: Record<string, number>  // topic -> mastery (0-100)
}

export interface TopicInput {
  name: string
  weight: number                     // Importance 0-100
  estimatedHours: number             // Total hours needed
  prerequisites?: string[]           // Other topic names
  documentIds?: string[]             // Associated documents
}

export interface StudySession {
  id: string
  date: string                       // ISO format YYYY-MM-DD
  dayOfWeek: string
  topics: SessionTopic[]
  totalMinutes: number
  sessionType: 'new_material' | 'review' | 'mixed' | 'practice_exam'
  isBufferDay: boolean
}

export interface SessionTopic {
  name: string
  minutes: number
  activityType: 'learn' | 'review' | 'practice'
  documentId?: string
}

export interface GeneratedStudyPlan {
  id: string
  examName: string
  examDate: string
  startDate: string
  totalDays: number
  totalStudyHours: number
  sessions: StudySession[]
  topicSchedule: TopicScheduleItem[]
  recommendations: string[]
}

export interface TopicScheduleItem {
  topic: string
  firstStudyDate: string
  reviewDates: string[]
  practiceDate: string | null
  totalMinutes: number
}

/**
 * Generate an optimized study plan
 */
export function generateStudyPlan(input: StudyPlanInput): GeneratedStudyPlan {
  const {
    examDate,
    examName,
    topics,
    dailyTargetHours = 2,
    includeWeekends = true,
    startDate = new Date().toISOString().split('T')[0],
    existingMasteryLevels = {}
  } = input

  const examDateObj = new Date(examDate)
  const startDateObj = new Date(startDate)

  // Calculate available days
  const totalDays = Math.ceil(
    (examDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (totalDays <= 0) {
    throw new Error('Exam date must be in the future')
  }

  // Get study days (excluding weekends if needed)
  const studyDays = getStudyDays(startDateObj, examDateObj, includeWeekends)

  // Reserve last 2 days for review/practice exams
  const bufferDays = Math.min(2, Math.floor(studyDays.length * 0.15))
  const learningDays = studyDays.slice(0, -bufferDays)
  const reviewDays = studyDays.slice(-bufferDays)

  // Sort topics by weight and prerequisites
  const sortedTopics = sortTopicsByPriority(topics, existingMasteryLevels)

  // Distribute topics across learning days
  const dailyMinutes = dailyTargetHours * 60
  const sessions = distributeTopicsToSessions(
    sortedTopics,
    learningDays,
    reviewDays,
    dailyMinutes,
    existingMasteryLevels
  )

  // Calculate topic schedule summary
  const topicSchedule = calculateTopicSchedule(sessions, sortedTopics)

  // Generate recommendations
  const recommendations = generateRecommendations(
    totalDays,
    topics,
    dailyTargetHours,
    existingMasteryLevels
  )

  // Calculate total study hours
  const totalStudyHours = sessions.reduce(
    (sum, s) => sum + s.totalMinutes / 60,
    0
  )

  return {
    id: generatePlanId(),
    examName,
    examDate,
    startDate,
    totalDays,
    totalStudyHours: Math.round(totalStudyHours * 10) / 10,
    sessions,
    topicSchedule,
    recommendations
  }
}

/**
 * Get all study days between start and end dates
 */
function getStudyDays(
  start: Date,
  end: Date,
  includeWeekends: boolean
): Date[] {
  const days: Date[] = []
  const current = new Date(start)

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
 * Sort topics by priority considering weight and prerequisites
 */
function sortTopicsByPriority(
  topics: TopicInput[],
  masteryLevels: Record<string, number>
): TopicInput[] {
  // Build dependency graph
  const dependencyCount = new Map<string, number>()
  topics.forEach(topic => {
    dependencyCount.set(topic.name, 0)
  })

  topics.forEach(topic => {
    (topic.prerequisites || []).forEach(prereq => {
      const current = dependencyCount.get(prereq) || 0
      dependencyCount.set(prereq, current + 1)
    })
  })

  // Sort by: prerequisites first, then by weight (descending), then by existing mastery (ascending)
  return [...topics].sort((a, b) => {
    // Prerequisites should come first
    const aHasPrereqs = (a.prerequisites || []).length > 0
    const bHasPrereqs = (b.prerequisites || []).length > 0

    if (!aHasPrereqs && bHasPrereqs) return -1
    if (aHasPrereqs && !bHasPrereqs) return 1

    // Then by how many topics depend on this one
    const aDeps = dependencyCount.get(a.name) || 0
    const bDeps = dependencyCount.get(b.name) || 0
    if (aDeps !== bDeps) return bDeps - aDeps

    // Then by weight (higher weight = study earlier)
    if (a.weight !== b.weight) return b.weight - a.weight

    // Then by existing mastery (lower mastery = study earlier)
    const aMastery = masteryLevels[a.name] || 0
    const bMastery = masteryLevels[b.name] || 0
    return aMastery - bMastery
  })
}

/**
 * Distribute topics across study sessions
 */
function distributeTopicsToSessions(
  topics: TopicInput[],
  learningDays: Date[],
  reviewDays: Date[],
  dailyMinutes: number,
  masteryLevels: Record<string, number>
): StudySession[] {
  const sessions: StudySession[] = []

  // Calculate total study time needed
  const totalMinutesNeeded = topics.reduce((sum, t) => sum + t.estimatedHours * 60, 0)
  const availableMinutes = learningDays.length * dailyMinutes

  // Adjust if not enough time
  const timeRatio = availableMinutes / totalMinutesNeeded
  const adjustedTopics = topics.map(t => ({
    ...t,
    adjustedMinutes: Math.round(t.estimatedHours * 60 * Math.min(timeRatio, 1))
  }))

  // Distribute topics across learning days
  let topicIndex = 0
  let topicMinutesRemaining = adjustedTopics[0]?.adjustedMinutes || 0

  for (const day of learningDays) {
    const sessionTopics: SessionTopic[] = []
    let sessionMinutesRemaining = dailyMinutes

    while (sessionMinutesRemaining > 0 && topicIndex < adjustedTopics.length) {
      const currentTopic = adjustedTopics[topicIndex]
      const minutesToAllocate = Math.min(sessionMinutesRemaining, topicMinutesRemaining)

      if (minutesToAllocate > 0) {
        // Determine activity type based on mastery
        const mastery = masteryLevels[currentTopic.name] || 0
        const activityType = mastery < 30 ? 'learn' : mastery < 70 ? 'review' : 'practice'

        sessionTopics.push({
          name: currentTopic.name,
          minutes: minutesToAllocate,
          activityType,
          documentId: currentTopic.documentIds?.[0]
        })

        sessionMinutesRemaining -= minutesToAllocate
        topicMinutesRemaining -= minutesToAllocate
      }

      if (topicMinutesRemaining <= 0) {
        topicIndex++
        if (topicIndex < adjustedTopics.length) {
          topicMinutesRemaining = adjustedTopics[topicIndex].adjustedMinutes
        }
      }
    }

    if (sessionTopics.length > 0) {
      const totalMinutes = sessionTopics.reduce((sum, t) => sum + t.minutes, 0)
      const hasNew = sessionTopics.some(t => t.activityType === 'learn')
      const hasReview = sessionTopics.some(t => t.activityType === 'review' || t.activityType === 'practice')

      sessions.push({
        id: generateSessionId(),
        date: day.toISOString().split('T')[0],
        dayOfWeek: getDayName(day),
        topics: sessionTopics,
        totalMinutes,
        sessionType: hasNew && hasReview ? 'mixed' : hasNew ? 'new_material' : 'review',
        isBufferDay: false
      })
    }
  }

  // Add review/practice exam days
  for (const day of reviewDays) {
    const reviewTopics = topics
      .filter(t => (masteryLevels[t.name] || 0) < 80)
      .slice(0, 3)
      .map(t => ({
        name: t.name,
        minutes: Math.round(dailyMinutes / 3),
        activityType: 'practice' as const,
        documentId: t.documentIds?.[0]
      }))

    if (reviewTopics.length > 0) {
      sessions.push({
        id: generateSessionId(),
        date: day.toISOString().split('T')[0],
        dayOfWeek: getDayName(day),
        topics: reviewTopics,
        totalMinutes: dailyMinutes,
        sessionType: 'practice_exam',
        isBufferDay: true
      })
    }
  }

  return sessions
}

/**
 * Calculate topic schedule summary
 */
function calculateTopicSchedule(
  sessions: StudySession[],
  topics: TopicInput[]
): TopicScheduleItem[] {
  const schedule: TopicScheduleItem[] = []

  for (const topic of topics) {
    const topicSessions = sessions.filter(s =>
      s.topics.some(t => t.name === topic.name)
    )

    if (topicSessions.length === 0) continue

    const dates = topicSessions.map(s => s.date).sort()
    const totalMinutes = topicSessions.reduce((sum, s) => {
      const topicTime = s.topics.find(t => t.name === topic.name)
      return sum + (topicTime?.minutes || 0)
    }, 0)

    schedule.push({
      topic: topic.name,
      firstStudyDate: dates[0],
      reviewDates: dates.slice(1),
      practiceDate: topicSessions.find(s => s.sessionType === 'practice_exam')?.date || null,
      totalMinutes
    })
  }

  return schedule
}

/**
 * Generate study recommendations
 */
function generateRecommendations(
  totalDays: number,
  topics: TopicInput[],
  dailyHours: number,
  masteryLevels: Record<string, number>
): string[] {
  const recommendations: string[] = []

  // Time-based recommendations
  if (totalDays < 7) {
    recommendations.push(
      'You have less than a week until your exam. Focus on high-weight topics and review weak areas.'
    )
  } else if (totalDays < 14) {
    recommendations.push(
      'Two weeks is a good amount of time. Prioritize understanding key concepts before memorization.'
    )
  }

  // Mastery-based recommendations
  const lowMasteryTopics = topics.filter(t => (masteryLevels[t.name] || 0) < 50)
  if (lowMasteryTopics.length > topics.length / 2) {
    recommendations.push(
      `${lowMasteryTopics.length} topics need significant review. Consider increasing daily study time.`
    )
  }

  // Study time recommendations
  const totalHoursNeeded = topics.reduce((sum, t) => sum + t.estimatedHours, 0)
  const availableHours = totalDays * dailyHours
  if (totalHoursNeeded > availableHours * 1.2) {
    recommendations.push(
      'The study plan is ambitious. Focus on high-weight topics if time runs short.'
    )
  }

  // Spaced repetition reminder
  recommendations.push(
    'Review each topic at least twice before the exam for better retention.'
  )

  return recommendations
}

/**
 * Get day name from date
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Generate unique plan ID
 */
function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Adapt an existing plan based on progress
 */
export function adaptStudyPlan(
  plan: GeneratedStudyPlan,
  completedSessions: string[],
  topicPerformance: Record<string, number>  // topic -> accuracy 0-100
): GeneratedStudyPlan {
  const today = new Date().toISOString().split('T')[0]

  // Filter out past sessions
  const remainingSessions = plan.sessions.filter(s => s.date >= today)

  // Identify weak topics based on performance
  const weakTopics = Object.entries(topicPerformance)
    .filter(([_, accuracy]) => accuracy < 70)
    .map(([topic]) => topic)

  // Add extra review sessions for weak topics
  if (weakTopics.length > 0) {
    const lastSession = remainingSessions[remainingSessions.length - 1]
    if (lastSession && !lastSession.isBufferDay) {
      // Add weak topic review to remaining sessions
      remainingSessions.forEach(session => {
        const hasWeakTopic = session.topics.some(t => weakTopics.includes(t.name))
        if (!hasWeakTopic && weakTopics.length > 0) {
          const weakTopic = weakTopics[0]
          session.topics.push({
            name: weakTopic,
            minutes: 15,
            activityType: 'review'
          })
          session.totalMinutes += 15
        }
      })
    }
  }

  // Update recommendations
  const newRecommendations = [...plan.recommendations]
  if (weakTopics.length > 0) {
    newRecommendations.unshift(
      `Focus areas: ${weakTopics.join(', ')} need extra attention based on your performance.`
    )
  }

  return {
    ...plan,
    sessions: remainingSessions,
    recommendations: newRecommendations
  }
}
