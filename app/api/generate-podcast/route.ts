import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generatePodcastScript, type PodcastFormat } from "@/lib/podcast-generator"
import { generatePodcastAudio, VoiceConfig } from "@/lib/tts-generator"
import { concatenateAudioBuffers } from "@/lib/audio-concat"
import { generateTranscript } from "@/lib/audio-utils"
import { getUserProfile, getUserLearningProfile } from "@/lib/supabase/user-profile"
import type { LearningStyle, TeachingStylePreference } from "@/lib/supabase/types"
import { providerFactory } from "@/lib/ai"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { PodcastGenerationSchema } from "@/lib/validation"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { checkUsageLimit, incrementUsage } from "@/lib/usage-limits"
import { extractTextFromPages } from "@/lib/text-extraction"
import { createSSEStream, createSSEHeaders, ProgressTracker } from "@/lib/sse-utils"

export const maxDuration = 300 // 5 minutes max execution time (Vercel limit)

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  // PRE-CHECKS: Run before streaming to catch auth/validation errors early
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated podcast generation request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting (AI tier - 10 requests/min, podcast is expensive)
    const rateLimitResponse = await applyRateLimit(req, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for podcast generation', { userId })
      return rateLimitResponse
    }

    // Parse request body
    const body = await req.json()
    const {
      documentId,
      selection,
      format = 'deep-dive',
      customPrompt,
      targetDuration = 10,
      language = 'en-us',
      voiceHostA,
      voiceHostB
    } = body

    // Build voice config if custom voices are provided
    const voiceConfig: VoiceConfig | undefined = (voiceHostA || voiceHostB) ? {
      hostA: voiceHostA || 'pNInz6obpgDQGcFmaJgB', // Default to Adam
      hostB: voiceHostB || '21m00Tcm4TlvDq8ikWAM'  // Default to Rachel
    } : undefined

    // Validate input
    try {
      PodcastGenerationSchema.parse({
        documentId,
        format,
        customPrompt,
        targetDuration,
        language
      })
    } catch (validationError) {
      logger.warn('Podcast generation validation failed', { userId, error: validationError })
      return NextResponse.json(
        { error: "Invalid input. Check documentId, format, and targetDuration." },
        { status: 400 }
      )
    }

    // Check usage limits based on subscription tier
    const usageCheck = await checkUsageLimit(userId, 'podcasts')
    if (!usageCheck.allowed) {
      logger.warn('Podcast generation blocked - usage limit reached', {
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

    // PRE-CHECKS PASSED: Start streaming response
    logger.debug('Starting podcast generation with streaming', {
      userId,
      documentId,
      format,
      targetDuration
    })

    const stream = createSSEStream(async (send) => {
      // Progress tracker for multi-step process
      const tracker = new ProgressTracker([
        'Fetching document',
        'Extracting content',
        'Loading preferences',
        'Generating script',
        'Generating audio',
        'Uploading podcast',
        'Saving metadata'
      ], send)

      try {
        // Step 1: Fetch document
        tracker.completeStep(1, 'Fetching document...')

        // Initialize Supabase
        const supabase = await createClient()

        // OPTIMIZED: Fetch user profile and document in a single JOIN query
        let { data: documentWithProfile, error: fetchError } = await supabase
          .from('documents')
          .select(`
            id,
            file_name,
            extracted_text,
            storage_path,
            metadata,
            user_id,
            user_profiles!inner (
              id,
              clerk_user_id
            )
          `)
          .eq('id', documentId)
          .eq('user_profiles.clerk_user_id', userId)
          .single()

        if (fetchError || !documentWithProfile) {
          logger.error('Document/profile fetch error for podcast generation', fetchError, {
            userId,
            documentId,
            errorCode: fetchError?.code,
            errorMessage: fetchError?.message,
            errorDetails: fetchError?.details,
            errorHint: fetchError?.hint
          })

          // DEBUGGING: Try multiple fallback queries to understand the issue

          // 1. Check if document exists at all
          const { data: anyDocument, error: docError } = await supabase
            .from('documents')
            .select('id, user_id, file_name, extracted_text')
            .eq('id', documentId)
            .single()

          if (docError) {
            logger.error('Document lookup failed completely', docError, { documentId })
          } else if (anyDocument) {
            logger.info('Document exists', { documentId, userId: anyDocument.user_id, fileName: anyDocument.file_name })

            // 2. Check if user profile exists
            const { data: userProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, clerk_user_id')
              .eq('id', anyDocument.user_id)
              .single()

            if (profileError) {
              logger.error('User profile lookup failed', profileError, { userId: anyDocument.user_id })
            } else if (userProfile) {
              logger.info('Found document owner profile', {
                profileId: userProfile.id,
                clerkUserId: userProfile.clerk_user_id,
                requestClerkUserId: userId,
                match: userProfile.clerk_user_id === userId
              })

              // If the profile matches the requesting user, use this document anyway
              if (userProfile.clerk_user_id === userId) {
                logger.info('User owns document, proceeding despite join failure', { documentId, userId })
                // Create a mock documentWithProfile object
                documentWithProfile = {
                  ...anyDocument,
                  user_profiles: userProfile
                } as any
                // Don't throw error, continue with the request
              }
            }
          }

          // Only throw error if we still don't have the document
          if (!documentWithProfile) {
            throw new Error(fetchError?.code === 'PGRST116' ? 'Document not found or access denied' : 'Failed to fetch document')
          }
        }

        const document = {
          id: documentWithProfile.id,
          file_name: documentWithProfile.file_name,
          extracted_text: documentWithProfile.extracted_text,
          storage_path: documentWithProfile.storage_path,
          metadata: documentWithProfile.metadata,
          user_id: documentWithProfile.user_id
        }

        const profile = {
          id: (documentWithProfile.user_profiles as any).id
        }

        // If no extracted text, try to extract it now (for old documents or large files)
        if (!document.extracted_text && document.storage_path) {
          logger.info('No extracted text found, extracting on-demand', { userId, documentId })
          tracker.completeStep(1, 'Extracting text from PDF...')

          try {
            // Download file from storage
            const { data: fileBlob, error: downloadError} = await supabase
              .storage
              .from('documents')
              .download(document.storage_path)

            if (!downloadError && fileBlob) {
              // Convert Blob to File
              const arrayBuffer = await fileBlob.arrayBuffer()
              const file = new File([arrayBuffer], document.file_name, { type: 'application/pdf' })

              // Extract text using pdf2json
              const { parseServerPDF } = await import('@/lib/server-pdf-parser')
              const parseResult = await parseServerPDF(file)

              if (parseResult.text && parseResult.text.length > 0) {
                document.extracted_text = parseResult.text
                logger.info('On-demand extraction successful', {
                  userId,
                  documentId,
                  textLength: parseResult.text.length,
                  pageCount: parseResult.pageCount
                })

                // Save the extracted text to database for future use
                await supabase
                  .from('documents')
                  .update({
                    extracted_text: parseResult.text,
                    metadata: {
                      ...document.metadata,
                      page_count: parseResult.pageCount || document.metadata?.page_count,
                      extracted_on_demand: true
                    }
                  })
                  .eq('id', documentId)
              } else {
                logger.warn('On-demand extraction yielded no text', { userId, documentId })
              }
            }
          } catch (extractError) {
            logger.error('On-demand extraction failed', extractError, { userId, documentId })
          }
        }

        if (!document.extracted_text) {
          // Check if background extraction is queued
          const isExtractionQueued = document.metadata?.text_extraction_queued === true

          logger.warn('Document has no extracted text (even after on-demand attempt)', { userId, documentId, isExtractionQueued })

          throw new Error(
            isExtractionQueued
              ? "Document is still being processed. Text extraction is happening in the background - please wait a few moments and try again."
              : "Document has no extracted text. This may be a scanned PDF or image-based document that requires OCR."
          )
        }

    // Extract text based on selection (full document, page range, topic, structure, or suggestion)
    let textForPodcast = document.extracted_text
    let selectionDescription = 'full document'

    if (selection) {
      try {
        if (selection.type === 'pages' && selection.pageRange) {
          // PAGE RANGE MODE: Extract text from specific pages
          const { start, end } = selection.pageRange
          selectionDescription = `pages ${start}-${end}`

          logger.info('Podcast generation with page range', {
            userId,
            documentId,
            pageStart: start,
            pageEnd: end,
          })

          textForPodcast = await extractTextFromPages(
            documentId,
            [selection.pageRange],
            { maxLength: 48000 }
          )

        } else if (selection.type === 'topic' && selection.topic) {
          // TOPIC MODE: Extract text from topic's page range
          const topic = selection.topic
          selectionDescription = `topic: ${topic.title}`

          logger.info('Podcast generation with topic', {
            userId,
            documentId,
            topic: topic.title,
            pageRange: topic.pageRange,
          })

          if (topic.pageRange) {
            textForPodcast = await extractTextFromPages(
              documentId,
              [topic.pageRange],
              { maxLength: 48000 }
            )
          }
        } else if (selection.type === 'chapters' && selection.chapterIds && selection.chapters) {
          // CHAPTER MODE: Extract text from selected chapters
          const chapterCount = selection.chapterIds.length
          const chapterNames = selection.chapters
            .filter((ch: any) => selection.chapterIds.includes(ch.id))
            .map((ch: any) => ch.title)
            .slice(0, 3) // Show first 3 chapter names

          selectionDescription = chapterCount === 1
            ? `chapter: ${chapterNames[0]}`
            : `${chapterCount} chapters: ${chapterNames.join(', ')}${chapterCount > 3 ? '...' : ''}`

          logger.info('Podcast generation with chapters', {
            userId,
            documentId,
            chapterCount,
            chapterIds: selection.chapterIds,
          })

          try {
            const { extractChapterText } = await import('@/lib/chapter-extractor')
            textForPodcast = extractChapterText(
              document.extracted_text,
              selection.chapters,
              selection.chapterIds
            )
            // Apply token limit
            textForPodcast = textForPodcast.substring(0, 48000)
          } catch (chapterError) {
            logger.error('Chapter text extraction failed for podcast', chapterError, {
              userId,
              documentId,
              chapterIds: selection.chapterIds,
            })
            // Fallback to full document
            textForPodcast = document.extracted_text
          }
        }

        // Validate extracted text
        if (!textForPodcast || textForPodcast.trim().length === 0) {
          logger.warn('No content found in selection', { userId, documentId, selectionType: selection.type })
          throw new Error('No content found in selected area')
        }

      } catch (error) {
        logger.error('Text extraction failed for podcast', error, { userId, documentId, selection })
        throw new Error('Failed to extract text from selection')
      }
    }

    // Step 2: Content extracted
    tracker.completeStep(2, 'Content extracted successfully')

    logger.debug('Document text prepared for podcast', {
      userId,
      documentId,
      fileName: document.file_name,
      selectionType: selection?.type || 'full',
      selectionDescription,
      textLength: textForPodcast.length
    })

    // Step 3: Loading preferences
    tracker.completeStep(3, 'Loading user preferences...')

    // Fetch user learning profile for personalization
    let personalizationOptions: any = {}

    try {
      // Get user profile
      const { profile } = await getUserProfile(userId)

      if (profile?.id) {
        // Get learning profile
        const { learningProfile } = await getUserLearningProfile(profile.id)

        if (learningProfile && profile.learning_style) {
          personalizationOptions = {
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

          logger.debug('Using personalized podcast', {
            userId,
            learningStyle: profile.learning_style,
            teachingMode: learningProfile.teaching_style_preference
          })
        }
      }
    } catch (profileError) {
      // If profile fetch fails, just continue with default generation
      logger.warn('Could not fetch user profile for podcast personalization', {
        userId,
        error: profileError
      })
    }

    // Select AI provider for script generation
    // Priority: Environment variable (PODCAST_SCRIPT_PROVIDER) > DeepSeek (cost-effective default)
    const envProvider = process.env.PODCAST_SCRIPT_PROVIDER as 'openai' | 'deepseek' | 'anthropic' | undefined
    const selectedProviderType = envProvider || 'deepseek' // Default to DeepSeek for cost savings

    const scriptProvider = providerFactory.getProviderWithFallback(selectedProviderType)

    logger.info('Selected AI provider for podcast script', {
      userId,
      documentId,
      provider: scriptProvider.name,
      reason: envProvider
        ? `Using ${scriptProvider.name} (configured via PODCAST_SCRIPT_PROVIDER environment variable)`
        : `Using ${scriptProvider.name} for cost-effective script generation (60-70% cheaper than OpenAI)`
    })

    // Estimate cost before generation (TTS is expensive)
    const scriptLengthEstimate = Math.min(document.extracted_text.length * 0.3, 5000) // Rough estimate
    const costEstimate = estimateRequestCost('tts-1', scriptLengthEstimate, 0)
    logger.debug('Cost estimate for podcast generation', {
      userId,
      documentId,
      ...costEstimate
    })

    // Step 4: Generate podcast script with selected provider and selected text
    tracker.completeStep(4, 'Generating podcast script...')

    logger.debug('Generating podcast script', {
      userId,
      documentId,
      format,
      language,
      provider: scriptProvider.name,
      selection: selectionDescription
    })

    const script = await generatePodcastScript({
      text: textForPodcast,
      format: format as PodcastFormat,
      customPrompt: customPrompt
        ? customPrompt
        : selection
        ? `Create a podcast covering ${selectionDescription} from the document.`
        : undefined,
      targetDuration,
      language,
      ...personalizationOptions,
      provider: scriptProvider
    })

    logger.debug('Podcast script generated', {
      userId,
      documentId,
      lines: script.lines.length,
      estimatedDuration: script.estimatedDuration
    })

    // Step 5: Generate audio for each line
    tracker.completeStep(5, 'Generating audio from script...')

    logger.debug('Generating podcast audio', {
      userId,
      documentId,
      lineCount: script.lines.length,
      language: script.language,
      voiceConfig: voiceConfig ? { hostA: voiceConfig.hostA, hostB: voiceConfig.hostB } : 'default'
    })
    const audioSegments = await generatePodcastAudio(script.lines, script.language, undefined, voiceConfig)

    // Step 3: Concatenate audio segments
    logger.debug('Concatenating audio segments', { userId, documentId, segmentCount: audioSegments.length })
    const audioBuffer = await concatenateAudioBuffers(audioSegments)

    // Step 4: Generate transcript with timestamps
    const transcript = generateTranscript(audioSegments)
    const totalDuration = transcript[transcript.length - 1]?.endTime || script.estimatedDuration

    // Step 6: Upload to Supabase Storage
    tracker.completeStep(6, 'Uploading podcast to storage...')

    const fileName = `${userId}/${documentId}_${Date.now()}.mp3`
    logger.debug('Uploading podcast to storage', { userId, documentId, fileName, fileSize: audioBuffer.length })

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('podcasts')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      logger.error('Storage upload error for podcast', uploadError, { userId, documentId, fileName })
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    logger.debug('Podcast uploaded successfully', { userId, documentId, path: uploadData.path })

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('podcasts')
      .getPublicUrl(uploadData.path)

    const audioUrl = urlData.publicUrl

    // Step 7: Save podcast metadata to database
    tracker.completeStep(7, 'Saving podcast metadata...')
    const { data: podcast, error: dbError } = await supabase
      .from('podcasts')
      .insert({
        user_id: profile.id, // Use Supabase UUID, not Clerk ID
        document_id: documentId,
        title: script.title,
        script: JSON.stringify(script.lines),
        voice_id: 'alloy_nova', // Indicates we used both voices
        audio_url: audioUrl,
        duration_seconds: Math.ceil(totalDuration),
        file_size: audioBuffer.length,
        generation_status: 'completed'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database save error for podcast - FULL ERROR:', JSON.stringify(dbError, null, 2))
      console.error('Profile ID type:', typeof profile.id, 'Value:', profile.id)
      logger.error('Database save error for podcast', dbError, {
        userId,
        documentId,
        profileId: profile.id,
        profileIdType: typeof profile.id,
        errorCode: dbError.code,
        errorMessage: dbError.message,
        errorDetails: dbError.details,
        errorHint: dbError.hint
      })
      // Report the save failure to the user - they need to know their podcast won't appear in the library
      send({
        type: 'warning',
        message: `Podcast generated but failed to save to library: ${dbError.message}. You can still play it but it won't appear in your saved podcasts.`,
        audioUrl,
        error: dbError.message
      })
    }

    // Step 7: Track usage
    const totalCharacters = script.lines.reduce((sum, line) => sum + line.text.length, 0)

    // Track TTS usage for cost monitoring
    trackUsage(userId, 'tts-1', totalCharacters, 0)

    // Increment usage count for subscription tier limits
    await incrementUsage(userId, 'podcasts')

    await supabase.from('usage_tracking').insert({
      user_id: profile.id, // Use Supabase UUID, not Clerk ID
      action_type: 'podcast_generation',
      tokens_used: totalCharacters,
      metadata: {
        document_id: documentId,
        duration: Math.ceil(totalDuration),
        format
      }
    })

    const duration = Date.now() - startTime
    logger.api('POST', '/api/generate-podcast', 200, duration, {
      userId,
      documentId,
      podcastId: podcast?.id,
      duration: Math.ceil(totalDuration),
      fileSize: audioBuffer.length,
      lineCount: script.lines.length
    })

    logger.debug('Podcast generation complete', {
      userId,
      documentId,
      audioUrl,
      duration: `${duration}ms`
    })

    // Send completion event with podcast data
    send({
      type: 'complete',
      data: {
        success: true,
        podcast: {
          id: podcast?.id,
          title: script.title,
          description: script.description,
          audioUrl,
          duration: Math.ceil(totalDuration),
          fileSize: audioBuffer.length,
          transcript,
          script: script.lines,
          selection: selectionDescription
        }
      }
    })

      } catch (error: unknown) {
        const duration = Date.now() - startTime
        logger.error('Podcast generation error in stream', error, { userId, documentId, duration: `${duration}ms` })
        logger.api('POST', '/api/generate-podcast', 500, duration, { userId, error: error.message })

        // Error will be automatically sent by createSSEStream
        throw error
      }
    })

    // Return streaming response
    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error: unknown) {
    // This catch is for pre-flight checks (auth, rate limiting, validation)
    const duration = Date.now() - startTime
    logger.error('Podcast generation pre-flight error', error, { userId: (await auth()).userId, duration: `${duration}ms` })
    logger.api('POST', '/api/generate-podcast', 500, duration, { error: error.message })

    return NextResponse.json(
      {
        error: error.message || "Failed to generate podcast",
        details: error.stack
      },
      { status: 500 }
    )
  }
}
