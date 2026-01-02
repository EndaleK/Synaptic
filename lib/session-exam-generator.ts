/**
 * Session Exam Generator
 *
 * Generates daily quizzes and weekly exams for study plan sessions.
 *
 * Daily Quiz:
 * - 5-10 quick questions on the session's topic
 * - Multiple choice and short answer
 * - Focused on immediate retention
 *
 * Weekly Exam:
 * - Comprehensive exam covering all topics from the week
 * - 15-25 questions across all difficulty levels
 * - Tests mastery and identifies weak areas
 */

import { createClient } from '@/lib/supabase/server'
import { getProviderForFeature } from '@/lib/ai'
import type { TopicPageRange } from '@/lib/study-plan-generator'

// ============================================
// Types
// ============================================

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface ExamQuestion {
  id: string
  question: string
  type: QuestionType
  options?: string[]
  correctAnswer: string
  explanation: string
  difficulty: DifficultyLevel
  topic: string
  points: number
}

export interface GeneratedExam {
  id: string
  title: string
  examType: 'daily_quiz' | 'weekly_exam'
  questions: ExamQuestion[]
  totalPoints: number
  estimatedMinutes: number
  topicsCovered: string[]
}

export interface DailyQuizOptions {
  sessionId: string
  userId: string
  documentId: string
  topicFocus: string
  topicPages?: TopicPageRange
  questionCount?: number
}

export interface WeeklyExamOptions {
  studyPlanId: string
  userId: string
  weekNumber: number
  questionCount?: number
}

// ============================================
// Prompts
// ============================================

const DAILY_QUIZ_PROMPT = `Generate a short quiz to test understanding of the given topic.

Create {questionCount} questions that:
1. Test key concepts and facts from the topic
2. Include a mix of question types (multiple choice, true/false, short answer)
3. Range from easy to medium difficulty
4. Have clear, unambiguous answers
5. Include brief explanations for each answer

Topic: {topic}
{pageContext}

Respond with a JSON array of questions in this format:
{
  "questions": [
    {
      "question": "The question text",
      "type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank",
      "options": ["A", "B", "C", "D"], // Only for multiple_choice
      "correctAnswer": "The correct answer",
      "explanation": "Brief explanation of why this is correct",
      "difficulty": "easy" | "medium",
      "points": 1-3
    }
  ]
}`;

const WEEKLY_EXAM_PROMPT = `Generate a comprehensive exam covering the topics studied this week.

Create {questionCount} questions that:
1. Cover all topics from the week proportionally
2. Include all question types (multiple choice, true/false, short answer, fill in the blank)
3. Range across all difficulty levels (easy: 30%, medium: 50%, hard: 20%)
4. Test both factual recall and conceptual understanding
5. Include detailed explanations for each answer

Topics covered this week:
{topics}

Respond with a JSON array of questions in this format:
{
  "questions": [
    {
      "question": "The question text",
      "type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank",
      "options": ["A", "B", "C", "D"], // Only for multiple_choice
      "correctAnswer": "The correct answer",
      "explanation": "Detailed explanation of the answer",
      "difficulty": "easy" | "medium" | "hard",
      "topic": "The specific topic this question covers",
      "points": 1-5
    }
  ]
}`;

// ============================================
// Helper Functions
// ============================================

/**
 * Get document text for a specific topic/page range.
 */
async function getDocumentContent(
  documentId: string,
  topicPages?: TopicPageRange
): Promise<string> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('extracted_text')
    .eq('id', documentId)
    .single()

  if (error || !doc?.extracted_text) {
    throw new Error('Document content not found')
  }

  // If page range specified, try to extract relevant section
  // This is a simplified version - in production, you'd use proper page detection
  if (topicPages?.startPage && topicPages?.endPage) {
    const text = doc.extracted_text
    const lines = text.split('\n')
    const totalPages = Math.ceil(lines.length / 50) // Rough estimate

    const startLine = Math.floor((topicPages.startPage / totalPages) * lines.length)
    const endLine = Math.floor((topicPages.endPage / totalPages) * lines.length)

    return lines.slice(startLine, endLine).join('\n').slice(0, 15000)
  }

  // Return first 15K chars if no page range
  return doc.extracted_text.slice(0, 15000)
}

/**
 * Get all topics covered in a week of the study plan.
 */
async function getWeekTopics(
  studyPlanId: string,
  userId: string,
  weekNumber: number
): Promise<Array<{ topic: string; documentId: string }>> {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('study_plan_sessions')
    .select('topic, document_id, topics')
    .eq('study_plan_id', studyPlanId)
    .eq('user_id', userId)
    .eq('week_number', weekNumber)

  if (error) {
    throw new Error('Failed to fetch week sessions')
  }

  const topics: Array<{ topic: string; documentId: string }> = []
  const seenTopics = new Set<string>()

  for (const session of sessions || []) {
    // Get topic from session
    const topicName = session.topic || session.topics?.[0]?.name
    if (topicName && !seenTopics.has(topicName)) {
      seenTopics.add(topicName)
      topics.push({
        topic: topicName,
        documentId: session.document_id,
      })
    }
  }

  return topics
}

/**
 * Parse AI response into structured questions.
 */
function parseQuestions(response: string): ExamQuestion[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*"questions"[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const questions = parsed.questions || []

    return questions.map((q: Record<string, unknown>, index: number) => ({
      id: `q-${Date.now()}-${index}`,
      question: String(q.question || ''),
      type: (q.type as QuestionType) || 'multiple_choice',
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      correctAnswer: String(q.correctAnswer || ''),
      explanation: String(q.explanation || ''),
      difficulty: (q.difficulty as DifficultyLevel) || 'medium',
      topic: String(q.topic || ''),
      points: Number(q.points) || 1,
    }))
  } catch (error) {
    console.error('[SessionExamGenerator] Failed to parse questions:', error)
    return []
  }
}

// ============================================
// Main Functions
// ============================================

/**
 * Generate a daily quiz for a study session.
 */
export async function generateDailyQuiz(
  options: DailyQuizOptions
): Promise<GeneratedExam> {
  const {
    sessionId,
    userId,
    documentId,
    topicFocus,
    topicPages,
    questionCount = 7,
  } = options

  const supabase = await createClient()

  // Get document content
  let pageContext = ''
  try {
    const content = await getDocumentContent(documentId, topicPages)
    pageContext = `\n\nDocument content:\n${content.slice(0, 10000)}`
  } catch (err) {
    console.warn('[SessionExamGenerator] Could not fetch document content:', err)
  }

  // Generate questions using AI
  const provider = getProviderForFeature('exam')
  const prompt = DAILY_QUIZ_PROMPT
    .replace('{questionCount}', questionCount.toString())
    .replace('{topic}', topicFocus)
    .replace('{pageContext}', pageContext)

  const response = await provider.generateText({
    messages: [
      {
        role: 'system',
        content: 'You are an expert quiz generator. Generate high-quality questions that test understanding. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    maxTokens: 2000,
  })

  const questions = parseQuestions(response.text)

  if (questions.length === 0) {
    throw new Error('Failed to generate quiz questions')
  }

  // Calculate totals
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const estimatedMinutes = Math.ceil(questions.length * 1.5) // ~1.5 min per question

  // Save to database
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      document_id: documentId,
      title: `Daily Quiz: ${topicFocus}`,
      exam_type: 'daily_quiz',
      questions: questions,
      question_count: questions.length,
      total_points: totalPoints,
      estimated_minutes: estimatedMinutes,
      topics_covered: [topicFocus],
      session_id: sessionId,
      status: 'ready',
    })
    .select()
    .single()

  if (examError) {
    console.error('[SessionExamGenerator] Failed to save exam:', examError)
    throw new Error('Failed to save quiz')
  }

  return {
    id: exam.id,
    title: `Daily Quiz: ${topicFocus}`,
    examType: 'daily_quiz',
    questions,
    totalPoints,
    estimatedMinutes,
    topicsCovered: [topicFocus],
  }
}

/**
 * Generate a weekly comprehensive exam.
 */
export async function generateWeeklyExam(
  options: WeeklyExamOptions
): Promise<GeneratedExam> {
  const {
    studyPlanId,
    userId,
    weekNumber,
    questionCount = 20,
  } = options

  const supabase = await createClient()

  // Get all topics from the week
  const weekTopics = await getWeekTopics(studyPlanId, userId, weekNumber)

  if (weekTopics.length === 0) {
    throw new Error('No topics found for this week')
  }

  // Get content for each topic
  const topicsWithContent: string[] = []
  for (const { topic, documentId } of weekTopics) {
    try {
      const content = await getDocumentContent(documentId)
      topicsWithContent.push(`## ${topic}\n${content.slice(0, 3000)}`)
    } catch {
      topicsWithContent.push(`## ${topic}`)
    }
  }

  // Generate questions using AI
  const provider = getProviderForFeature('exam')
  const prompt = WEEKLY_EXAM_PROMPT
    .replace('{questionCount}', questionCount.toString())
    .replace('{topics}', topicsWithContent.join('\n\n'))

  const response = await provider.generateText({
    messages: [
      {
        role: 'system',
        content: 'You are an expert exam generator. Generate comprehensive exam questions that test mastery across multiple topics. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    maxTokens: 4000,
  })

  const questions = parseQuestions(response.text)

  if (questions.length === 0) {
    throw new Error('Failed to generate exam questions')
  }

  // Calculate totals
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const estimatedMinutes = Math.ceil(questions.length * 2) // ~2 min per question

  // Get study plan for title
  const { data: plan } = await supabase
    .from('study_plans')
    .select('title')
    .eq('id', studyPlanId)
    .single()

  const examTitle = `Week ${weekNumber} Exam: ${plan?.title || 'Study Plan'}`

  // Save to database
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      title: examTitle,
      exam_type: 'weekly_exam',
      questions: questions,
      question_count: questions.length,
      total_points: totalPoints,
      estimated_minutes: estimatedMinutes,
      topics_covered: weekTopics.map((t) => t.topic),
      study_plan_id: studyPlanId,
      week_number: weekNumber,
      status: 'ready',
    })
    .select()
    .single()

  if (examError) {
    console.error('[SessionExamGenerator] Failed to save exam:', examError)
    throw new Error('Failed to save exam')
  }

  return {
    id: exam.id,
    title: examTitle,
    examType: 'weekly_exam',
    questions,
    totalPoints,
    estimatedMinutes,
    topicsCovered: weekTopics.map((t) => t.topic),
  }
}

/**
 * Get existing exam for a session (daily quiz).
 */
export async function getSessionQuiz(
  sessionId: string,
  userId: string
): Promise<GeneratedExam | null> {
  const supabase = await createClient()

  const { data: exam, error } = await supabase
    .from('exams')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .eq('exam_type', 'daily_quiz')
    .single()

  if (error || !exam) {
    return null
  }

  return {
    id: exam.id,
    title: exam.title,
    examType: 'daily_quiz',
    questions: exam.questions as ExamQuestion[],
    totalPoints: exam.total_points,
    estimatedMinutes: exam.estimated_minutes,
    topicsCovered: exam.topics_covered as string[],
  }
}

/**
 * Get existing weekly exam.
 */
export async function getWeeklyExam(
  studyPlanId: string,
  weekNumber: number,
  userId: string
): Promise<GeneratedExam | null> {
  const supabase = await createClient()

  const { data: exam, error } = await supabase
    .from('exams')
    .select('*')
    .eq('study_plan_id', studyPlanId)
    .eq('week_number', weekNumber)
    .eq('user_id', userId)
    .eq('exam_type', 'weekly_exam')
    .single()

  if (error || !exam) {
    return null
  }

  return {
    id: exam.id,
    title: exam.title,
    examType: 'weekly_exam',
    questions: exam.questions as ExamQuestion[],
    totalPoints: exam.total_points,
    estimatedMinutes: exam.estimated_minutes,
    topicsCovered: exam.topics_covered as string[],
  }
}
