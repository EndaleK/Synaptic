/**
 * API Route: Generate Podcast with RAG (Retrieval-Augmented Generation)
 *
 * For large documents (500MB+ textbooks):
 * 1. Use document ID to load from vector store
 * 2. Retrieve relevant chunks using semantic search (for topic mode)
 * 3. Generate podcast from selected content or full document
 * 4. Much more memory-efficient than processing entire document
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { searchDocument, getDocumentStats } from "@/lib/vector-store"
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
import { createSSEStream, createSSEHeaders, ProgressTracker } from "@/lib/sse-utils"

export const maxDuration = 300 // 5 minutes max execution time
export const runtime = 'nodejs' // Required for pdf2json

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  // PRE-CHECKS: Run before streaming to catch auth/validation errors early
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated podcast RAG generation request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting (AI tier - 10 requests/min, podcast is expensive)
    const rateLimitResponse = await applyRateLimit(req, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for podcast RAG generation', { userId })
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
      logger.warn('Podcast RAG generation validation failed', { userId, error: validationError })
      return NextResponse.json(
        { error: "Invalid input. Check documentId, format, and targetDuration." },
        { status: 400 }
      )
    }

    // Check usage limits based on subscription tier
    const usageCheck = await checkUsageLimit(userId, 'podcasts')
    if (!usageCheck.allowed) {
      logger.warn('Podcast RAG generation blocked - usage limit reached', {
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
    logger.debug('Starting podcast RAG generation with streaming', {
      userId,
      documentId,
      format,
      targetDuration,
      selection: selection?.type || 'full'
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
          .select('*')
          .eq('id', documentId)
          .eq('user_id', profile.id)
          .single()

        if (docError || !document) {
          logger.warn('Document not found or unauthorized for podcast RAG', { userId, documentId })
          throw new Error('Document not found or access denied')
        }

        // Step 2: Extract content based on selection
        tracker.completeStep(2, 'Extracting content...')

        let textForPodcast = ''
        let selectionDescription = 'full document'

        if (selection && selection.type === 'pages' && selection.pageRange) {
          // PAGE RANGE MODE: Extract text from specific pages
          const { start, end } = selection.pageRange
          selectionDescription = `pages ${start}-${end}`

          logger.info('Podcast RAG generation with page range', {
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

          if (!textForPodcast || textForPodcast.trim().length === 0) {
            throw new Error('No content found in selected page range')
          }

        } else if (selection && selection.type === 'topic' && selection.topic) {
          // TOPIC MODE: Use vector search for topic-specific content
          const topicQuery = selection.topic.title
          selectionDescription = `topic: ${topicQuery}`

          logger.info('Podcast RAG generation with topic', {
            userId,
            documentId,
            topic: topicQuery,
          })

          // Check if document is indexed
          const docStats = await getDocumentStats(documentId)
          if (!docStats.exists || docStats.chunkCount === 0) {
            logger.warn('Document not RAG indexed for topic search, falling back', { documentId })
            // Fallback: try to extract from extracted_text
            if (document.extracted_text) {
              textForPodcast = document.extracted_text.substring(0, 48000)
            } else {
              throw new Error('Document not indexed and has no extracted text. Please index the document first.')
            }
          } else {
            // Use vector search to find relevant chunks
            const topicResults = await searchDocument(documentId, topicQuery, 10)
            const relevantChunks = topicResults.map((r) => r.text)
            textForPodcast = relevantChunks.join('\n\n').substring(0, 48000)

            logger.debug('Topic-based RAG retrieval for podcast', {
              userId,
              documentId,
              topic: topicQuery,
              chunksRetrieved: relevantChunks.length,
            })
          }

        } else {
          // FULL DOCUMENT MODE: Use vector search for comprehensive coverage
          selectionDescription = 'full document'

          logger.info('Podcast RAG generation for full document', {
            userId,
            documentId,
          })

          // Check if document is indexed
          const docStats = await getDocumentStats(documentId)
          if (!docStats.exists || docStats.chunkCount === 0) {
            logger.warn('Document not RAG indexed, falling back to extracted_text', { documentId })
            // Fallback: use extracted_text
            if (document.extracted_text) {
              textForPodcast = document.extracted_text.substring(0, 48000)
            } else {
              throw new Error('Document not indexed and has no extracted text. Please index the document first.')
            }
          } else {
            // Use broad query to get representative chunks from entire document
            const overviewQuery = `${document.file_name} overview main topics key concepts`
            const overviewResults = await searchDocument(documentId, overviewQuery, 15)
            const representativeChunks = overviewResults.map((r) => r.text)
            textForPodcast = representativeChunks.join('\n\n').substring(0, 48000)

            logger.debug('Full document RAG retrieval for podcast', {
              userId,
              documentId,
              chunksRetrieved: representativeChunks.length,
            })
          }
        }

        // Validate extracted text
        if (!textForPodcast || textForPodcast.trim().length === 0) {
          throw new Error('No content extracted from document')
        }

        logger.debug('Document text prepared for podcast RAG', {
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
          const { profile: userProfile } = await getUserProfile(userId)

          if (userProfile?.id) {
            const { learningProfile } = await getUserLearningProfile(userProfile.id)

            if (learningProfile && userProfile.learning_style) {
              personalizationOptions = {
                learningStyle: userProfile.learning_style as LearningStyle,
                teachingStylePreference: (learningProfile.teaching_style_preference || 'mixed') as TeachingStylePreference,
                varkScores: {
                  visual: learningProfile.visual_score,
                  auditory: learningProfile.auditory_score,
                  kinesthetic: learningProfile.kinesthetic_score,
                  reading_writing: learningProfile.reading_writing_score
                },
                socraticPercentage: learningProfile.socratic_percentage
              }

              logger.debug('Using personalized podcast RAG', {
                userId,
                learningStyle: userProfile.learning_style,
                teachingMode: learningProfile.teaching_style_preference
              })
            }
          }
        } catch (profileError) {
          // If profile fetch fails, just continue with default generation
          logger.warn('Could not fetch user profile for podcast RAG personalization', {
            userId,
            error: profileError
          })
        }

        // Select AI provider for script generation
        const envProvider = process.env.PODCAST_SCRIPT_PROVIDER as 'openai' | 'deepseek' | 'anthropic' | undefined
        const selectedProviderType = envProvider || 'deepseek' // Default to DeepSeek for cost savings

        const scriptProvider = providerFactory.getProviderWithFallback(selectedProviderType)

        logger.info('Selected AI provider for podcast RAG script', {
          userId,
          documentId,
          provider: scriptProvider.name,
          reason: envProvider
            ? `Using ${scriptProvider.name} (configured via PODCAST_SCRIPT_PROVIDER)`
            : `Using ${scriptProvider.name} for cost-effective generation`
        })

        // Step 4: Generate podcast script
        tracker.completeStep(4, 'Generating podcast script...')

        logger.debug('Generating podcast RAG script', {
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

        logger.debug('Podcast RAG script generated', {
          userId,
          documentId,
          lines: script.lines.length,
          estimatedDuration: script.estimatedDuration
        })

        // Step 5: Generate audio for each line
        tracker.completeStep(5, 'Generating audio from script...')

        logger.debug('Generating podcast RAG audio', {
          userId,
          documentId,
          lineCount: script.lines.length,
          language: script.language
        })

        const audioSegments = await generatePodcastAudio(script.lines, script.language)
        const audioBuffer = concatenateAudioBuffers(audioSegments)
        const transcript = generateTranscript(audioSegments)
        const totalDuration = transcript[transcript.length - 1]?.endTime || script.estimatedDuration

        // Step 6: Upload to Supabase Storage
        tracker.completeStep(6, 'Uploading podcast to storage...')

        const fileName = `${userId}/${documentId}_${Date.now()}.mp3`
        logger.debug('Uploading podcast RAG to storage', {
          userId,
          documentId,
          fileName,
          fileSize: audioBuffer.length
        })

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('podcasts')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          logger.error('Storage upload error for podcast RAG', uploadError, {
            userId,
            documentId,
            fileName
          })
          throw new Error(`Failed to upload audio: ${uploadError.message}`)
        }

        logger.debug('Podcast RAG uploaded successfully', {
          userId,
          documentId,
          path: uploadData.path
        })

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
            user_id: profile.id,
            document_id: documentId,
            title: script.title,
            script: JSON.stringify(script.lines),
            voice_id: 'alloy_nova',
            audio_url: audioUrl,
            duration_seconds: Math.ceil(totalDuration),
            file_size: audioBuffer.length,
            generation_status: 'completed'
          })
          .select()
          .single()

        if (dbError) {
          logger.error('Database save error for podcast RAG', dbError, {
            userId,
            documentId
          })
          // Don't fail the request, audio is already uploaded
        }

        // Track usage
        const totalCharacters = script.lines.reduce((sum, line) => sum + line.text.length, 0)

        trackUsage(userId, 'tts-1', totalCharacters, 0)
        await incrementUsage(userId, 'podcasts')

        await supabase.from('usage_tracking').insert({
          user_id: profile.id,
          action_type: 'podcast_generation_rag',
          tokens_used: totalCharacters,
          metadata: {
            document_id: documentId,
            duration: Math.ceil(totalDuration),
            format,
            selection: selectionDescription
          }
        })

        const duration = Date.now() - startTime
        logger.api('POST', '/api/generate-podcast-rag', 200, duration, {
          userId,
          documentId,
          podcastId: podcast?.id,
          duration: Math.ceil(totalDuration),
          fileSize: audioBuffer.length,
          lineCount: script.lines.length,
          selection: selectionDescription
        })

        logger.debug('Podcast RAG generation complete', {
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
              format,
              language: script.language
            }
          }
        })

      } catch (error) {
        logger.error('Podcast RAG generation error', error, { userId, documentId })

        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Podcast generation failed'
        })
      }
    })

    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error) {
    logger.error('Podcast RAG endpoint error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate podcast' },
      { status: 500 }
    )
  }
}
