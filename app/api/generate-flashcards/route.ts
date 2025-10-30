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
import { canGenerateFlashcards, trackFlashcardGeneration } from "@/lib/usage-tracker"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Get authenticated user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Apply rate limiting (10 requests per minute for AI endpoints)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn("Rate limit exceeded for flashcard generation", { userId })
      return rateLimitResponse
    }

    // Check usage limits (free tier: 50 flashcard generations/month)
    const usageCheck = canGenerateFlashcards(userId, 'free') // TODO: Get actual tier from user profile
    if (!usageCheck.allowed) {
      logger.warn('Flashcard generation blocked - usage limit reached', {
        userId,
        reason: usageCheck.reason,
        currentUsage: usageCheck.currentUsage
      })
      return NextResponse.json(
        {
          error: usageCheck.reason,
          currentUsage: usageCheck.currentUsage,
          upgradeUrl: '/pricing'
        },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const mode = formData.get("mode") as string
    const variation = parseInt(formData.get("variation") as string || "0")
    let textContent = ""

    if (mode === "file") {
      const file = formData.get("file") as File
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
        { error: "Invalid mode" },
        { status: 400 }
      )
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
    if (mode === "file") {
      const file = formData.get("file") as File
      documentJSON = convertTextToDocumentJSON(
        textContent,
        file.name,
        file.type,
        file.size
      )
      console.log(`Created JSON structure with ${documentJSON.sections.length} sections`)
    }

    // Fetch user learning profile for personalization
    let generationOptions: FlashcardGenerationOptions = { variation }

    try {
      // Get user profile
      const { profile } = await getUserProfile(userId)

      if (profile?.id) {
        // Get learning profile
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
    const modelMap: Record<string, 'gpt-3.5-turbo' | 'claude-3-5-sonnet' | 'gemini-1.5-pro'> = {
      'openai': 'gpt-3.5-turbo',
      'claude': 'claude-3-5-sonnet',
      'gemini': 'gemini-1.5-pro'
    }

    const modelForCost = modelMap[result.provider] || 'gpt-3.5-turbo'
    const costEstimate = estimateRequestCost(modelForCost, textContent, 2000)
    trackUsage(userId, modelForCost, costEstimate.inputTokens, costEstimate.outputTokens)

    // Track flashcard generation for usage limits
    trackFlashcardGeneration(userId, 'free') // TODO: Get actual tier from user profile

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
          document_id: null, // No document association for direct text/file generation
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
          savedFlashcards = insertedCards.map((dbCard, index) => ({
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

          logger.info('Flashcards saved to database', {
            userId,
            flashcardCount: savedFlashcards.length
          })
        } else {
          logger.warn('Failed to save flashcards to database', {
            userId,
            error: insertError?.message,
            fallbackToMemory: true
          })
          // Continue with non-persisted flashcards
        }
      }
    } catch (dbError) {
      logger.warn('Database save attempt failed, continuing with session-only flashcards', {
        userId,
        error: dbError
      })
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

    return NextResponse.json(
      { error: `Failed to generate flashcards: ${errorDetails}` },
      { status: 500 }
    )
  }
}