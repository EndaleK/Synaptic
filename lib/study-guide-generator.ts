import { getProviderForFeature, type AIProvider } from "./ai"
import type { Message } from "./ai/providers/base"
import type { LearningStyle } from "./supabase/types"

export type StudyDuration = '1week' | '2weeks' | '1month' | 'custom'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface StudyGuideSection {
  title: string
  content: string
  subsections?: StudyGuideSection[]
}

export interface StudyGuideContent {
  title: string
  summary: string
  learningObjectives: string[]
  keyConcepts: StudyGuideSection[]
  practiceQuestions: {
    multipleChoice: Array<{
      question: string
      options: string[]
      correctAnswer: number
      explanation: string
    }>
    shortAnswer: string[]
    essay: string[]
  }
  studySchedule: {
    timeline: string
    milestones: Array<{
      day: number
      topic: string
      activities: string[]
    }>
  }
  resources: string[]
}

interface GenerateStudyGuideOptions {
  text: string
  documentTitle: string
  studyDuration?: StudyDuration
  difficultyLevel?: DifficultyLevel
  learningStyle?: LearningStyle
  customInstructions?: string
  provider?: AIProvider
}

/**
 * Generate a comprehensive study guide from document text
 * Includes summary, objectives, key concepts, practice questions, and study schedule
 */
export async function generateStudyGuide(
  options: GenerateStudyGuideOptions
): Promise<StudyGuideContent> {
  const {
    text,
    documentTitle,
    studyDuration = '2weeks',
    difficultyLevel = 'intermediate',
    learningStyle,
    customInstructions,
    provider: customProvider
  } = options

  // Get provider (use DeepSeek for cost-effective long-form text generation)
  const provider = customProvider || getProviderForFeature('study_guide')

  if (!provider.isConfigured()) {
    throw new Error(`AI provider not configured. Please add the appropriate API key to your environment variables.`)
  }

  console.log(`[Study Guide] Using ${provider.name} provider for generation`)

  // Truncate if necessary
  const maxChars = 48000
  let processedText = text
  if (text.length > maxChars) {
    processedText = text.substring(0, maxChars)
    const lastSentence = processedText.lastIndexOf('. ')
    if (lastSentence > maxChars * 0.8) {
      processedText = processedText.substring(0, lastSentence + 1)
    }
    console.log(`[Study Guide] Truncated text from ${text.length} to ${processedText.length} characters`)
  }

  // Build duration context
  const durationMap = {
    '1week': 7,
    '2weeks': 14,
    '1month': 30,
    'custom': 14
  }
  const studyDays = durationMap[studyDuration]

  // Build learning style adaptations
  let learningStyleGuidance = ''
  if (learningStyle) {
    const styleAdaptations = {
      visual: 'Include suggestions for diagrams, charts, mind maps, and visual organization techniques.',
      auditory: 'Include suggestions for verbal explanations, discussions, recordings, and mnemonic devices.',
      kinesthetic: 'Include suggestions for hands-on activities, practice problems, and real-world applications.',
      reading_writing: 'Focus on detailed notes, written summaries, and text-based learning strategies.',
      mixed: 'Include a balanced mix of visual, auditory, kinesthetic, and reading/writing strategies.'
    }
    learningStyleGuidance = styleAdaptations[learningStyle] || ''
  }

  // Build difficulty level guidance
  const difficultyGuidance = {
    beginner: 'Use simple language, define all terms, provide foundational context, and focus on core concepts. Practice questions should be straightforward.',
    intermediate: 'Assume some background knowledge, balance conceptual understanding with application, include moderate-difficulty practice questions.',
    advanced: 'Use technical language, focus on nuanced understanding and connections, include challenging practice questions that require critical thinking.'
  }

  const systemPrompt = `You are an expert educational content creator specializing in comprehensive study guides. Create detailed, structured study guides that help students master complex material efficiently.`

  const userPrompt = `Create a comprehensive study guide for the following document titled "${documentTitle}".

**Study Parameters:**
- Study Duration: ${studyDays} days
- Difficulty Level: ${difficultyLevel}
${learningStyle ? `- Learning Style: ${learningStyle}` : ''}

**Difficulty Guidance:**
${difficultyGuidance[difficultyLevel]}

${learningStyleGuidance ? `**Learning Style Adaptations:**\n${learningStyleGuidance}` : ''}

${customInstructions ? `**Custom Instructions:**\n${customInstructions}` : ''}

**Document Content:**
${processedText}

**Required Structure:**
Generate a study guide with the following sections in valid JSON format:

{
  "title": "string (engaging study guide title)",
  "summary": "string (2-3 paragraph executive summary)",
  "learningObjectives": ["string (specific, measurable learning objectives, 5-8 items)"],
  "keyConcepts": [
    {
      "title": "string (main topic)",
      "content": "string (detailed explanation)",
      "subsections": [
        {
          "title": "string (subtopic)",
          "content": "string (explanation)"
        }
      ]
    }
  ],
  "practiceQuestions": {
    "multipleChoice": [
      {
        "question": "string",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "string"
      }
    ],
    "shortAnswer": ["string (question)"],
    "essay": ["string (essay prompt)"]
  },
  "studySchedule": {
    "timeline": "string (overview of ${studyDays}-day plan)",
    "milestones": [
      {
        "day": 1,
        "topic": "string",
        "activities": ["string (specific study activities)"]
      }
    ]
  },
  "resources": ["string (recommended additional resources, books, websites, videos)"]
}

**Important:**
- Generate 10-15 multiple choice questions
- Generate 5-8 short answer questions
- Generate 2-3 essay prompts
- Distribute study schedule across ${studyDays} days with clear milestones
- Ensure content depth matches ${difficultyLevel} level
- Return ONLY valid JSON, no additional text`

  try {
    const response = await provider.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        temperature: 0.7,
        maxTokens: 4000
      }
    )

    const content = response.content.trim()

    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
    const jsonContent = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content

    const studyGuide: StudyGuideContent = JSON.parse(jsonContent)

    console.log(`[Study Guide] Generated guide with ${studyGuide.keyConcepts.length} key concepts and ${studyGuide.practiceQuestions.multipleChoice.length} practice questions`)

    return studyGuide
  } catch (error) {
    console.error('[Study Guide] Generation failed:', error)
    throw new Error(`Failed to generate study guide: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Estimate word count and reading time for study guide
 */
export function estimateStudyGuideStats(content: StudyGuideContent): {
  wordCount: number
  estimatedReadingTimeMinutes: number
  totalQuestions: number
} {
  const countWords = (text: string): number => text.split(/\s+/).length

  let totalWords = 0
  totalWords += countWords(content.summary)
  totalWords += content.learningObjectives.join(' ').split(/\s+/).length

  content.keyConcepts.forEach(concept => {
    totalWords += countWords(concept.content)
    concept.subsections?.forEach(sub => {
      totalWords += countWords(sub.content)
    })
  })

  const totalQuestions =
    content.practiceQuestions.multipleChoice.length +
    content.practiceQuestions.shortAnswer.length +
    content.practiceQuestions.essay.length

  const estimatedReadingTimeMinutes = Math.ceil(totalWords / 200) // Average reading speed: 200 WPM

  return {
    wordCount: totalWords,
    estimatedReadingTimeMinutes,
    totalQuestions
  }
}
