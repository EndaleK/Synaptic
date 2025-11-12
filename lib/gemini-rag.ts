/**
 * Gemini RAG Integration
 *
 * Provides RAG functionality using Gemini's 2M token context window
 * for large documents (>800K characters). Bypasses vector database
 * by loading full document context directly.
 */

import { createClient } from '@/lib/supabase/server'
import { chatWithGemini, generateFlashcardsWithGemini, generateGeminiCompletion } from '@/lib/gemini'
import { logger } from '@/lib/logger'

export interface GeminiRAGOptions {
  maxTokens?: number
  temperature?: number
}

export interface QueryDocumentResult {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Load full document text for Gemini RAG
 * Uses Gemini's 2M token context window to process entire document
 *
 * @param documentId - UUID of the document
 * @param userId - Clerk user ID for authorization
 * @returns Full document text
 */
export async function loadDocumentForGemini(
  documentId: string,
  userId: string
): Promise<string> {
  try {
    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('extracted_text, file_name')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found or unauthorized')
    }

    if (!document.extracted_text || document.extracted_text.trim().length === 0) {
      throw new Error('Document has no extracted text')
    }

    logger.info('Loaded document for Gemini RAG', {
      documentId,
      fileName: document.file_name,
      textLength: document.extracted_text.length,
    })

    return document.extracted_text
  } catch (error) {
    logger.error('Failed to load document for Gemini', error, { documentId, userId })
    throw error
  }
}

/**
 * Query a document using Gemini RAG (chat interface)
 *
 * @param documentId - UUID of the document
 * @param userId - Clerk user ID
 * @param userMessage - User's question
 * @param conversationHistory - Previous chat messages
 * @param teachingMode - Teaching style for AI responses
 * @returns AI response
 */
export async function queryDocumentWithGemini(
  documentId: string,
  userId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  teachingMode: 'direct' | 'socratic' | 'guided' = 'direct'
): Promise<string> {
  try {
    // Load full document text
    const documentText = await loadDocumentForGemini(documentId, userId)

    logger.info('Querying document with Gemini', {
      documentId,
      userId,
      documentLength: documentText.length,
      conversationLength: conversationHistory.length,
      teachingMode,
    })

    // Use existing chatWithGemini function
    const response = await chatWithGemini(
      documentText,
      conversationHistory,
      userMessage,
      teachingMode
    )

    return response
  } catch (error) {
    logger.error('Gemini document query failed', error, {
      documentId,
      userId,
      userMessage: userMessage.substring(0, 100),
    })
    throw error
  }
}

/**
 * Generate flashcards from a document using Gemini RAG
 *
 * @param documentId - UUID of the document
 * @param userId - Clerk user ID
 * @param targetCards - Number of flashcards to generate
 * @param selectedTopics - Optional array of topics to focus on
 * @returns Array of flashcard objects
 */
export async function generateFlashcardsWithGeminiRAG(
  documentId: string,
  userId: string,
  targetCards: number = 30,
  selectedTopics?: string[]
): Promise<any[]> {
  try {
    // Load full document text
    let documentText = await loadDocumentForGemini(documentId, userId)

    // If specific topics selected, add context to focus generation
    if (selectedTopics && selectedTopics.length > 0) {
      documentText = `Focus on these specific topics: ${selectedTopics.join(', ')}\n\n${documentText}`
      logger.info('Generating flashcards with topic filter', {
        documentId,
        topics: selectedTopics,
      })
    }

    logger.info('Generating flashcards with Gemini RAG', {
      documentId,
      userId,
      documentLength: documentText.length,
      targetCards,
    })

    // Use existing generateFlashcardsWithGemini function
    const flashcards = await generateFlashcardsWithGemini(documentText, targetCards)

    logger.info('Flashcards generated successfully', {
      documentId,
      flashcardsGenerated: flashcards.length,
    })

    return flashcards
  } catch (error) {
    logger.error('Gemini flashcard generation failed', error, {
      documentId,
      userId,
      targetCards,
    })
    throw error
  }
}

/**
 * Generate custom content from a document using Gemini RAG
 * Generic function for mind maps, podcasts, exams, etc.
 *
 * @param documentId - UUID of the document
 * @param userId - Clerk user ID
 * @param prompt - Custom generation prompt
 * @param options - Generation options
 * @returns Generated content
 */
export async function generateContentWithGeminiRAG(
  documentId: string,
  userId: string,
  prompt: string,
  options: GeminiRAGOptions = {}
): Promise<QueryDocumentResult> {
  try {
    // Load full document text
    const documentText = await loadDocumentForGemini(documentId, userId)

    logger.info('Generating custom content with Gemini RAG', {
      documentId,
      userId,
      documentLength: documentText.length,
      promptLength: prompt.length,
    })

    // Build full prompt with document context
    const fullPrompt = `Here is the document content:\n\n${documentText}\n\n${prompt}`

    // Generate using Gemini
    const result = await generateGeminiCompletion(
      [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      {
        temperature: options.temperature ?? 0.3,
        maxTokens: options.maxTokens ?? 2000,
      }
    )

    logger.info('Content generated successfully', {
      documentId,
      responseLength: result.content.length,
      tokensUsed: result.usage.totalTokens,
    })

    return {
      content: result.content,
      usage: result.usage,
    }
  } catch (error) {
    logger.error('Gemini content generation failed', error, {
      documentId,
      userId,
    })
    throw error
  }
}

/**
 * Check if Gemini RAG is available (API key configured)
 */
export function isGeminiRAGAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}
