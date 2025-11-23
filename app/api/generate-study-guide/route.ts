import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generateStudyGuide, type StudyDuration, type DifficultyLevel } from "@/lib/study-guide-generator"
import { generateStudyGuidePDF, estimatePDFSize } from "@/lib/pdf-generator"
import { getUserProfile, getUserLearningProfile } from "@/lib/supabase/user-profile"
import type { LearningStyle } from "@/lib/supabase/types"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { checkUsageLimit, incrementUsage } from "@/lib/usage-limits"
import { createSSEStream, createSSEHeaders, ProgressTracker } from "@/lib/sse-utils"

export const maxDuration = 300 // 5 minutes max execution time

export async function GET(req: NextRequest) {
  const startTime = Date.now()

  // PRE-CHECKS: Run before streaming
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated study guide generation request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(req, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for study guide generation', { userId })
      return rateLimitResponse
    }

    // Parse query parameters (EventSource uses GET with query params)
    const searchParams = req.nextUrl.searchParams
    const documentId = searchParams.get('documentId')
    const studyDuration = searchParams.get('studyDuration') || '2weeks'
    const difficultyLevel = searchParams.get('difficultyLevel') || 'intermediate'
    const customInstructions = searchParams.get('customInstructions') || undefined

    // Validate required fields
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(userId, 'documents')
    if (!usageCheck.allowed) {
      logger.warn('Study guide generation blocked - usage limit reached', {
        userId,
        tier: usageCheck.tier
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

    logger.debug('Starting study guide generation with streaming', {
      userId,
      documentId,
      studyDuration,
      difficultyLevel
    })

    const stream = createSSEStream(async (send) => {
      const tracker = new ProgressTracker([
        'Fetching document',
        'Analyzing content',
        'Generating study guide',
        'Creating PDF',
        'Finalizing'
      ], send)

      const supabase = await createClient()

      // Step 1: Fetch document with ownership verification
      // documents.user_id is UUID (FK to user_profiles.id)
      tracker.completeStep()

      // Get user profile ID first (same pattern as getUserDocuments)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profileError || !profile) {
        logger.error('User profile not found for study guide generation', {
          userId,
          error: profileError
        })
        throw new Error('User profile not found')
      }

      // Fetch document and verify ownership
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, file_name, extracted_text, user_id')
        .eq('id', documentId)
        .eq('user_id', profile.id) // Verify ownership
        .single()

      if (docError || !document) {
        if (docError?.code === 'PGRST116') {
          // Check if document exists but user doesn't own it
          const { data: anyDocument } = await supabase
            .from('documents')
            .select('id, user_id')
            .eq('id', documentId)
            .single()

          if (anyDocument) {
            logger.warn('Unauthorized document access attempt', {
              userId,
              documentId,
              documentUserId: anyDocument.user_id,
              profileId: profile.id
            })
            throw new Error('Unauthorized access to document')
          }
        }

        logger.error('Document not found for study guide generation', {
          userId,
          documentId,
          error: docError
        })
        throw new Error('Document not found')
      }

      if (!document.extracted_text) {
        throw new Error('Document has no extracted text')
      }

      logger.info('Document fetched for study guide', {
        userId,
        documentId,
        fileName: document.file_name,
        textLength: document.extracted_text.length
      })

      // Step 2: Get user learning preferences
      tracker.completeStep()
      const userProfile = await getUserProfile(userId)
      const learningProfile = await getUserLearningProfile(userId)

      const learningStyle: LearningStyle | undefined = learningProfile?.dominant_style || userProfile?.learning_style

      logger.info('User preferences loaded', {
        userId,
        learningStyle,
        difficultyLevel
      })

      // Step 3: Generate study guide content
      tracker.completeStep()
      const studyGuideContent = await generateStudyGuide({
        text: document.extracted_text,
        documentTitle: document.file_name,
        studyDuration: studyDuration as StudyDuration,
        difficultyLevel: difficultyLevel as DifficultyLevel,
        learningStyle,
        customInstructions
      })

      logger.info('Study guide content generated', {
        userId,
        documentId,
        conceptCount: studyGuideContent.keyConcepts.length,
        questionCount: studyGuideContent.practiceQuestions.multipleChoice.length
      })

      // Step 4: Generate PDF
      tracker.completeStep()
      const pdfBlob = await generateStudyGuidePDF({
        studyGuide: studyGuideContent,
        documentTitle: document.file_name,
        studyDuration,
        difficultyLevel
      })

      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
      const pdfSize = pdfBuffer.length

      logger.info('PDF generated', {
        userId,
        documentId,
        pdfSize
      })

      // Step 5: Upload PDF to Supabase Storage
      tracker.completeStep()
      const fileName = `study-guides/${userId}/${documentId}-${Date.now()}.pdf`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Save study guide to database
      const { data: studyGuide, error: insertError } = await supabase
        .from('study_guides')
        .insert({
          user_id: profile.id,
          document_id: documentId,
          title: studyGuideContent.title,
          content: studyGuideContent,
          study_duration: studyDuration,
          difficulty_level: difficultyLevel,
          pdf_url: publicUrl,
          pdf_size: pdfSize,
          generation_status: 'completed'
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to save study guide: ${insertError.message}`)
      }

      // Track usage
      await incrementUsage(userId, 'documents')

      logger.info('Study guide saved to database', {
        userId,
        documentId,
        studyGuideId: studyGuide.id
      })

      // Send completion
      send({
        type: 'complete',
        data: {
          id: studyGuide.id,
          title: studyGuide.title,
          pdfUrl: publicUrl,
          pdfSize,
          conceptCount: studyGuideContent.keyConcepts.length,
          questionCount: studyGuideContent.practiceQuestions.multipleChoice.length +
            studyGuideContent.practiceQuestions.shortAnswer.length +
            studyGuideContent.practiceQuestions.essay.length
        }
      })
    })

    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error) {
    logger.error('Study guide generation error:', error)

    // Return streaming error if in stream, otherwise regular error
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate study guide' },
      { status: 500 }
    )
  }
}
