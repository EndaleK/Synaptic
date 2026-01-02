/**
 * Exam Question Generator
 * Uses AI to generate exam questions from document text
 */

import { getProviderForFeature, providerFactory, type AIProvider } from './ai'
import type { QuestionType, Difficulty, ExamDifficulty } from './supabase/types'
import { logger } from './logger'

export interface ExamQuestionResult {
  question_text: string
  question_type: QuestionType
  correct_answer: string
  options?: string[] // For MCQ and True/False
  explanation?: string
  source_reference?: string
  difficulty?: Difficulty
  topic?: string
}

export interface ExamGenerationOptions {
  questionCount: number
  difficulty: ExamDifficulty
  questionTypes?: QuestionType[] // If not provided, mix of all types
  topics?: string[] // Specific topics to focus on (optional)
  includeExplanations?: boolean
}

export interface ExamGenerationResult {
  questions: ExamQuestionResult[]
  provider: string
  providerReason: string
}

/**
 * Generate exam questions from document text using AI
 */
export async function generateExamQuestions(
  documentText: string,
  options: ExamGenerationOptions
): Promise<ExamGenerationResult> {
  const {
    questionCount,
    difficulty,
    questionTypes = ['mcq', 'true_false', 'short_answer'],
    topics,
    includeExplanations = true
  } = options

  // Get provider (use configured provider for 'exam' feature)
  let provider = getProviderForFeature('exam')

  if (!provider.isConfigured()) {
    throw new Error(`AI provider not configured. Please add the appropriate API key to your environment variables.`)
  }

  logger.info('Generating exam questions', {
    provider: provider.name,
    questionCount,
    difficulty,
    textLength: documentText.length
  })

  // Truncate text if too long (keep first ~40K chars)
  const maxChars = 40000
  const truncatedText = documentText.length > maxChars
    ? documentText.substring(0, maxChars) + '\n\n[Document truncated for processing]'
    : documentText

  // Build difficulty instruction
  let difficultyInstruction = ''
  if (difficulty === 'easy') {
    difficultyInstruction = 'Focus on fundamental concepts and recall. Questions should test basic understanding.'
  } else if (difficulty === 'medium') {
    difficultyInstruction = 'Focus on application and analysis. Questions should require understanding and reasoning.'
  } else if (difficulty === 'hard') {
    difficultyInstruction = 'Focus on synthesis and evaluation. Questions should require critical thinking and complex reasoning.'
  } else {
    difficultyInstruction = 'Mix of easy, medium, and hard difficulty levels to provide comprehensive assessment.'
  }

  // Build question type distribution
  let questionTypeInstruction = ''
  if (questionTypes.length === 1) {
    questionTypeInstruction = `All questions should be ${questionTypes[0]} type.`
  } else {
    questionTypeInstruction = `Mix of question types: ${questionTypes.join(', ')}. Distribute evenly.`
  }

  // Build topic focus instruction
  let topicInstruction = ''
  if (topics && topics.length > 0) {
    topicInstruction = `Focus on these specific topics: ${topics.join(', ')}.`
  }

  const prompt = `You are an expert exam question writer. Generate ${questionCount} high-quality exam questions from the following document.

${difficultyInstruction}
${questionTypeInstruction}
${topicInstruction}

CRITICAL FORMATTING RULES:
1. Return ONLY a valid JSON array, no other text
2. Each question must have: question_text, question_type, correct_answer
3. For MCQ questions: provide "options" array with 4 choices
4. For True/False questions: provide "options" array with ["True", "False"]
5. For short_answer questions: no options needed
6. ${includeExplanations ? 'Always include an "explanation" for why the correct answer is right' : 'Explanations are optional'}
7. Include "difficulty" field with value: "easy", "medium", or "hard"
8. Include "topic" field with the main subject area
9. Include "source_reference" if you can identify where in the text the answer is found

Question Types:
- "mcq": Multiple choice with 4 options
- "true_false": True/False question
- "short_answer": Brief written response (1-2 sentences)

Example format:
[
  {
    "question_text": "What is the primary function of mitochondria?",
    "question_type": "mcq",
    "correct_answer": "Energy production through cellular respiration",
    "options": [
      "Energy production through cellular respiration",
      "Protein synthesis",
      "DNA replication",
      "Waste removal"
    ],
    "explanation": "Mitochondria are known as the powerhouse of the cell because they generate ATP through oxidative phosphorylation.",
    "difficulty": "medium",
    "topic": "Cell Biology",
    "source_reference": "Section 2.3"
  }
]

Document text:
${truncatedText}

Generate ${questionCount} exam questions now. Return ONLY the JSON array, no other text:`

  // Helper function to attempt generation with a provider
  async function attemptGeneration(aiProvider: AIProvider): Promise<string> {
    const response = await aiProvider.complete(
      [
        {
          role: 'system',
          content: 'You are an expert exam question writer. You MUST respond with ONLY valid JSON, no markdown code blocks, no explanatory text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.7,
        maxTokens: 4000
      }
    )
    return response.content.trim()
  }

  try {
    let rawResponse: string
    let usedProvider = provider

    try {
      rawResponse = await attemptGeneration(provider)
    } catch (primaryError) {
      // Check if this is an authentication error - try fallback providers
      const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError)
      const isAuthError = errorMessage.includes('authentication_error') ||
                          errorMessage.includes('invalid') ||
                          errorMessage.includes('401') ||
                          errorMessage.includes('api_key') ||
                          errorMessage.includes('API key')

      if (isAuthError) {
        logger.warn(`Primary provider ${provider.name} authentication failed, trying fallbacks`, {
          error: errorMessage
        })

        // Try OpenAI as fallback
        const openaiProvider = providerFactory.getProvider('openai')
        if (openaiProvider.isConfigured()) {
          try {
            logger.info('Attempting exam generation with OpenAI fallback')
            rawResponse = await attemptGeneration(openaiProvider)
            usedProvider = openaiProvider
          } catch (openaiError) {
            // Try DeepSeek as last resort
            const deepseekProvider = providerFactory.getProvider('deepseek')
            if (deepseekProvider.isConfigured()) {
              logger.info('Attempting exam generation with DeepSeek fallback')
              rawResponse = await attemptGeneration(deepseekProvider)
              usedProvider = deepseekProvider
            } else {
              throw primaryError // Re-throw original error if no fallbacks work
            }
          }
        } else {
          // Try DeepSeek directly if OpenAI not configured
          const deepseekProvider = providerFactory.getProvider('deepseek')
          if (deepseekProvider.isConfigured()) {
            logger.info('Attempting exam generation with DeepSeek fallback')
            rawResponse = await attemptGeneration(deepseekProvider)
            usedProvider = deepseekProvider
          } else {
            throw primaryError
          }
        }
      } else {
        throw primaryError // Re-throw non-auth errors
      }
    }

    // Update provider reference for logging
    provider = usedProvider

    logger.debug('Raw AI response for exam generation', {
      provider: provider.name,
      responseLength: rawResponse.length,
      preview: rawResponse.substring(0, 200)
    })

    // Clean response (remove markdown code blocks if present)
    let cleanedResponse = rawResponse
    if (rawResponse.startsWith('```json')) {
      cleanedResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim()
    } else if (rawResponse.startsWith('```')) {
      cleanedResponse = rawResponse.replace(/```\n?/g, '').trim()
    }

    // Parse JSON response
    const questions: ExamQuestionResult[] = JSON.parse(cleanedResponse)

    if (!Array.isArray(questions)) {
      throw new Error('AI response is not a valid array of questions')
    }

    // Validate and clean each question
    const validatedQuestions = questions.map((q, index) => {
      if (!q.question_text || !q.question_type || !q.correct_answer) {
        throw new Error(`Question ${index + 1} is missing required fields`)
      }

      // Validate question type
      if (!['mcq', 'true_false', 'short_answer'].includes(q.question_type)) {
        throw new Error(`Question ${index + 1} has invalid question_type: ${q.question_type}`)
      }

      // Ensure MCQ and True/False have options
      if (q.question_type === 'mcq' && (!q.options || q.options.length < 2)) {
        throw new Error(`MCQ question ${index + 1} must have at least 2 options`)
      }

      if (q.question_type === 'true_false') {
        q.options = ['True', 'False'] // Enforce standard True/False options
      }

      return {
        question_text: q.question_text,
        question_type: q.question_type,
        correct_answer: q.correct_answer,
        options: q.options || null,
        explanation: q.explanation || null,
        source_reference: q.source_reference || null,
        difficulty: (q.difficulty as Difficulty) || 'medium',
        topic: q.topic || null
      }
    })

    logger.info('Exam questions generated successfully', {
      provider: provider.name,
      questionCount: validatedQuestions.length
    })

    return {
      questions: validatedQuestions,
      provider: provider.name,
      providerReason: `Using ${provider.name} for exam generation`
    }

  } catch (error) {
    logger.error('Failed to generate exam questions', error, {
      provider: provider.name,
      questionCount,
      difficulty
    })

    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse AI response as JSON. The AI may have returned invalid data. Please try again.`)
    }

    throw error
  }
}
