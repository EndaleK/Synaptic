import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generatePodcastScript, type PodcastFormat } from "@/lib/podcast-generator"
import { generatePodcastAudio } from "@/lib/tts-generator"
import { concatenateAudioBuffers, generateTranscript } from "@/lib/audio-utils"
import { getUserProfile, getUserLearningProfile } from "@/lib/supabase/user-profile"
import type { LearningStyle, TeachingStylePreference } from "@/lib/supabase/types"
import { providerFactory } from "@/lib/ai"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { PodcastGenerationSchema } from "@/lib/validation"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { checkUsageLimit, incrementUsage } from "@/lib/usage-limits"
import { extractTextFromPages } from "@/lib/text-extraction"

export const maxDuration = 300 // 5 minutes max execution time (Vercel limit)

export async function POST(req: NextRequest) {
  const startTime = Date.now()

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
      language = 'en-us'
    } = body

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

    logger.debug('Starting podcast generation', {
      userId,
      documentId,
      format,
      targetDuration
    })

    // Initialize Supabase
    const supabase = await createClient()

    // Get user profile ID first (documents.user_id references user_profiles.id, not clerk_user_id)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      logger.error('User profile not found for podcast generation', profileError, { userId })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-podcast', 404, duration, { userId, error: 'User profile not found' })
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch document using Supabase UUID
    const { data: document, error: docError} = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, user_id')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      logger.error('Document fetch error for podcast generation', docError, { userId, documentId })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-podcast', 404, duration, { userId, error: 'Document not found' })
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    if (!document.extracted_text) {
      logger.warn('Document has no extracted text', { userId, documentId })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-podcast', 400, duration, { userId, error: 'No extracted text' })
      return NextResponse.json(
        { error: "Document has no extracted text" },
        { status: 400 }
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
        }

        // Validate extracted text
        if (!textForPodcast || textForPodcast.trim().length === 0) {
          logger.warn('No content found in selection', { userId, documentId, selectionType: selection.type })
          return NextResponse.json(
            { error: 'No content found in selected area' },
            { status: 400 }
          )
        }

      } catch (error) {
        logger.error('Text extraction failed for podcast', error, { userId, documentId, selection })
        return NextResponse.json(
          { error: 'Failed to extract text from selection' },
          { status: 400 }
        )
      }
    }

    logger.debug('Document text prepared for podcast', {
      userId,
      documentId,
      fileName: document.file_name,
      selectionType: selection?.type || 'full',
      selectionDescription,
      textLength: textForPodcast.length
    })

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

    // Step 1: Generate podcast script with selected provider and selected text
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

    // Step 2: Generate audio for each line
    logger.debug('Generating podcast audio', { userId, documentId, lineCount: script.lines.length, language: script.language })
    const audioSegments = await generatePodcastAudio(script.lines, script.language)

    // Step 3: Concatenate audio segments
    logger.debug('Concatenating audio segments', { userId, documentId, segmentCount: audioSegments.length })
    const audioBuffer = concatenateAudioBuffers(audioSegments)

    // Step 4: Generate transcript with timestamps
    const transcript = generateTranscript(audioSegments)
    const totalDuration = transcript[transcript.length - 1]?.endTime || script.estimatedDuration

    // Step 5: Upload to Supabase Storage
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
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-podcast', 500, duration, { userId, error: 'Storage upload failed' })
      return NextResponse.json(
        { error: `Failed to upload audio: ${uploadError.message}` },
        { status: 500 }
      )
    }

    logger.debug('Podcast uploaded successfully', { userId, documentId, path: uploadData.path })

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('podcasts')
      .getPublicUrl(uploadData.path)

    const audioUrl = urlData.publicUrl

    // Step 6: Save podcast metadata to database
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
      logger.error('Database save error for podcast', dbError, { userId, documentId })
      // Don't fail the request, audio is already uploaded
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

    // Return response
    return NextResponse.json({
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
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Podcast generation error', error, { userId, documentId: req.url, duration: `${duration}ms` })
    logger.api('POST', '/api/generate-podcast', 500, duration, { userId, error: 'Unknown error' })

    return NextResponse.json(
      {
        error: error.message || "Failed to generate podcast",
        details: error.stack
      },
      { status: 500 }
    )
  }
}
