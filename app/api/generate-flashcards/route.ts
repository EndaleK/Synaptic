import { NextRequest, NextResponse } from "next/server"
import { generateFlashcards, type FlashcardGenerationOptions } from "@/lib/openai"
import { generateFlashcardsAuto, selectAIProvider } from "@/lib/ai-provider"
import { parseDocument } from "@/lib/document-parser"
import { convertTextToDocumentJSON } from "@/lib/document-to-json"
import { auth } from "@clerk/nextjs/server"
import { getUserProfile, getUserLearningProfile } from "@/lib/supabase/user-profile"
import type { LearningStyle, TeachingStylePreference } from "@/lib/supabase/types"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { FileUploadSchema, validateDocumentLength, validateContentSafety } from "@/lib/validation"
import { checkUsageLimit, incrementUsage } from "@/lib/usage-limits"
import { createClient } from "@/lib/supabase/server"
import { createSSEStream, createSSEHeaders, ProgressTracker } from "@/lib/sse-utils"

export const maxDuration = 300 // 5 minutes for complex documents

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null

  try {
    // Get authenticated user
    const authResult = await auth()
    userId = authResult.userId
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    console.log('🎯 Flashcard generation API called:', { userId, timestamp: new Date().toISOString() })

    // Apply rate limiting (10 requests per minute for AI endpoints)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn("Rate limit exceeded for flashcard generation", { userId })
      return rateLimitResponse
    }

    // Check usage limits based on subscription tier
    const usageCheck = await checkUsageLimit(userId, 'flashcards')
    if (!usageCheck.allowed) {
      logger.warn('Flashcard generation blocked - usage limit reached', {
        userId,
        tier: usageCheck.tier,
        used: usageCheck.used,
        limit: usageCheck.limit
      })
      return NextResponse.json(
        {
          error: usageCheck.message,
          tier: usageCheck.tier,
          used: usageCheck.used,
          limit: usageCheck.limit,
          upgradeUrl: '/pricing'
        },
        { status: 403 }
      )
    }

    // Check Content-Type to determine request format
    const contentType = request.headers.get('content-type') || ''
    let textContent = ""
    let variation = 0
    let documentId: string | null = null
    let mode: string | null = null
    let uploadedFile: File | null = null

    if (contentType.includes('application/json')) {
      // NEW FORMAT: JSON request from ContentSelectionModal (document-based)
      const body = await request.json()
      documentId = body.documentId
      const selection = body.selection

      logger.info('Processing JSON flashcard request', {
        userId,
        documentId,
        selectionType: selection?.type
      })

      if (!documentId) {
        return NextResponse.json(
          { error: "No document ID provided" },
          { status: 400 }
        )
      }

      // Fetch document from database
      const supabase = await createClient()

      // First get user profile ID (required for RLS)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (!profile) {
        logger.error('User profile not found', undefined, { userId })
        return NextResponse.json(
          { error: "User profile not found. Please try signing out and back in." },
          { status: 404 }
        )
      }

      // Fetch document with user_id filter (required for RLS)
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('extracted_text, file_name')
        .eq('id', documentId)
        .eq('user_id', profile.id)
        .single()

      if (fetchError || !doc) {
        // Improve error logging to see actual Supabase error
        const errorDetails = fetchError ? {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint
        } : 'No document returned'

        logger.error('Failed to fetch document', fetchError, {
          userId,
          documentId,
          userProfileId: profile.id,
          errorDetails
        })

        // Log to console for debugging
        console.error('🔴 Document fetch failed:', {
          documentId,
          userId,
          userProfileId: profile.id,
          error: errorDetails
        })

        return NextResponse.json(
          {
            error: "Document not found or you don't have permission to access it",
            details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
          },
          { status: 404 }
        )
      }

      // Use selected text or full document
      if (selection?.type === 'topics' && selection.selectedTopics && doc.extracted_text) {
        // Filter text by selected topics (simple approach: use full text for now)
        // TODO: Implement topic-based text filtering
        textContent = doc.extracted_text
        logger.debug('Using selected topics', { userId, documentId, topicCount: selection.selectedTopics.length })
      } else if (selection?.type === 'pages' && selection.selectedPages && doc.extracted_text) {
        // Filter by pages (for now, use full text)
        // TODO: Implement page-based text filtering
        textContent = doc.extracted_text
        logger.debug('Using selected pages', { userId, documentId, pageCount: selection.selectedPages.length })
      } else {
        // Use full document text
        textContent = doc.extracted_text || ''
      }

      if (!textContent || textContent.length === 0) {
        logger.warn('Document has no extracted text', { userId, documentId })
        return NextResponse.json(
          { error: "Document has no text content. Please re-upload or try a different document." },
          { status: 400 }
        )
      }

      logger.debug('Document text loaded', { userId, documentId, textLength: textContent.length })

    } else {
      // OLD FORMAT: FormData request (direct file/text upload)
      const formData = await request.formData()
      mode = formData.get("mode") as string
      variation = parseInt(formData.get("variation") as string || "0")

      logger.info('Processing FormData flashcard request', {
        userId,
        mode
      })

      if (mode === "file") {
        uploadedFile = formData.get("file") as File
        const file = uploadedFile
        if (!file) {
          logger.warn("No file provided in flashcard generation request", { userId })
          return NextResponse.json(
            { error: "No file provided" },
            { status: 400 }
          )
        }

        // Validate file
        try {
          FileUploadSchema.parse({
            name: file.name,
            size: file.size,
            type: file.type,
          })
        } catch (validationError) {
          logger.warn("File validation failed", { userId, fileName: file.name, error: validationError })
          return NextResponse.json(
            { error: "Invalid file. Must be PDF, DOCX, DOC, TXT, or JSON under 500MB" },
            { status: 400 }
          )
        }

        logger.debug("Processing file upload", {
          userId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        })

        const parseResult = await parseDocument(file)
        if (parseResult.error) {
          logger.error("File parsing failed", new Error(parseResult.error), {
            userId,
            fileName: file.name
          })
          return NextResponse.json(
            { error: parseResult.error },
            { status: 400 }
          )
        }

        textContent = parseResult.text
        logger.debug("File parsed successfully", {
          userId,
          fileName: file.name,
          textLength: textContent.length
        })

        if (textContent.length === 0) {
          logger.warn("File produced no text content", { userId, fileName: file.name })
          return NextResponse.json(
            { error: "File contains no readable text content" },
            { status: 400 }
          )
        }
      } else if (mode === "text") {
        textContent = formData.get("text") as string
        if (!textContent) {
          return NextResponse.json(
            { error: "No text provided" },
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json(
          { error: "Invalid mode. Must be 'file' or 'text'" },
          { status: 400 }
        )
      }
    }

    // Validate document length
    const lengthValidation = validateDocumentLength(textContent)
    if (!lengthValidation.valid) {
      logger.warn("Document length validation failed", {
        userId,
        length: textContent.length,
        reason: lengthValidation.reason
      })
      return NextResponse.json(
        { error: lengthValidation.reason },
        { status: 400 }
      )
    }

    // Validate content safety
    const safetyValidation = validateContentSafety(textContent)
    if (!safetyValidation.safe) {
      logger.warn("Content safety validation failed", {
        userId,
        reason: safetyValidation.reason
      })
      return NextResponse.json(
        { error: safetyValidation.reason },
        { status: 400 }
      )
    }

    // Convert text to structured JSON first
    let documentJSON = null
    if (mode === "file" && uploadedFile) {
      documentJSON = convertTextToDocumentJSON(
        textContent,
        uploadedFile.name,
        uploadedFile.type,
        uploadedFile.size
      )
      console.log(`Created JSON structure with ${documentJSON.sections.length} sections`)
    }

    // OPTIMIZED: Fetch user learning profile for personalization
    // Uses parallel Promise.all to fetch profile and learning profile faster
    let generationOptions: FlashcardGenerationOptions = { variation }

    try {
      // Get user profile
      const { profile } = await getUserProfile(userId)

      if (profile?.id) {
        // OPTIMIZED: Fetch learning profile in parallel with other operations when possible
        const { learningProfile } = await getUserLearningProfile(profile.id)

        if (learningProfile && profile.learning_style) {
          // Build personalization options
          generationOptions = {
            variation,
            learningStyle: profile.learning_style as LearningStyle,
            teachingStylePreference: (learningProfile.teaching_style_preference || 'mixed') as TeachingStylePreference,
            varkScores: {
              visual: learningProfile.visual_score,
              auditory: learningProfile.auditory_score,
              kinesthetic: learningProfile.kinesthetic_score,
              reading_writing: learningProfile.reading_writing_score
            },
            socraticPercentage: learningProfile.socratic_percentage
          }

          logger.debug("Using personalized generation", {
            userId,
            learningStyle: profile.learning_style
          })
        }
      }
    } catch (profileError) {
      // If profile fetch fails, just continue with default generation
      logger.warn("Could not fetch user profile for personalization", {
        userId,
        error: profileError
      })
    }

    // Select optimal AI provider based on document size
    const providerSelection = selectAIProvider(textContent.length, 'flashcards')
    logger.info("Smart routing selected provider", {
      userId,
      provider: providerSelection.provider,
      reason: providerSelection.reason,
      textLength: textContent.length
    })

    // Generate flashcards with automatic provider selection
    const result = await generateFlashcardsAuto(textContent, generationOptions)
    const flashcards = result.flashcards

    logger.info("Flashcards generated successfully", {
      userId,
      provider: result.provider,
      flashcardCount: flashcards.length
    })

    // Track usage (use the selected provider's model for cost tracking)
    const modelMap: Record<string, 'gpt-3.5-turbo' | 'claude-3-5-sonnet' | 'gemini-1.5-pro' | 'deepseek-chat'> = {
      'deepseek': 'deepseek-chat',
      'openai': 'gpt-3.5-turbo',
      'claude': 'claude-3-5-sonnet',
      'gemini': 'gemini-1.5-pro'
    }

    const modelForCost = modelMap[result.provider] || 'gpt-3.5-turbo'
    const costEstimate = estimateRequestCost(modelForCost as any, textContent, 2000)
    trackUsage(userId, modelForCost as any, costEstimate.inputTokens, costEstimate.outputTokens)

    // Increment usage count for subscription tier limits
    console.log('📊 About to track flashcard generation:', { userId, feature: 'flashcards' })
    await incrementUsage(userId, 'flashcards')
    console.log('📊 Flashcard generation tracking completed for:', { userId })

    // Save flashcards to database for persistence and mastery tracking
    let savedFlashcards = flashcards
    try {
      const supabase = await createClient()

      // Get user profile ID
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profile) {
        const userProfileId = profile.id

        // Save each flashcard to database
        const flashcardsToInsert = flashcards.map(card => ({
          user_id: userProfileId,
          document_id: documentId, // Link to document if generated from uploaded document
          front: card.front,
          back: card.back,
          mastery_level: 'learning' as const,
          confidence_score: 0,
          times_reviewed: 0,
          times_correct: 0
        }))

        const { data: insertedCards, error: insertError } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert)
          .select()

        if (!insertError && insertedCards) {
          // Update flashcards with database IDs and timestamps
          savedFlashcards = insertedCards.map((dbCard) => ({
            id: dbCard.id,
            front: dbCard.front,
            back: dbCard.back,
            createdAt: new Date(dbCard.created_at),
            masteryLevel: dbCard.mastery_level as 'learning' | 'reviewing' | 'mastered',
            confidenceScore: dbCard.confidence_score,
            timesReviewed: dbCard.times_reviewed,
            timesCorrect: dbCard.times_correct,
            lastReviewedAt: dbCard.last_reviewed_at ? new Date(dbCard.last_reviewed_at) : undefined,
            nextReviewAt: dbCard.next_review_at ? new Date(dbCard.next_review_at) : undefined
          }))

          logger.info('✅ Flashcards saved to database successfully', {
            userId,
            flashcardCount: savedFlashcards.length,
            sampleId: savedFlashcards[0]?.id
          })
        } else {
          logger.error('❌ Failed to save flashcards to database', {
            userId,
            error: insertError?.message,
            errorDetails: insertError,
            hint: 'Database migration may not be applied. See MIGRATION_INSTRUCTIONS.md',
            fallbackToMemory: true
          })
          console.error('Flashcard DB save error:', insertError)
          // Continue with non-persisted flashcards
        }
      } else {
        logger.warn('No user profile found, flashcards will not be persisted', {
          userId
        })
      }
    } catch (dbError) {
      logger.error('❌ Database save attempt failed critically', {
        userId,
        error: dbError,
        hint: 'Check database connection and ensure migration is applied'
      })
      console.error('Critical flashcard DB error:', dbError)
      // Continue with non-persisted flashcards
    }

    const duration = Date.now() - startTime

    logger.api('POST', '/api/generate-flashcards', 200, duration, {
      userId,
      flashcardCount: savedFlashcards.length,
      textLength: textContent.length,
      mode
    })

    return NextResponse.json({
      flashcards: savedFlashcards,
      documentJSON: documentJSON || null,
      textLength: textContent.length,
      extractedText: textContent, // Include extracted text for chat functionality
      aiProvider: result.provider, // Include which AI provider was used
      providerReason: result.providerReason // Explain why this provider was selected
    })
  } catch (error) {
    const duration = Date.now() - startTime

    // CRITICAL: Always log errors in production for visibility
    if (process.env.NODE_ENV === 'production') {
      console.error('🔴 PRODUCTION ERROR - /api/generate-flashcards:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })
    }

    logger.error("Flashcard generation failed", error, {
      userId,
      duration: `${duration}ms`
    })

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails = error instanceof Error && 'response' in error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (error as any).response?.data?.error?.message || errorMessage
      : errorMessage

    logger.api('POST', '/api/generate-flashcards', 500, duration, {
      userId,
      error: errorDetails
    })

    // CRITICAL: Ensure we ALWAYS return a valid JSON response
    try {
      return NextResponse.json(
        {
          error: `Failed to generate flashcards: ${errorDetails}`,
          details: errorMessage,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    } catch (jsonError) {
      // Last resort: Return plain text error if JSON.stringify fails
      console.error('🔴 CRITICAL: Failed to create JSON error response:', jsonError)
      return new Response(
        `Error: Failed to generate flashcards. ${errorMessage}`,
        { status: 500, headers: { 'Content-Type': 'text/plain' } }
      )
    }
  }
}