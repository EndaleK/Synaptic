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

export interface GuideDayQuizOptions {
  guideDayId: string
  planId: string
  userId: string
  documentId: string
  topics: Array<{ title: string; pageRange?: { start: number; end: number } }>
  questionCount?: number
}

export interface ChapterExamOptions {
  studyPlanId: string
  userId: string
  chapterId: string
  chapterTitle: string
  documentId: string
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

const GUIDE_DAY_QUIZ_PROMPT = `Generate a quick daily quiz to test understanding of today's study topics.

Create {questionCount} questions that:
1. Cover all of today's topics proportionally
2. Include a mix of multiple choice (70%) and true/false (30%)
3. Focus on key concepts and immediate retention
4. Have clear, unambiguous answers
5. Include brief explanations for each answer

Today's topics:
{topics}

Document content:
{content}

Respond with a JSON array of questions in this format:
{
  "questions": [
    {
      "question": "The question text",
      "type": "multiple_choice" | "true_false",
      "options": ["A", "B", "C", "D"], // Only for multiple_choice
      "correctAnswer": "The correct answer",
      "explanation": "Brief explanation of why this is correct",
      "difficulty": "easy" | "medium",
      "topic": "The specific topic this question covers",
      "points": 1-2
    }
  ]
}`;

const CHAPTER_EXAM_PROMPT = `Generate a comprehensive chapter completion exam to assess mastery of this chapter.

Create {questionCount} questions that:
1. Thoroughly test understanding of the entire chapter
2. Include all question types (multiple choice: 50%, short answer: 25%, true/false: 15%, fill in blank: 10%)
3. Range across all difficulty levels (easy: 25%, medium: 50%, hard: 25%)
4. Test both conceptual understanding and practical application
5. Include detailed explanations for each answer
6. Cover all key topics from the chapter

Chapter: {chapterTitle}

Chapter content:
{content}

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

  const response = await provider.complete(
    [
      {
        role: 'system',
        content: 'You are an expert quiz generator. Generate high-quality questions that test understanding. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      temperature: 0.7,
      maxTokens: 2000,
    }
  )

  const questions = parseQuestions(response.content)

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

  const response = await provider.complete(
    [
      {
        role: 'system',
        content: 'You are an expert exam generator. Generate comprehensive exam questions that test mastery across multiple topics. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      temperature: 0.7,
      maxTokens: 4000,
    }
  )

  const questions = parseQuestions(response.content)

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

/**
 * Generate a daily quiz for a study guide day (all topics for the day).
 */
export async function generateGuideDayQuiz(
  options: GuideDayQuizOptions
): Promise<GeneratedExam> {
  const {
    guideDayId,
    planId,
    userId,
    documentId,
    topics,
    questionCount = 8,
  } = options

  const supabase = await createClient()

  // Get document content
  let content = ''
  try {
    // Combine content from all topic page ranges
    const docResult = await supabase
      .from('documents')
      .select('extracted_text')
      .eq('id', documentId)
      .single()

    if (docResult.data?.extracted_text) {
      const text = docResult.data.extracted_text
      // Get sections for each topic if page ranges specified
      for (const topic of topics) {
        if (topic.pageRange?.start && topic.pageRange?.end) {
          const lines = text.split('\n')
          const totalPages = Math.ceil(lines.length / 50)
          const startLine = Math.floor((topic.pageRange.start / totalPages) * lines.length)
          const endLine = Math.floor((topic.pageRange.end / totalPages) * lines.length)
          content += `\n## ${topic.title}\n${lines.slice(startLine, endLine).join('\n').slice(0, 5000)}\n`
        }
      }
      // If no page ranges, use first portion
      if (!content) {
        content = text.slice(0, 12000)
      }
    }
  } catch (err) {
    console.warn('[SessionExamGenerator] Could not fetch document content:', err)
  }

  // Build topics list for prompt
  const topicsList = topics.map(t => `- ${t.title}`).join('\n')

  // Generate questions using AI
  const provider = getProviderForFeature('exam')
  const prompt = GUIDE_DAY_QUIZ_PROMPT
    .replace('{questionCount}', questionCount.toString())
    .replace('{topics}', topicsList)
    .replace('{content}', content.slice(0, 15000))

  const response = await provider.complete(
    [
      {
        role: 'system',
        content: 'You are an expert quiz generator. Generate high-quality daily quiz questions that test understanding of the day\'s study material. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      temperature: 0.7,
      maxTokens: 2500,
    }
  )

  const questions = parseQuestions(response.content)

  if (questions.length === 0) {
    throw new Error('Failed to generate quiz questions')
  }

  // Calculate totals
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const estimatedMinutes = Math.ceil(questions.length * 1.5)

  // Get the date for the title
  const { data: guideDay } = await supabase
    .from('study_guide_days')
    .select('date')
    .eq('id', guideDayId)
    .single()

  const dateStr = guideDay?.date ? new Date(guideDay.date).toLocaleDateString() : 'Today'
  const quizTitle = `Daily Quiz - ${dateStr}`

  // Save to database
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      document_id: documentId,
      title: quizTitle,
      exam_type: 'daily_quiz',
      questions: questions,
      question_count: questions.length,
      total_points: totalPoints,
      estimated_minutes: estimatedMinutes,
      topics_covered: topics.map(t => t.title),
      study_plan_id: planId,
      guide_day_id: guideDayId,
      status: 'ready',
    })
    .select()
    .single()

  if (examError) {
    console.error('[SessionExamGenerator] Failed to save guide day quiz:', examError)
    throw new Error('Failed to save quiz')
  }

  // Update guide day to mark quiz as available
  await supabase
    .from('study_guide_days')
    .update({
      has_daily_quiz: true,
      daily_quiz_id: exam.id,
    })
    .eq('id', guideDayId)

  return {
    id: exam.id,
    title: quizTitle,
    examType: 'daily_quiz',
    questions,
    totalPoints,
    estimatedMinutes,
    topicsCovered: topics.map(t => t.title),
  }
}

/**
 * Generate a chapter completion exam.
 */
export async function generateChapterExam(
  options: ChapterExamOptions
): Promise<GeneratedExam> {
  const {
    studyPlanId,
    userId,
    chapterId,
    chapterTitle,
    documentId,
    questionCount = 25,
  } = options

  const supabase = await createClient()

  // Get all topics from this chapter's sessions
  const { data: chapterSessions } = await supabase
    .from('study_plan_sessions')
    .select('topic, topic_pages')
    .eq('plan_id', studyPlanId)
    .eq('chapter_id', chapterId)

  // Get document content for the chapter
  let content = ''
  try {
    const docResult = await supabase
      .from('documents')
      .select('extracted_text')
      .eq('id', documentId)
      .single()

    if (docResult.data?.extracted_text) {
      const text = docResult.data.extracted_text

      // Try to get content from chapter sessions' page ranges
      for (const session of chapterSessions || []) {
        const pages = session.topic_pages as { startPage?: number; endPage?: number } | null
        if (pages?.startPage && pages?.endPage) {
          const lines = text.split('\n')
          const totalPages = Math.ceil(lines.length / 50)
          const startLine = Math.floor((pages.startPage / totalPages) * lines.length)
          const endLine = Math.floor((pages.endPage / totalPages) * lines.length)
          content += `\n## ${session.topic}\n${lines.slice(startLine, endLine).join('\n').slice(0, 3000)}\n`
        }
      }

      // Fallback to first portion if no page ranges
      if (!content) {
        content = text.slice(0, 20000)
      }
    }
  } catch (err) {
    console.warn('[SessionExamGenerator] Could not fetch document content:', err)
  }

  // Generate questions using AI
  const provider = getProviderForFeature('exam')
  const prompt = CHAPTER_EXAM_PROMPT
    .replace('{questionCount}', questionCount.toString())
    .replace('{chapterTitle}', chapterTitle)
    .replace('{content}', content.slice(0, 20000))

  const response = await provider.complete(
    [
      {
        role: 'system',
        content: 'You are an expert exam generator. Generate comprehensive chapter completion exam questions that thoroughly test mastery of the material. Include a variety of question types and difficulty levels. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      temperature: 0.7,
      maxTokens: 5000,
    }
  )

  const questions = parseQuestions(response.content)

  if (questions.length === 0) {
    throw new Error('Failed to generate exam questions')
  }

  // Calculate totals
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const estimatedMinutes = Math.ceil(questions.length * 2.5) // ~2.5 min per question for comprehensive exam

  const examTitle = `Chapter Completion: ${chapterTitle}`
  const topicsCovered = (chapterSessions || [])
    .map(s => s.topic)
    .filter((t): t is string => Boolean(t))

  // Save to database
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      document_id: documentId,
      title: examTitle,
      exam_type: 'chapter_completion',
      questions: questions,
      question_count: questions.length,
      total_points: totalPoints,
      estimated_minutes: estimatedMinutes,
      topics_covered: topicsCovered,
      study_plan_id: studyPlanId,
      chapter_id: chapterId,
      chapter_title: chapterTitle,
      status: 'ready',
    })
    .select()
    .single()

  if (examError) {
    console.error('[SessionExamGenerator] Failed to save chapter exam:', examError)
    throw new Error('Failed to save exam')
  }

  return {
    id: exam.id,
    title: examTitle,
    examType: 'chapter_completion' as 'daily_quiz', // TODO: Extend type
    questions,
    totalPoints,
    estimatedMinutes,
    topicsCovered,
  }
}

/**
 * Get existing guide day quiz.
 */
export async function getGuideDayQuiz(
  guideDayId: string,
  userId: string
): Promise<GeneratedExam | null> {
  const supabase = await createClient()

  const { data: exam, error } = await supabase
    .from('exams')
    .select('*')
    .eq('guide_day_id', guideDayId)
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
 * Get existing chapter exam.
 */
export async function getChapterExam(
  studyPlanId: string,
  chapterId: string,
  userId: string
): Promise<GeneratedExam | null> {
  const supabase = await createClient()

  const { data: exam, error } = await supabase
    .from('exams')
    .select('*')
    .eq('study_plan_id', studyPlanId)
    .eq('chapter_id', chapterId)
    .eq('user_id', userId)
    .eq('exam_type', 'chapter_completion')
    .single()

  if (error || !exam) {
    return null
  }

  return {
    id: exam.id,
    title: exam.title,
    examType: 'chapter_completion' as 'daily_quiz',
    questions: exam.questions as ExamQuestion[],
    totalPoints: exam.total_points,
    estimatedMinutes: exam.estimated_minutes,
    topicsCovered: exam.topics_covered as string[],
  }
}
