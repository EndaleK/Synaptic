import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generatePodcastScript } from "@/lib/podcast-generator"
import { generatePodcastAudio } from "@/lib/tts-generator"
import { concatenateAudioBuffers, generateTranscript } from "@/lib/audio-utils"
import { getUserProfile, getUserLearningProfile } from "@/lib/supabase/user-profile"
import type { LearningStyle, TeachingStylePreference } from "@/lib/supabase/types"
import { providerFactory } from "@/lib/ai"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { checkUsageLimit, incrementUsage } from "@/lib/usage-limits"
import { createSSEStream, createSSEHeaders, ProgressTracker } from "@/lib/sse-utils"

export const maxDuration = 300 // 5 minutes max execution time (Vercel limit)

interface QuickSummaryRequest {
  inputType: 'document' | 'url' | 'youtube'
  documentId?: string // For document uploads
  url?: string // For web URLs
  youtubeUrl?: string // For YouTube videos
  language?: string
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  // PRE-CHECKS: Run before streaming to catch auth/validation errors early
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated quick summary request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting (AI tier - same as podcasts)
    const rateLimitResponse = await applyRateLimit(req, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for quick summary', { userId })
      return rateLimitResponse
    }

    // Parse request body
    const body: QuickSummaryRequest = await req.json()
    const {
      inputType,
      documentId,
      url,
      youtubeUrl,
      language = 'en-us'
    } = body

    // Validate input
    if (!inputType || !['document', 'url', 'youtube'].includes(inputType)) {
      return NextResponse.json(
        { error: "Invalid input type. Must be 'document', 'url', or 'youtube'." },
        { status: 400 }
      )
    }

    if (inputType === 'document' && !documentId) {
      return NextResponse.json({ error: "documentId required for document input" }, { status: 400 })
    }

    if (inputType === 'url' && !url) {
      return NextResponse.json({ error: "url required for URL input" }, { status: 400 })
    }

    if (inputType === 'youtube' && !youtubeUrl) {
      return NextResponse.json({ error: "youtubeUrl required for YouTube input" }, { status: 400 })
    }

    // Check usage limits (free tier: 10/month, premium: unlimited)
    const usageCheck = await checkUsageLimit(userId, 'quick_summaries')
    if (!usageCheck.allowed) {
      logger.warn('Quick summary blocked - usage limit reached', {
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
    logger.debug('Starting quick summary generation with streaming', {
      userId,
      inputType,
      documentId,
      url,
      youtubeUrl
    })

    const stream = createSSEStream(async (send) => {
      // Progress tracker for quick summary (5 steps)
      const tracker = new ProgressTracker([
        'Fetching content',
        'Preparing summary',
        'Generating audio',
        'Uploading',
        'Finalizing'
      ], send)

      try {
        // Initialize Supabase
        const supabase = await createClient()

        // Step 1: Fetch content based on input type
        tracker.completeStep(1, 'Fetching content...')

        let textContent = ''
        let title = ''
        let sourceDescription = ''

        if (inputType === 'document') {
          // DOCUMENT MODE: Fetch document from database
          let { data: documentWithProfile, error: fetchError } = await supabase
            .from('documents')
            .select(`
              id,
              file_name,
              extracted_text,
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
            logger.error('Document fetch error for quick summary', fetchError, { userId, documentId })

            // FALLBACK: Try fetching without join and verify ownership manually
            const { data: anyDocument, error: docError } = await supabase
              .from('documents')
              .select('id, user_id, file_name, extracted_text, metadata')
              .eq('id', documentId)
              .single()

            if (docError || !anyDocument) {
              logger.error('Document lookup failed completely', docError, { documentId })
              throw new Error('Document not found')
            }

            // Verify ownership via user profile
            const { data: userProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, clerk_user_id')
              .eq('id', anyDocument.user_id)
              .single()

            if (profileError || !userProfile) {
              logger.error('User profile lookup failed', profileError, { userId: anyDocument.user_id })
              throw new Error('Access denied')
            }

            if (userProfile.clerk_user_id !== userId) {
              logger.warn('User does not own document', {
                documentId,
                documentOwnerId: userProfile.clerk_user_id,
                requestUserId: userId
              })
              throw new Error('Access denied')
            }

            // User owns document, construct the response
            logger.info('Using fallback document fetch', { documentId, userId })
            documentWithProfile = {
              ...anyDocument,
              user_profiles: userProfile
            } as any
          }

          if (!documentWithProfile.extracted_text) {
            throw new Error('Document has no extracted text. This may be a scanned PDF that requires OCR.')
          }

          // Check document size (cap at 10MB equivalent ~48K chars)
          const textLength = documentWithProfile.extracted_text.length
          if (textLength > 48000) {
            logger.warn('Document too large for quick summary', { userId, documentId, textLength })
            throw new Error('Document is too large for a quick summary (>10MB). Try the full podcast feature for longer content.')
          }

          textContent = documentWithProfile.extracted_text
          title = documentWithProfile.file_name
          sourceDescription = `document: ${documentWithProfile.file_name}`

        } else if (inputType === 'url') {
          // URL MODE: Import web page content
          tracker.updateProgress('Extracting text from web page...')

          // Check if URL is a PDF (common with arXiv, research papers)
          if (url!.toLowerCase().endsWith('.pdf') || url!.includes('/pdf/')) {
            throw new Error('This appears to be a PDF URL. Please download the PDF and use the Document upload tab instead.')
          }

          try {
            const { webPageImporter } = await import('@/lib/importers/web-page')
            const importResult = await webPageImporter.extract(url!)

            if (!importResult.success || !importResult.text) {
              throw new Error(importResult.error || 'Failed to extract text from URL')
            }

            // Check content size
            if (importResult.text.length > 48000) {
              logger.warn('Web page too large for quick summary', { userId, url, textLength: importResult.text.length })
              throw new Error('This web page is too long for a quick summary. Try the full podcast feature.')
            }

            textContent = importResult.text
            title = importResult.metadata?.title || url!
            sourceDescription = `web page: ${url}`
          } catch (urlError: any) {
            logger.error('URL import failed for quick summary', urlError, { userId, url })

            // Provide helpful error message based on error type
            if (urlError.message?.includes('parse5') || urlError.message?.includes('JSDOM')) {
              throw new Error('Unable to extract content from this URL. Please try: (1) Download the page as a PDF and upload it, or (2) Copy the text and paste it into a document.')
            } else if (urlError.message?.includes('HTTP')) {
              throw new Error(`Failed to access URL: ${urlError.message}`)
            } else {
              throw new Error(urlError.message || 'Failed to extract content from URL')
            }
          }

        } else if (inputType === 'youtube') {
          // YOUTUBE MODE: Extract transcript
          tracker.updateProgress('Extracting YouTube transcript...')

          try {
            const { fetchYouTubeTranscriptWithRetry } = await import('@/lib/youtube-transcript-fetcher')

            // Extract video ID from URL
            const videoIdMatch = youtubeUrl!.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
            if (!videoIdMatch) {
              throw new Error('Invalid YouTube URL format')
            }
            const videoId = videoIdMatch[1]

            logger.info('Fetching YouTube transcript', { userId, videoId, youtubeUrl })

            // Fetch transcript
            const transcriptResult = await fetchYouTubeTranscriptWithRetry(videoId)

            if (!transcriptResult.segments || transcriptResult.segments.length === 0) {
              logger.error('YouTube transcript fetch failed - no segments', {
                userId,
                videoId,
                result: transcriptResult
              })
              throw new Error('This video does not have captions/subtitles available. Please try a different video or use the Document tab to upload a transcript.')
            }

            // Combine transcript segments into full text
            const fullTranscript = transcriptResult.segments
              .map(segment => segment.text)
              .join(' ')

            // Check video duration (cap at ~30 minutes = ~4500 words = ~27K chars)
            if (fullTranscript.length > 30000) {
              logger.warn('YouTube video too long for quick summary', { userId, videoId, textLength: fullTranscript.length })
              throw new Error('This video is too long for a quick summary (>30 minutes). Try the full podcast feature.')
            }

            textContent = fullTranscript
            title = `YouTube Video ${videoId}`
            sourceDescription = `YouTube video: ${youtubeUrl}`

            logger.info('YouTube transcript extracted successfully', {
              userId,
              videoId,
              segmentCount: transcriptResult.segments.length,
              textLength: fullTranscript.length
            })
          } catch (youtubeError: any) {
            logger.error('YouTube processing error', youtubeError, { userId, youtubeUrl })
            throw youtubeError
          }
        }

        logger.debug('Content fetched for quick summary', {
          userId,
          inputType,
          textLength: textContent.length,
          title
        })

        // Step 2: Prepare summary
        tracker.completeStep(2, 'Preparing 5-minute summary...')

        // Fetch user learning profile for personalization
        let personalizationOptions: any = {}

        try {
          const { profile } = await getUserProfile(userId)

          if (profile?.id) {
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
            }
          }
        } catch (profileError) {
          logger.warn('Could not fetch user profile for quick summary personalization', {
            userId,
            error: profileError
          })
        }

        // Select AI provider (DeepSeek for cost-effectiveness)
        const scriptProvider = providerFactory.getProviderWithFallback('deepseek')

        logger.info('Generating quick summary script', {
          userId,
          provider: scriptProvider.name,
          targetDuration: 5,
          sourceType: inputType
        })

        // Generate podcast script with 5-minute target and 'brief' format
        const script = await generatePodcastScript({
          text: textContent,
          format: 'brief', // Brief format for concise overview
          customPrompt: `Create an energetic, fast-paced 5-minute summary of ${sourceDescription}. Focus on the key takeaways and most important concepts. Make it engaging and easy to follow!`,
          targetDuration: 5, // Fixed 5 minutes
          language,
          ...personalizationOptions,
          provider: scriptProvider
        })

        logger.debug('Quick summary script generated', {
          userId,
          lines: script.lines.length,
          estimatedDuration: script.estimatedDuration
        })

        // Step 3: Generate audio
        tracker.completeStep(3, 'Generating audio...')

        logger.debug('Generating quick summary audio', {
          userId,
          lineCount: script.lines.length,
          language: script.language
        })

        const audioSegments = await generatePodcastAudio(script.lines, script.language)

        // Concatenate audio segments
        logger.debug('Concatenating audio segments', { userId, segmentCount: audioSegments.length })
        const audioBuffer = concatenateAudioBuffers(audioSegments)

        // Generate transcript with timestamps
        const transcript = generateTranscript(audioSegments)
        const totalDuration = transcript[transcript.length - 1]?.endTime || script.estimatedDuration

        // Step 4: Upload to storage
        tracker.completeStep(4, 'Uploading to storage...')

        const fileName = `quick-summaries/${userId}/${Date.now()}.mp3`
        logger.debug('Uploading quick summary to storage', { userId, fileName, fileSize: audioBuffer.length })

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('podcasts')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          logger.error('Storage upload error for quick summary', uploadError, { userId, fileName })
          throw new Error(`Failed to upload audio: ${uploadError.message}`)
        }

        logger.debug('Quick summary uploaded successfully', { userId, path: uploadData.path })

        // Get public URL
        const { data: urlData } = supabase
          .storage
          .from('podcasts')
          .getPublicUrl(uploadData.path)

        const audioUrl = urlData.publicUrl

        // Step 5: Save metadata to database
        tracker.completeStep(5, 'Finalizing...')

        // Get user profile ID
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (!userProfile) {
          throw new Error('User profile not found')
        }

        // Save to podcasts table with quick_summary metadata
        const { data: podcast, error: dbError } = await supabase
          .from('podcasts')
          .insert({
            user_id: userProfile.id,
            document_id: inputType === 'document' ? documentId : null,
            title: `Quick Summary: ${title}`,
            script: JSON.stringify(script.lines),
            voice_id: 'alloy_nova',
            audio_url: audioUrl,
            duration_seconds: Math.ceil(totalDuration),
            file_size: audioBuffer.length,
            generation_status: 'completed',
            metadata: {
              summary_type: 'quick',
              input_type: inputType,
              source_url: inputType === 'url' ? url : inputType === 'youtube' ? youtubeUrl : undefined,
              target_duration: 5
            }
          })
          .select()
          .single()

        if (dbError) {
          logger.error('Database save error for quick summary', dbError, { userId })
          // Don't fail the request, audio is already uploaded
        }

        // Track usage
        const totalCharacters = script.lines.reduce((sum, line) => sum + line.text.length, 0)

        // Track TTS usage for cost monitoring
        trackUsage(userId, 'tts-1', totalCharacters, 0)

        // Increment usage count for subscription tier limits
        await incrementUsage(userId, 'quick_summaries')

        await supabase.from('usage_tracking').insert({
          user_id: userProfile.id,
          action_type: 'quick_summary_generation',
          tokens_used: totalCharacters,
          metadata: {
            input_type: inputType,
            duration: Math.ceil(totalDuration)
          }
        })

        const duration = Date.now() - startTime
        logger.api('POST', '/api/generate-quick-summary', 200, duration, {
          userId,
          inputType,
          podcastId: podcast?.id,
          duration: Math.ceil(totalDuration),
          fileSize: audioBuffer.length,
          lineCount: script.lines.length
        })

        logger.debug('Quick summary generation complete', {
          userId,
          inputType,
          audioUrl,
          duration: `${duration}ms`
        })

        // Send completion event with summary data
        send({
          type: 'complete',
          data: {
            success: true,
            summary: {
              id: podcast?.id,
              title: `Quick Summary: ${title}`,
              description: script.description,
              audioUrl,
              duration: Math.ceil(totalDuration),
              fileSize: audioBuffer.length,
              transcript,
              script: script.lines,
              inputType,
              source: sourceDescription
            }
          }
        })

      } catch (error: any) {
        const duration = Date.now() - startTime
        logger.error('Quick summary generation error in stream', error, { userId, duration: `${duration}ms` })
        logger.api('POST', '/api/generate-quick-summary', 500, duration, { userId, error: error.message })

        // Error will be automatically sent by createSSEStream
        throw error
      }
    })

    // Return streaming response
    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error: any) {
    // This catch is for pre-flight checks (auth, rate limiting, validation)
    const duration = Date.now() - startTime
    logger.error('Quick summary pre-flight error', error, { userId: (await auth()).userId, duration: `${duration}ms` })
    logger.api('POST', '/api/generate-quick-summary', 500, duration, { error: error.message })

    return NextResponse.json(
      {
        error: error.message || "Failed to generate quick summary",
        details: error.stack
      },
      { status: 500 }
    )
  }
}
