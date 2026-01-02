/**
 * Cram Mode Generator
 *
 * Generates an intensive study schedule for the final week before an exam.
 * Focuses on weak topics, high-yield content, and frequent short sessions.
 */

export interface CramSession {
  id: string
  day: number  // Days until exam (7, 6, 5, 4, 3, 2, 1, 0)
  date: Date
  sessions: CramSessionBlock[]
  focus: string[]
  estimatedMinutes: number
}

export interface CramSessionBlock {
  id: string
  type: 'flashcard_review' | 'mini_exam' | 'quick_podcast' | 'weak_topic_drill' | 'full_review'
  title: string
  description: string
  estimatedMinutes: number
  topic?: string
  priority: 'critical' | 'high' | 'medium'
  completed: boolean
}

export interface CramPlanConfig {
  examDate: Date
  weakTopics: string[]
  allTopics: string[]
  documentsIds: string[]
  dailyAvailableMinutes: number
  examId?: string
  studyPlanId?: string
}

export interface CramPlan {
  id: string
  examDate: Date
  startDate: Date
  daysUntilExam: number
  totalEstimatedMinutes: number
  weakTopics: string[]
  dailySessions: CramSession[]
  focusAreas: {
    topic: string
    priority: 'critical' | 'high' | 'medium'
    sessionsAllocated: number
  }[]
}

/**
 * Generates a cram mode study plan for the week before an exam
 */
export function generateCramPlan(config: CramPlanConfig): CramPlan {
  const now = new Date()
  const examDate = new Date(config.examDate)
  const msPerDay = 24 * 60 * 60 * 1000
  const daysUntilExam = Math.ceil((examDate.getTime() - now.getTime()) / msPerDay)

  // Cap at 7 days
  const planDays = Math.min(daysUntilExam, 7)

  // Prioritize weak topics
  const prioritizedTopics = prioritizeTopics(config.weakTopics, config.allTopics)

  // Generate daily sessions
  const dailySessions: CramSession[] = []

  for (let day = planDays; day >= 0; day--) {
    const sessionDate = new Date(examDate)
    sessionDate.setDate(sessionDate.getDate() - day)

    const session = generateDaySession(
      day,
      sessionDate,
      prioritizedTopics,
      config.dailyAvailableMinutes,
      config.weakTopics
    )

    dailySessions.push(session)
  }

  // Calculate focus areas
  const focusAreas = prioritizedTopics.map(topic => ({
    topic: topic.name,
    priority: topic.priority,
    sessionsAllocated: dailySessions.reduce((count, day) =>
      count + day.sessions.filter(s => s.topic === topic.name).length, 0
    )
  }))

  const totalMinutes = dailySessions.reduce((sum, day) => sum + day.estimatedMinutes, 0)

  return {
    id: `cram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    examDate,
    startDate: new Date(dailySessions[0]?.date || now),
    daysUntilExam: planDays,
    totalEstimatedMinutes: totalMinutes,
    weakTopics: config.weakTopics,
    dailySessions,
    focusAreas
  }
}

interface PrioritizedTopic {
  name: string
  priority: 'critical' | 'high' | 'medium'
  isWeak: boolean
}

function prioritizeTopics(weakTopics: string[], allTopics: string[]): PrioritizedTopic[] {
  const topics: PrioritizedTopic[] = []

  // Weak topics get highest priority
  weakTopics.forEach((topic, index) => {
    topics.push({
      name: topic,
      priority: index < 2 ? 'critical' : 'high',
      isWeak: true
    })
  })

  // Other topics get medium priority
  allTopics.forEach(topic => {
    if (!weakTopics.includes(topic)) {
      topics.push({
        name: topic,
        priority: 'medium',
        isWeak: false
      })
    }
  })

  return topics
}

function generateDaySession(
  daysUntilExam: number,
  date: Date,
  topics: PrioritizedTopic[],
  availableMinutes: number,
  weakTopics: string[]
): CramSession {
  const sessions: CramSessionBlock[] = []
  let remainingMinutes = availableMinutes
  const sessionId = `day_${daysUntilExam}_${Date.now()}`

  // Day-specific strategies
  if (daysUntilExam === 0) {
    // Exam day - light review only
    sessions.push({
      id: `${sessionId}_final_review`,
      type: 'flashcard_review',
      title: 'Final Quick Review',
      description: 'Light review of key concepts. Stay calm and confident!',
      estimatedMinutes: Math.min(30, remainingMinutes),
      priority: 'high',
      completed: false
    })
    remainingMinutes -= 30
  } else if (daysUntilExam === 1) {
    // Day before exam - full review, no cramming new material
    sessions.push({
      id: `${sessionId}_full_review`,
      type: 'full_review',
      title: 'Comprehensive Review',
      description: 'Review all topics at a relaxed pace. Focus on understanding, not memorization.',
      estimatedMinutes: Math.min(60, remainingMinutes),
      priority: 'critical',
      completed: false
    })
    remainingMinutes -= 60

    // Add one mini exam
    if (remainingMinutes >= 20) {
      sessions.push({
        id: `${sessionId}_mini_exam`,
        type: 'mini_exam',
        title: 'Practice Mini Exam',
        description: '10 quick questions to test your readiness',
        estimatedMinutes: 20,
        priority: 'high',
        completed: false
      })
      remainingMinutes -= 20
    }
  } else {
    // Days 2-7: Intensive focus on weak topics

    // Morning: Weak topic drill
    const weakTopic = weakTopics[daysUntilExam % weakTopics.length] || topics[0]?.name
    if (weakTopic && remainingMinutes >= 25) {
      sessions.push({
        id: `${sessionId}_weak_drill`,
        type: 'weak_topic_drill',
        title: `Focus: ${weakTopic}`,
        description: 'Intensive practice on your weakest area',
        estimatedMinutes: 25,
        topic: weakTopic,
        priority: 'critical',
        completed: false
      })
      remainingMinutes -= 25
    }

    // Flashcard review session
    if (remainingMinutes >= 15) {
      sessions.push({
        id: `${sessionId}_flashcards`,
        type: 'flashcard_review',
        title: 'High-Yield Flashcards',
        description: 'Review most-missed flashcards using spaced repetition',
        estimatedMinutes: 15,
        priority: 'high',
        completed: false
      })
      remainingMinutes -= 15
    }

    // Mini exam (every other day)
    if (daysUntilExam % 2 === 0 && remainingMinutes >= 15) {
      sessions.push({
        id: `${sessionId}_mini_exam`,
        type: 'mini_exam',
        title: 'Quick Assessment',
        description: '10 questions to gauge your progress',
        estimatedMinutes: 15,
        priority: 'high',
        completed: false
      })
      remainingMinutes -= 15
    }

    // Quick podcast for another weak topic
    const secondWeakTopic = weakTopics[(daysUntilExam + 1) % weakTopics.length]
    if (secondWeakTopic && remainingMinutes >= 10 && secondWeakTopic !== weakTopic) {
      sessions.push({
        id: `${sessionId}_podcast`,
        type: 'quick_podcast',
        title: `Listen: ${secondWeakTopic}`,
        description: 'Quick audio summary while taking a break',
        estimatedMinutes: 10,
        topic: secondWeakTopic,
        priority: 'medium',
        completed: false
      })
      remainingMinutes -= 10
    }

    // Extra weak topic drill if time permits
    const thirdTopic = topics.find(t => t.isWeak && t.name !== weakTopic && t.name !== secondWeakTopic)
    if (thirdTopic && remainingMinutes >= 20) {
      sessions.push({
        id: `${sessionId}_extra_drill`,
        type: 'weak_topic_drill',
        title: `Extra Practice: ${thirdTopic.name}`,
        description: 'Additional practice for struggling areas',
        estimatedMinutes: 20,
        topic: thirdTopic.name,
        priority: 'high',
        completed: false
      })
      remainingMinutes -= 20
    }
  }

  return {
    id: sessionId,
    day: daysUntilExam,
    date,
    sessions,
    focus: sessions.filter(s => s.topic).map(s => s.topic!),
    estimatedMinutes: availableMinutes - remainingMinutes
  }
}

/**
 * Calculate progress for a cram plan
 */
export function calculateCramProgress(plan: CramPlan): {
  completedSessions: number
  totalSessions: number
  completedMinutes: number
  totalMinutes: number
  percentComplete: number
  onTrack: boolean
} {
  let completedSessions = 0
  let totalSessions = 0
  let completedMinutes = 0

  plan.dailySessions.forEach(day => {
    day.sessions.forEach(session => {
      totalSessions++
      if (session.completed) {
        completedSessions++
        completedMinutes += session.estimatedMinutes
      }
    })
  })

  const percentComplete = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0

  // Calculate expected progress based on days remaining
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysElapsed = Math.max(0, Math.ceil((now.getTime() - plan.startDate.getTime()) / msPerDay))
  const totalDays = plan.daysUntilExam + 1
  const expectedProgress = (daysElapsed / totalDays) * 100

  return {
    completedSessions,
    totalSessions,
    completedMinutes,
    totalMinutes: plan.totalEstimatedMinutes,
    percentComplete,
    onTrack: percentComplete >= expectedProgress - 10 // 10% buffer
  }
}

/**
 * Get today's cram sessions
 */
export function getTodayCramSessions(plan: CramPlan): CramSession | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return plan.dailySessions.find(day => {
    const sessionDate = new Date(day.date)
    sessionDate.setHours(0, 0, 0, 0)
    return sessionDate.getTime() === today.getTime()
  }) || null
}

/**
 * Get motivational message based on progress
 */
export function getCramMotivation(daysUntilExam: number, percentComplete: number): string {
  if (daysUntilExam === 0) {
    return "You've prepared well. Trust yourself and stay calm. You've got this! 💪"
  }

  if (daysUntilExam === 1) {
    return "Final stretch! Light review today, then rest. You're ready for this!"
  }

  if (percentComplete >= 80) {
    return "Excellent progress! Keep up the momentum. You're on track for success!"
  }

  if (percentComplete >= 50) {
    return "You're halfway there! Stay focused and keep pushing. Every session counts!"
  }

  if (percentComplete >= 25) {
    return "Good start! Consistency is key. Let's tackle those weak spots today!"
  }

  return "Let's get started! Small steps lead to big results. Focus on one topic at a time."
}
