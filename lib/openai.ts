import OpenAI from "openai"
import { Flashcard } from "./types"
import { personalizePrompt, createLearningProfile, type LearningProfile } from "./personalization/personalization-engine"
import type { LearningStyle, TeachingStylePreference } from "./supabase/types"
import { chunkDocument, mergeChunkResults, getChunkingSummary, type ChunkOptions } from "./document-chunker"

export interface FlashcardGenerationOptions {
  variation?: number
  count?: number  // Number of flashcards to generate (overrides auto-calculation)
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

  // Calculate number of flashcards based on content length or use user-specified count
  const wordCount = processedText.split(/\s+/).length
  const minCards = 5
  const maxCards = 200  // Increased from 50 to support user requests up to 200
  const maxCardsPerBatch = 40  // Safe limit per API call to avoid token limits

  let targetCards: number

  if (options.count !== undefined && options.count > 0) {
    // User specified count - respect it but cap at reasonable limits
    targetCards = Math.max(minCards, Math.min(options.count, maxCards))
    console.log(`User requested: ${options.count} flashcards → Using: ${targetCards} flashcards`)
  } else {
    // Auto-calculate: ~1 flashcard per 250 words, min 5, max 30 (default auto mode is more conservative)
    const calculatedCards = Math.floor(wordCount / 250)
    targetCards = Math.max(minCards, Math.min(calculatedCards, 30))
    console.log(`Auto-calculated: ${wordCount} words → ${targetCards} flashcards`)
  }

  // For large counts, we'll use batched generation
  const needsBatching = targetCards > maxCardsPerBatch
  const batchCount = needsBatching ? Math.ceil(targetCards / maxCardsPerBatch) : 1
  const cardsPerBatch = needsBatching ? Math.ceil(targetCards / batchCount) : targetCards

  if (needsBatching) {
    console.log(`Batched generation: ${targetCards} cards in ${batchCount} batches of ~${cardsPerBatch} each`)
  }

  // Helper function to build the prompt for a given batch
  const buildPrompt = (batchNum: number, batchSize: number, existingTerms: string[] = []) => {
    const avoidTermsInstr = existingTerms.length > 0
      ? `\n\nIMPORTANT: Do NOT create flashcards for these terms (already covered in previous batches): ${existingTerms.slice(-30).join(', ')}`
      : ''

    return `You are tasked with extracting flashcard content from a given text chunk. Your goal is to identify key terms and their corresponding definitions or explanations that would be suitable for creating flashcards.

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
${batchNum > 0 ? `7. This is batch ${batchNum + 1} - focus on DIFFERENT concepts than typical/obvious ones.` : ''}

CRITICAL - Source Fidelity Rules (MUST FOLLOW):
- Use ONLY information explicitly stated in the provided text above
- Do NOT add definitions, explanations, or context from your general knowledge
- Do NOT elaborate on concepts beyond what the text actually provides
- If a concept is mentioned but not explained in the text, do NOT create a flashcard for it
- Every word in the "back" field must be directly traceable to the source text
- When in doubt, quote directly from the text rather than paraphrasing with external knowledge
- If the text doesn't provide enough information for ${batchSize} quality flashcards, create fewer flashcards rather than adding external information
${avoidTermsInstr}

Create exactly ${batchSize} flashcards based on the content available (or fewer if insufficient information).

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "front": "Term or concept (keep concise, 1-5 words ideal)",
    "back": "Definition or explanation from the text (clear and educational, under 50 words)"
  }
]

DO NOT include any text outside the JSON array.`
  }

  // Build base prompt (for non-batched or first batch)
  const basePrompt = buildPrompt(0, cardsPerBatch)

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

  // Helper function to make a single API call
  const generateBatch = async (batchPrompt: string, batchTemperature: number): Promise<Flashcard[]> => {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educator who creates concise, clear flashcards from educational content."
        },
        {
          role: "user",
          content: batchPrompt
        }
      ],
      temperature: batchTemperature,
      max_tokens: 4000,  // Increased from 2000 to handle up to 40 flashcards per batch
    })

    let responseText = completion.choices[0]?.message?.content || "[]"

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

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
  }

  try {
    // Add variation to temperature for different results each time
    // Base temperature: 0.3, variation adds 0-0.4 based on variation parameter
    const temperature = Math.min(0.9, 0.3 + (variation * 0.15))

    // If not batching, do a single call
    if (!needsBatching) {
      return await generateBatch(prompt, temperature)
    }

    // Batched generation for large counts
    const allFlashcards: Flashcard[] = []
    const existingTerms: string[] = []

    for (let batch = 0; batch < batchCount; batch++) {
      // Calculate remaining cards needed
      const remaining = targetCards - allFlashcards.length
      const batchSize = Math.min(cardsPerBatch, remaining)

      if (batchSize <= 0) break

      console.log(`Generating batch ${batch + 1}/${batchCount} (${batchSize} cards)...`)

      // Build prompt for this batch (with existing terms to avoid duplicates)
      let batchPrompt = buildPrompt(batch, batchSize, existingTerms)

      // Apply personalization if profile exists
      if (options.learningStyle && options.teachingStylePreference) {
        const profile: LearningProfile = createLearningProfile(
          options.learningStyle,
          options.teachingStylePreference,
          options.varkScores,
          options.socraticPercentage
        )
        batchPrompt = personalizePrompt({ profile, mode: 'flashcards' }, batchPrompt)
      }

      // Vary temperature slightly for each batch to get diverse results
      const batchTemp = Math.min(0.9, temperature + (batch * 0.1))

      try {
        const batchCards = await generateBatch(batchPrompt, batchTemp)

        // Add to results and track terms
        for (const card of batchCards) {
          allFlashcards.push({
            ...card,
            id: `card-${Date.now()}-${allFlashcards.length}`
          })
          existingTerms.push(card.front)
        }

        console.log(`Batch ${batch + 1} complete: ${batchCards.length} cards (total: ${allFlashcards.length})`)
      } catch (batchError) {
        console.error(`Batch ${batch + 1} failed:`, batchError)
        // Continue with other batches even if one fails
        if (allFlashcards.length === 0) {
          throw batchError  // Only throw if no cards generated at all
        }
      }
    }

    console.log(`Batched generation complete: ${allFlashcards.length} total flashcards`)
    return allFlashcards

  } catch (error: unknown) {
    console.error("OpenAI API error:", error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any
    if (err.response) {
      console.error("Response data:", err.response.data)
      console.error("Response status:", err.response.status)
      throw new Error(`OpenAI API error: ${err.response.data?.error?.message || err.message}`)
    } else if (err.message) {
      throw new Error(`OpenAI error: ${err.message}`)
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