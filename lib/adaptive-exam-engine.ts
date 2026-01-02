/**
 * Adaptive Exam Engine
 *
 * Real-time difficulty adjustment based on student performance.
 * Algorithm:
 * - Start at medium difficulty
 * - 3 consecutive correct → increase difficulty
 * - 2 consecutive wrong → decrease difficulty
 * - Track difficulty per topic separately
 * - Weight final score by attempted difficulty
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface AdaptiveQuestion {
  id: string
  questionText: string
  questionType: 'mcq' | 'true_false' | 'short_answer'
  options?: string[]
  correctAnswer: string
  explanation?: string
  topic: string
  difficulty: DifficultyLevel
  sourceReference?: string
}

export interface AdaptiveState {
  currentDifficulty: DifficultyLevel
  consecutiveCorrect: number
  consecutiveWrong: number
  topicDifficulties: Record<string, DifficultyLevel>
  answeredQuestions: AnsweredQuestion[]
  difficultyHistory: DifficultyLevel[]
}

export interface AnsweredQuestion {
  questionId: string
  userAnswer: string
  isCorrect: boolean
  difficulty: DifficultyLevel
  topic: string
  timeSpentSeconds: number
}

export interface AdaptiveExamConfig {
  totalQuestions: number
  startingDifficulty?: DifficultyLevel
  consecutiveToIncrease?: number  // Default: 3
  consecutiveToDecrease?: number  // Default: 2
  enableTopicAdaptation?: boolean // Track difficulty per topic
  timeLimitMinutes?: number
}

export interface AdaptiveExamResult {
  rawScore: number           // Percentage correct (0-100)
  weightedScore: number      // Score weighted by difficulty (0-100)
  totalQuestions: number
  correctAnswers: number
  averageDifficulty: number  // 1=easy, 2=medium, 3=hard
  topicPerformance: Record<string, TopicPerformance>
  difficultyBreakdown: DifficultyBreakdown
  timeAnalysis: TimeAnalysis
  recommendations: string[]
}

export interface TopicPerformance {
  topic: string
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  averageDifficulty: number
  avgTimeSeconds: number
  needsReview: boolean
}

export interface DifficultyBreakdown {
  easy: { attempted: number; correct: number; accuracy: number }
  medium: { attempted: number; correct: number; accuracy: number }
  hard: { attempted: number; correct: number; accuracy: number }
}

export interface TimeAnalysis {
  totalTimeSeconds: number
  avgTimePerQuestion: number
  fastestQuestion: number
  slowestQuestion: number
  questionsUnderPressure: number  // Answered in last 10% of time
}

// Difficulty weights for scoring
const DIFFICULTY_WEIGHTS: Record<DifficultyLevel, number> = {
  easy: 0.7,
  medium: 1.0,
  hard: 1.3
}

const DIFFICULTY_VALUES: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3
}

/**
 * Initialize adaptive exam state
 */
export function initializeAdaptiveState(
  config: AdaptiveExamConfig
): AdaptiveState {
  return {
    currentDifficulty: config.startingDifficulty || 'medium',
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    topicDifficulties: {},
    answeredQuestions: [],
    difficultyHistory: [config.startingDifficulty || 'medium']
  }
}

/**
 * Get the next difficulty level (increase)
 */
function increaseDifficulty(current: DifficultyLevel): DifficultyLevel {
  if (current === 'easy') return 'medium'
  if (current === 'medium') return 'hard'
  return 'hard'
}

/**
 * Get the previous difficulty level (decrease)
 */
function decreaseDifficulty(current: DifficultyLevel): DifficultyLevel {
  if (current === 'hard') return 'medium'
  if (current === 'medium') return 'easy'
  return 'easy'
}

/**
 * Process an answer and update adaptive state
 */
export function processAnswer(
  state: AdaptiveState,
  question: AdaptiveQuestion,
  userAnswer: string,
  timeSpentSeconds: number,
  config: AdaptiveExamConfig
): { newState: AdaptiveState; isCorrect: boolean } {
  const isCorrect = checkAnswer(question, userAnswer)

  const answeredQuestion: AnsweredQuestion = {
    questionId: question.id,
    userAnswer,
    isCorrect,
    difficulty: question.difficulty,
    topic: question.topic,
    timeSpentSeconds
  }

  let newConsecutiveCorrect = isCorrect ? state.consecutiveCorrect + 1 : 0
  let newConsecutiveWrong = isCorrect ? 0 : state.consecutiveWrong + 1
  let newDifficulty = state.currentDifficulty

  const toIncrease = config.consecutiveToIncrease || 3
  const toDecrease = config.consecutiveToDecrease || 2

  // Adjust difficulty based on consecutive answers
  if (newConsecutiveCorrect >= toIncrease) {
    newDifficulty = increaseDifficulty(state.currentDifficulty)
    newConsecutiveCorrect = 0
  } else if (newConsecutiveWrong >= toDecrease) {
    newDifficulty = decreaseDifficulty(state.currentDifficulty)
    newConsecutiveWrong = 0
  }

  // Update topic-specific difficulty if enabled
  const newTopicDifficulties = { ...state.topicDifficulties }
  if (config.enableTopicAdaptation) {
    const topicAnswers = [...state.answeredQuestions, answeredQuestion]
      .filter(q => q.topic === question.topic)

    const topicCorrect = topicAnswers.filter(q => q.isCorrect).length
    const topicTotal = topicAnswers.length

    if (topicTotal >= 3) {
      const topicAccuracy = topicCorrect / topicTotal
      if (topicAccuracy >= 0.8) {
        newTopicDifficulties[question.topic] = increaseDifficulty(
          state.topicDifficulties[question.topic] || 'medium'
        )
      } else if (topicAccuracy < 0.5) {
        newTopicDifficulties[question.topic] = decreaseDifficulty(
          state.topicDifficulties[question.topic] || 'medium'
        )
      }
    }
  }

  const newState: AdaptiveState = {
    currentDifficulty: newDifficulty,
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveWrong: newConsecutiveWrong,
    topicDifficulties: newTopicDifficulties,
    answeredQuestions: [...state.answeredQuestions, answeredQuestion],
    difficultyHistory: [...state.difficultyHistory, newDifficulty]
  }

  return { newState, isCorrect }
}

/**
 * Check if an answer is correct
 */
export function checkAnswer(
  question: AdaptiveQuestion,
  userAnswer: string
): boolean {
  const normalizedUser = userAnswer.trim().toLowerCase()
  const normalizedCorrect = question.correctAnswer.trim().toLowerCase()

  if (question.questionType === 'mcq' || question.questionType === 'true_false') {
    return normalizedUser === normalizedCorrect
  }

  // For short answer, do fuzzy matching
  if (question.questionType === 'short_answer') {
    // Exact match
    if (normalizedUser === normalizedCorrect) return true

    // Check if answer contains the key terms
    const correctWords = normalizedCorrect.split(/\s+/).filter(w => w.length > 3)
    const userWords = normalizedUser.split(/\s+/)

    const matchedWords = correctWords.filter(cw =>
      userWords.some(uw => uw.includes(cw) || cw.includes(uw))
    )

    // If 70% of key terms match, consider it correct
    return matchedWords.length >= correctWords.length * 0.7
  }

  return false
}

/**
 * Select the next question based on adaptive state
 */
export function selectNextQuestion(
  availableQuestions: AdaptiveQuestion[],
  state: AdaptiveState,
  config: AdaptiveExamConfig
): AdaptiveQuestion | null {
  if (availableQuestions.length === 0) return null

  const answeredIds = new Set(state.answeredQuestions.map(q => q.questionId))
  const unanswered = availableQuestions.filter(q => !answeredIds.has(q.id))

  if (unanswered.length === 0) return null

  // Prefer questions at current difficulty
  const targetDifficulty = state.currentDifficulty
  const atTargetDifficulty = unanswered.filter(q => q.difficulty === targetDifficulty)

  if (atTargetDifficulty.length > 0) {
    // If topic adaptation is enabled, prefer topics with fewer questions
    if (config.enableTopicAdaptation) {
      const topicCounts = new Map<string, number>()
      state.answeredQuestions.forEach(q => {
        topicCounts.set(q.topic, (topicCounts.get(q.topic) || 0) + 1)
      })

      // Sort by topic count (ascending) to balance topics
      atTargetDifficulty.sort((a, b) => {
        const countA = topicCounts.get(a.topic) || 0
        const countB = topicCounts.get(b.topic) || 0
        return countA - countB
      })
    }

    // Add some randomness within the top candidates
    const candidates = atTargetDifficulty.slice(0, 3)
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  // Fallback: get closest difficulty
  const difficultyOrder: DifficultyLevel[] =
    targetDifficulty === 'easy' ? ['easy', 'medium', 'hard'] :
    targetDifficulty === 'hard' ? ['hard', 'medium', 'easy'] :
    ['medium', 'easy', 'hard']

  for (const diff of difficultyOrder) {
    const atDiff = unanswered.filter(q => q.difficulty === diff)
    if (atDiff.length > 0) {
      return atDiff[Math.floor(Math.random() * atDiff.length)]
    }
  }

  // Ultimate fallback: any unanswered question
  return unanswered[Math.floor(Math.random() * unanswered.length)]
}

/**
 * Calculate final exam results with weighted scoring
 */
export function calculateAdaptiveResults(
  state: AdaptiveState,
  totalTimeSeconds: number
): AdaptiveExamResult {
  const { answeredQuestions } = state

  if (answeredQuestions.length === 0) {
    return {
      rawScore: 0,
      weightedScore: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      averageDifficulty: 2,
      topicPerformance: {},
      difficultyBreakdown: {
        easy: { attempted: 0, correct: 0, accuracy: 0 },
        medium: { attempted: 0, correct: 0, accuracy: 0 },
        hard: { attempted: 0, correct: 0, accuracy: 0 }
      },
      timeAnalysis: {
        totalTimeSeconds: 0,
        avgTimePerQuestion: 0,
        fastestQuestion: 0,
        slowestQuestion: 0,
        questionsUnderPressure: 0
      },
      recommendations: ['Complete at least one question to get results.']
    }
  }

  // Raw score
  const correctAnswers = answeredQuestions.filter(q => q.isCorrect).length
  const rawScore = (correctAnswers / answeredQuestions.length) * 100

  // Weighted score (accounts for difficulty)
  let weightedPoints = 0
  let maxWeightedPoints = 0

  answeredQuestions.forEach(q => {
    const weight = DIFFICULTY_WEIGHTS[q.difficulty]
    maxWeightedPoints += weight
    if (q.isCorrect) {
      weightedPoints += weight
    }
  })

  const weightedScore = maxWeightedPoints > 0
    ? (weightedPoints / maxWeightedPoints) * 100
    : 0

  // Average difficulty
  const avgDifficulty = answeredQuestions.reduce(
    (sum, q) => sum + DIFFICULTY_VALUES[q.difficulty], 0
  ) / answeredQuestions.length

  // Difficulty breakdown
  const difficultyBreakdown: DifficultyBreakdown = {
    easy: { attempted: 0, correct: 0, accuracy: 0 },
    medium: { attempted: 0, correct: 0, accuracy: 0 },
    hard: { attempted: 0, correct: 0, accuracy: 0 }
  }

  answeredQuestions.forEach(q => {
    difficultyBreakdown[q.difficulty].attempted++
    if (q.isCorrect) {
      difficultyBreakdown[q.difficulty].correct++
    }
  })

  Object.keys(difficultyBreakdown).forEach(diff => {
    const d = difficultyBreakdown[diff as DifficultyLevel]
    d.accuracy = d.attempted > 0 ? (d.correct / d.attempted) * 100 : 0
  })

  // Topic performance
  const topicPerformance: Record<string, TopicPerformance> = {}
  const topicGroups = new Map<string, AnsweredQuestion[]>()

  answeredQuestions.forEach(q => {
    const existing = topicGroups.get(q.topic) || []
    existing.push(q)
    topicGroups.set(q.topic, existing)
  })

  topicGroups.forEach((questions, topic) => {
    const correct = questions.filter(q => q.isCorrect).length
    const avgDiff = questions.reduce(
      (sum, q) => sum + DIFFICULTY_VALUES[q.difficulty], 0
    ) / questions.length
    const avgTime = questions.reduce(
      (sum, q) => sum + q.timeSpentSeconds, 0
    ) / questions.length

    topicPerformance[topic] = {
      topic,
      totalQuestions: questions.length,
      correctAnswers: correct,
      accuracy: (correct / questions.length) * 100,
      averageDifficulty: avgDiff,
      avgTimeSeconds: avgTime,
      needsReview: (correct / questions.length) < 0.7
    }
  })

  // Time analysis
  const times = answeredQuestions.map(q => q.timeSpentSeconds)
  const timeAnalysis: TimeAnalysis = {
    totalTimeSeconds,
    avgTimePerQuestion: times.reduce((a, b) => a + b, 0) / times.length,
    fastestQuestion: Math.min(...times),
    slowestQuestion: Math.max(...times),
    questionsUnderPressure: 0 // Would need time limit info to calculate
  }

  // Generate recommendations
  const recommendations = generateRecommendations(
    rawScore,
    topicPerformance,
    difficultyBreakdown,
    avgDifficulty
  )

  return {
    rawScore: Math.round(rawScore * 10) / 10,
    weightedScore: Math.round(weightedScore * 10) / 10,
    totalQuestions: answeredQuestions.length,
    correctAnswers,
    averageDifficulty: Math.round(avgDifficulty * 10) / 10,
    topicPerformance,
    difficultyBreakdown,
    timeAnalysis,
    recommendations
  }
}

/**
 * Generate personalized recommendations based on performance
 */
function generateRecommendations(
  rawScore: number,
  topicPerformance: Record<string, TopicPerformance>,
  difficultyBreakdown: DifficultyBreakdown,
  avgDifficulty: number
): string[] {
  const recommendations: string[] = []

  // Overall score recommendations
  if (rawScore >= 90) {
    recommendations.push('Excellent performance! Consider challenging yourself with harder questions.')
  } else if (rawScore >= 70) {
    recommendations.push('Good job! Focus on the topics marked for review to improve further.')
  } else if (rawScore >= 50) {
    recommendations.push('You\'re making progress. Review the material and try again.')
  } else {
    recommendations.push('Consider reviewing the fundamentals before attempting another exam.')
  }

  // Topic-specific recommendations
  const weakTopics = Object.values(topicPerformance)
    .filter(t => t.needsReview)
    .sort((a, b) => a.accuracy - b.accuracy)

  if (weakTopics.length > 0) {
    const topicNames = weakTopics.slice(0, 3).map(t => t.topic).join(', ')
    recommendations.push(`Focus on: ${topicNames}`)
  }

  // Difficulty recommendations
  if (difficultyBreakdown.hard.accuracy >= 80 && difficultyBreakdown.hard.attempted >= 3) {
    recommendations.push('You\'re excelling at hard questions. You\'re exam-ready!')
  } else if (difficultyBreakdown.easy.accuracy < 70 && difficultyBreakdown.easy.attempted >= 3) {
    recommendations.push('Build your foundation with easier questions first.')
  }

  // Adaptation feedback
  if (avgDifficulty >= 2.5) {
    recommendations.push('The exam adapted to a higher difficulty based on your performance.')
  } else if (avgDifficulty <= 1.5) {
    recommendations.push('The exam adjusted to help you build confidence. Keep practicing!')
  }

  return recommendations
}

/**
 * Get difficulty indicator for UI display
 */
export function getDifficultyIndicator(difficulty: DifficultyLevel): {
  label: string
  color: string
  bgColor: string
  level: number
} {
  switch (difficulty) {
    case 'easy':
      return {
        label: 'Easy',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        level: 1
      }
    case 'medium':
      return {
        label: 'Medium',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        level: 2
      }
    case 'hard':
      return {
        label: 'Hard',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        level: 3
      }
  }
}

/**
 * Serialize adaptive state for storage
 */
export function serializeAdaptiveState(state: AdaptiveState): string {
  return JSON.stringify(state)
}

/**
 * Deserialize adaptive state from storage
 */
export function deserializeAdaptiveState(data: string): AdaptiveState | null {
  try {
    return JSON.parse(data) as AdaptiveState
  } catch {
    return null
  }
}
