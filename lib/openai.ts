import OpenAI from "openai"
import { Flashcard } from "./types"
import { personalizePrompt, createLearningProfile, type LearningProfile } from "./personalization/personalization-engine"
import type { LearningStyle, TeachingStylePreference } from "./supabase/types"
import { chunkDocument, mergeChunkResults, getChunkingSummary, type ChunkOptions } from "./document-chunker"

export interface FlashcardGenerationOptions {
  variation?: number
  learningStyle?: LearningStyle
  teachingStylePreference?: TeachingStylePreference
  varkScores?: {
    visual: number
    auditory: number
    kinesthetic: number
    reading_writing: number
  }
  socraticPercentage?: number
}

export async function generateFlashcards(
  text: string,
  optionsOrVariation: FlashcardGenerationOptions | number = 0
): Promise<Flashcard[]> {
  // Handle backward compatibility: if number passed, treat as variation
  const options: FlashcardGenerationOptions = typeof optionsOrVariation === 'number'
    ? { variation: optionsOrVariation }
    : optionsOrVariation

  const variation = options.variation || 0
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Safety check: truncate if text is still too long (backup safety net)
  const maxChars = 45000 // Conservative limit to ensure we stay under token limits
  let processedText = text

  if (text.length > maxChars) {
    // Try to truncate at a sentence boundary
    processedText = text.substring(0, maxChars)
    const lastSentence = processedText.lastIndexOf('. ')
    if (lastSentence > maxChars * 0.8) {
      processedText = processedText.substring(0, lastSentence + 1)
    }
    console.log(`Flashcard generation: Text truncated from ${text.length} to ${processedText.length} characters`)
  }

  // Calculate number of flashcards based on content length
  // ~1 flashcard per 200-300 words, min 5, max 30
  const wordCount = processedText.split(/\s+/).length
  const minCards = 5
  const maxCards = 30
  const calculatedCards = Math.floor(wordCount / 250)
  const targetCards = Math.max(minCards, Math.min(calculatedCards, maxCards))

  console.log(`Content: ${wordCount} words → Target: ${targetCards} flashcards`)

  // Build base prompt
  let basePrompt = `You are tasked with extracting flashcard content from a given text chunk. Your goal is to identify key terms and their corresponding definitions or explanations that would be suitable for creating flashcards.

Here's the text chunk you need to analyze:
<text_chunk>
${processedText}
</text_chunk>

Guidelines for extracting flashcard content:
1. Identify important terms, concepts, or phrases that are central to the text's topic.
2. For each term, find a corresponding definition, explanation, or key information from the text.
3. Ensure that the term and definition pairs are concise and clear.
4. Extract only the most relevant and significant information.
5. Aim for a balance between comprehensiveness and brevity.
6. Generate different flashcards each time by focusing on varied aspects of the content.

CRITICAL - Source Fidelity Rules (MUST FOLLOW):
- Use ONLY information explicitly stated in the provided text above
- Do NOT add definitions, explanations, or context from your general knowledge
- Do NOT elaborate on concepts beyond what the text actually provides
- If a concept is mentioned but not explained in the text, do NOT create a flashcard for it
- Every word in the "back" field must be directly traceable to the source text
- When in doubt, quote directly from the text rather than paraphrasing with external knowledge
- If the text doesn't provide enough information for ${targetCards} quality flashcards, create fewer flashcards rather than adding external information

Create exactly ${targetCards} flashcards based on the content available (or fewer if insufficient information).

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "front": "Term or concept (keep concise, 1-5 words ideal)",
    "back": "Definition or explanation from the text (clear and educational, under 50 words)"
  }
]

DO NOT include any text outside the JSON array.`

  // Apply personalization if learning profile provided
  let prompt = basePrompt
  if (options.learningStyle && options.teachingStylePreference) {
    const profile: LearningProfile = createLearningProfile(
      options.learningStyle,
      options.teachingStylePreference,
      options.varkScores,
      options.socraticPercentage
    )

    prompt = personalizePrompt({ profile, mode: 'flashcards' }, basePrompt)
    console.log(`Applied personalization: ${options.learningStyle} learner, ${options.teachingStylePreference} teaching`)
  }

  try {
    // Add variation to temperature for different results each time
    // Base temperature: 0.3, variation adds 0-0.4 based on variation parameter
    const temperature = Math.min(0.9, 0.3 + (variation * 0.15))

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educator who creates concise, clear flashcards from educational content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: 2000,
    })

    let responseText = completion.choices[0]?.message?.content || "[]"
    
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    
    try {
      const parsedFlashcards = JSON.parse(responseText)
      
      if (!Array.isArray(parsedFlashcards)) {
        throw new Error("Response is not an array")
      }

      return parsedFlashcards.map((card, index) => ({
        id: `card-${Date.now()}-${index}`,
        front: card.front || "",
        back: card.back || "",
        createdAt: new Date()
      }))
    } catch {
      console.error("Failed to parse AI response:", responseText)
      throw new Error("Failed to parse flashcard data")
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: unknown) {
    console.error("OpenAI API error:", error)
    if (error.response) {
      console.error("Response data:", error.response.data)
      console.error("Response status:", error.response.status)
      throw new Error(`OpenAI API error: ${error.response.data?.error?.message || error.message}`)
    } else if (error.message) {
      throw new Error(`OpenAI error: ${error.message}`)
    } else {
      throw new Error("Failed to generate flashcards")
    }
  }
}

/**
 * Generate flashcards from large documents by chunking them intelligently
 * Returns progress callback for UI updates
 */
export async function generateFlashcardsChunked(
  text: string,
  options: FlashcardGenerationOptions = {},
  chunkOptions: ChunkOptions = {},
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Flashcard[]> {
  console.log(`[Chunked Flashcards] Starting chunked generation for ${text.length} characters`)

  // Chunk the document
  const chunkingResult = chunkDocument(text, chunkOptions)
  console.log(`[Chunked Flashcards] ${getChunkingSummary(chunkingResult)}`)

  if (onProgress) {
    onProgress(0, chunkingResult.totalChunks, `Divided into ${chunkingResult.totalChunks} chunks`)
  }

  // Process each chunk
  const allFlashcards: Flashcard[][] = []

  for (let i = 0; i < chunkingResult.chunks.length; i++) {
    const chunk = chunkingResult.chunks[i]
    const progressMsg = `Processing chunk ${i + 1}/${chunkingResult.totalChunks} (${chunk.metadata.wordCount} words)`

    console.log(`[Chunked Flashcards] ${progressMsg}`)

    if (onProgress) {
      onProgress(i + 1, chunkingResult.totalChunks, progressMsg)
    }

    try {
      // Generate flashcards for this chunk
      const chunkFlashcards = await generateFlashcards(chunk.text, options)
      allFlashcards.push(chunkFlashcards)

      console.log(`[Chunked Flashcards] Generated ${chunkFlashcards.length} flashcards from chunk ${i + 1}`)
    } catch (error) {
      console.error(`[Chunked Flashcards] Error processing chunk ${i + 1}:`, error)
      // Continue with other chunks even if one fails
      allFlashcards.push([])
    }
  }

  // Merge and deduplicate flashcards
  const deduplicateFn = (flashcards: Flashcard[]) => {
    const seen = new Set<string>()
    return flashcards.filter(card => {
      const key = `${card.front.toLowerCase()}:${card.back.toLowerCase()}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  const mergedFlashcards = mergeChunkResults(allFlashcards, deduplicateFn)

  console.log(`[Chunked Flashcards] Final result: ${mergedFlashcards.length} unique flashcards from ${chunkingResult.totalChunks} chunks`)

  if (onProgress) {
    onProgress(
      chunkingResult.totalChunks,
      chunkingResult.totalChunks,
      `Complete! Generated ${mergedFlashcards.length} flashcards`
    )
  }

  return mergedFlashcards
}