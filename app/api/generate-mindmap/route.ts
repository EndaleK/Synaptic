import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generateMindMap, validateMindMap } from "@/lib/mindmap-generator"
import { providerFactory } from "@/lib/ai"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { MindMapGenerationSchema } from "@/lib/validation"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { checkUsageLimit, incrementUsage } from "@/lib/usage-limits"
import { analyzeDocumentComplexity } from "@/lib/document-complexity-analyzer"
import { extractTextFromPages } from "@/lib/text-extraction"
import { createSSEStream, createSSEHeaders, ProgressTracker } from "@/lib/sse-utils"

export const maxDuration = 300 // 5 minutes max execution time for complex documents (Vercel Pro plan)

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated mind map generation request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting (AI tier - 10 requests/min)
    const rateLimitResponse = await applyRateLimit(req, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for mind map generation', { userId })
      return rateLimitResponse
    }

    // Parse request body
    const body = await req.json()
    const {
      documentId,
      maxNodes,
      maxDepth,
      selection, // Optional content selection (pages, topics, or full document)
      mapType = 'hierarchical' // Default to hierarchical for backward compatibility
    } = body

    // Validate input
    try {
      MindMapGenerationSchema.parse({
        documentId,
        maxNodes,
        maxDepth
      })
    } catch (validationError) {
      logger.warn('Mind map generation validation failed', { userId, error: validationError })
      return NextResponse.json(
        { error: "Invalid input. Check documentId, maxNodes, and maxDepth." },
        { status: 400 }
      )
    }

    // Check usage limits based on subscription tier
    const usageCheck = await checkUsageLimit(userId, 'mindmaps')
    if (!usageCheck.allowed) {
      logger.warn('Mind map generation blocked - usage limit reached', {
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
    logger.debug('Starting mind map generation with streaming', {
      userId,
      documentId,
      maxNodes,
      maxDepth
    })

    const stream = createSSEStream(async (send) => {
      // Progress tracker for multi-step process
      const tracker = new ProgressTracker([
        'Fetching document',
        'Analyzing complexity',
        'Generating mind map',
        'Processing structure',
        'Saving to database'
      ], send)

      try {
        // Step 1: Fetch document
        // Initialize Supabase
        const supabase = await createClient()

        // SIMPLIFIED: Fetch document and profile separately for better reliability
        // First get user profile with learning style
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, learning_style')
          .eq('clerk_user_id', userId)
          .single()

        if (profileError || !profile) {
          logger.error('User profile not found', profileError, { userId })
          const duration = Date.now() - startTime
          logger.api('POST', '/api/generate-mindmap', 404, duration, { userId, error: 'User profile not found' })
          throw new Error('User profile not found')
        }

        // Fetch learning profile for personalization (optional - graceful degradation)
        let teachingStylePreference: 'socratic' | 'direct' | 'mixed' = 'mixed'
        try {
          const { data: learningProfile } = await supabase
            .from('learning_profiles')
            .select('teaching_style_preference')
            .eq('user_id', profile.id)
            .single()

          if (learningProfile?.teaching_style_preference) {
            teachingStylePreference = learningProfile.teaching_style_preference as 'socratic' | 'direct' | 'mixed'
          }
        } catch {
          // Ignore - use default
        }

        // Then fetch the document (RLS will ensure user owns it)
        const { data: document, error: fetchError } = await supabase
          .from('documents')
          .select('id, file_name, extracted_text, metadata, storage_path, user_id')
          .eq('id', documentId)
          .eq('user_id', profile.id)
          .single()

        if (fetchError || !document) {
          logger.error('Document fetch error', fetchError, {
            userId,
            documentId,
            profileId: profile.id,
            errorCode: fetchError?.code,
            errorMessage: fetchError?.message
          })
          const duration = Date.now() - startTime
          const errorMessage = fetchError?.code === 'PGRST116' ? 'Document not found or access denied' : 'Failed to fetch document'
          logger.api('POST', '/api/generate-mindmap', 404, duration, { userId, error: errorMessage })
          throw new Error(errorMessage)
        }

        // Document fetched successfully - mark step 1 complete
        tracker.completeStep(1, 'Document fetched successfully')

        // Use document and profile directly (already fetched above)
        logger.debug('Document and profile fetched successfully', {
          userId,
          documentId: document.id,
          profileId: profile.id,
          fileName: document.file_name
        })

    // If no extracted text, try to extract it now (for old documents or large files)
    if (!document.extracted_text && document.storage_path) {
      logger.info('No extracted text found, extracting on-demand', { userId, documentId })

      try {
        // Download file from storage
        const { data: fileBlob, error: downloadError } = await supabase
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

            // Optionally save the extracted text to database for future use
            await supabase
              .from('documents')
              .update({
                extracted_text: parseResult.text,
                metadata: {
                  ...document.metadata,
                  page_count: parseResult.pageCount || document.metadata.page_count,
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
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-mindmap', 400, duration, { userId, error: 'No extracted text' })

      throw new Error(
        isExtractionQueued
          ? "Document is still being processed. Text extraction is happening in the background - please wait a few moments and try again."
          : "Document has no extracted text. This may be a scanned PDF or image-based document that requires OCR."
      )
    }

    logger.debug('Document fetched successfully', {
      userId,
      documentId,
      fileName: document.file_name,
      textLength: document.extracted_text.length
    })

    // Determine selection mode and extract relevant text
    let documentText = document.extracted_text
    let selectionDescription = 'full document'

    if (selection) {
      try {
        if (selection.type === 'pages' && selection.pageRange) {
          // PAGE RANGE MODE: Extract text from specific pages
          const { start, end } = selection.pageRange
          selectionDescription = `pages ${start}-${end}`

          logger.info('Mind map generation with page range', {
            userId,
            documentId,
            pageStart: start,
            pageEnd: end,
          })

          documentText = await extractTextFromPages(
            documentId,
            [selection.pageRange],
            { maxLength: 48000 }
          )

        } else if (selection.type === 'topic' && selection.topic) {
          // TOPIC MODE: Extract text from topic's page range
          const topicTitle = selection.topic.title
          selectionDescription = `topic: ${topicTitle}`

          logger.info('Mind map generation with topic', {
            userId,
            documentId,
            topic: topicTitle,
          })

          if (selection.topic.pageRange) {
            documentText = await extractTextFromPages(
              documentId,
              [selection.topic.pageRange],
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

          logger.info('Mind map generation with chapters', {
            userId,
            documentId,
            chapterCount,
            chapterIds: selection.chapterIds,
          })

          try {
            const { extractChapterText } = await import('@/lib/chapter-extractor')
            documentText = extractChapterText(
              document.extracted_text,
              selection.chapters,
              selection.chapterIds
            )
            // Apply token limit
            documentText = documentText.substring(0, 48000)
          } catch (chapterError) {
            logger.error('Chapter text extraction failed for mind map', chapterError, {
              userId,
              documentId,
              chapterIds: selection.chapterIds,
            })
            // Fallback to full document
            documentText = document.extracted_text
          }
        }

        // Validate extracted text
        if (!documentText || documentText.trim().length === 0) {
          logger.warn('No content found in selection', { userId, documentId, selectionType: selection.type })
          throw new Error('No content found in selected area')
        }

      } catch (error) {
        logger.error('Text extraction failed for mind map', error, { userId, documentId, selection })
        throw new Error('Failed to extract text from selection')
      }
    }
    // else: Use full document text (already set)

    logger.debug('Content selection applied', {
      userId,
      documentId,
      selection: selectionDescription,
      textLength: documentText.length
    })

    // Step 2: Analyze complexity
    // Analyze document complexity to determine optimal parameters
    const complexityAnalysis = analyzeDocumentComplexity(documentText)
    logger.debug('Document complexity analysis', {
      userId,
      documentId,
      complexity: complexityAnalysis.complexity,
      score: complexityAnalysis.score,
      recommendedNodes: complexityAnalysis.recommendedNodes,
      recommendedDepth: complexityAnalysis.recommendedDepth
    })

    // Complexity analysis complete
    tracker.completeStep(2, 'Document complexity analyzed')

    // Use analyzed parameters (or manual override if provided explicitly)
    let effectiveMaxNodes = body.maxNodes !== undefined ? body.maxNodes : complexityAnalysis.recommendedNodes
    const effectiveMaxDepth = body.maxDepth !== undefined ? body.maxDepth : complexityAnalysis.recommendedDepth

    // Select AI provider based on complexity score and environment configuration
    // Priority: Environment variable (MINDMAP_PROVIDER) > Complexity-based selection > DeepSeek (cost-effective default)
    const envProvider = process.env.MINDMAP_PROVIDER as 'openai' | 'deepseek' | 'anthropic' | undefined

    let selectedProviderType: 'openai' | 'deepseek' | 'anthropic'
    let wasDowngraded = false

    if (envProvider) {
      selectedProviderType = envProvider
    } else if (complexityAnalysis.score >= 50) {
      // Complex documents: Use OpenAI for reliable edge generation (Anthropic has auth issues, DeepSeek produces 0 edges)
      selectedProviderType = 'openai'
    } else {
      // Simple/moderate documents: Use OpenAI for reliable edge generation (DeepSeek produces 0 edges)
      selectedProviderType = 'openai'
    }

    const selectedProvider = providerFactory.getProviderWithFallback(selectedProviderType, 'openai')

    // Check if provider is configured - throw error if not
    if (!selectedProvider.isConfigured()) {
      logger.error('AI provider not configured', null, {
        userId,
        documentId,
        attemptedProvider: selectedProvider.name,
        requestedProvider: selectedProviderType
      })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-mindmap', 500, duration, { userId, error: 'AI provider not configured' })
      throw new Error(`Mind map generation is not configured. Please add at least one AI provider API key to your environment variables. Attempted to use ${selectedProvider.name}, but API key is missing. Add one of: DEEPSEEK_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY`)
    }

    // Safety cap: DeepSeek works best with fewer nodes (prevents JSON truncation)
    // Cap at 25 nodes for DeepSeek to ensure complete JSON responses
    if (selectedProvider.name === 'deepseek' && effectiveMaxNodes > 25) {
      logger.info('Reducing node count for DeepSeek to prevent truncation', {
        originalNodes: effectiveMaxNodes,
        cappedNodes: 25
      })
      effectiveMaxNodes = 25
    }

    const providerReason = envProvider
      ? `Using ${selectedProvider.name} (configured via MINDMAP_PROVIDER environment variable)`
      : wasDowngraded
        ? `Complex document (score ${complexityAnalysis.score}/100) using ${selectedProvider.name} (Anthropic not configured)`
        : complexityAnalysis.score >= 50
          ? `Complex document (score ${complexityAnalysis.score}/100) using ${selectedProvider.name} for large mind maps (${effectiveMaxNodes} nodes)`
          : `Simple/moderate document (score ${complexityAnalysis.score}/100) using ${selectedProvider.name} for cost-effective generation (${effectiveMaxNodes} nodes)`

    logger.info('Selected AI provider for mind map', {
      userId,
      documentId,
      provider: selectedProvider.name,
      complexityScore: complexityAnalysis.score,
      recommendedNodes: effectiveMaxNodes,
      reason: providerReason
    })

    // Estimate cost before generation
    const modelName = selectedProvider.name === 'anthropic' ? 'claude-sonnet-4-20250514'
      : selectedProvider.name === 'deepseek' ? 'deepseek-chat'
      : 'gpt-4o'
    const costEstimate = estimateRequestCost(modelName, documentText, 4000)
    logger.debug('Cost estimate for mind map generation', {
      userId,
      documentId,
      provider: selectedProvider.name,
      model: modelName,
      ...costEstimate
    })

    // Generate mind map with selected provider
    logger.debug('Generating mind map', {
      userId,
      documentId,
      provider: selectedProvider.name,
      maxNodes: effectiveMaxNodes,
      maxDepth: effectiveMaxDepth,
      autoDetected: body.maxNodes === undefined && body.maxDepth === undefined
    })

    // Step 3: Generate mind map
    // Use the refactored generateMindMap function with provider injection
    const mindMapData = await generateMindMap({
      text: documentText,
      maxNodes: effectiveMaxNodes,
      maxDepth: effectiveMaxDepth,
      provider: selectedProvider,
      mapType: mapType, // Pass map type to generator for type-specific prompts
      // Personalization options
      learningStyle: profile.learning_style || undefined,
      teachingStylePreference
    })

    // Mind map generation complete
    tracker.completeStep(3, 'Mind map structure generated')

    // Validate mind map
    const isValid = validateMindMap(mindMapData)
    if (!isValid) {
      logger.warn('Mind map validation failed, but continuing', {
        userId,
        documentId,
        nodeCount: mindMapData.nodes.length,
        edgeCount: mindMapData.edges.length
      })
    }

    logger.debug('Mind map generated', {
      userId,
      documentId,
      nodeCount: mindMapData.nodes.length,
      edgeCount: mindMapData.edges.length
    })

    // Step 4: Processing structure
    tracker.completeStep(4, 'Nodes and edges processed')

    // Step 5: Mind map generation complete (no auto-save)
    tracker.completeStep(5, 'Mind map generated successfully!')

    // Track usage
    const totalTokens = mindMapData.nodes.reduce((sum, node) => sum + node.label.length + node.description.length, 0)

    // Track AI provider usage for cost monitoring
    trackUsage(userId, modelName, costEstimate.inputTokens, costEstimate.outputTokens)

    // Increment usage count for subscription tier limits
    await incrementUsage(userId, 'mindmaps')

    await supabase.from('usage_tracking').insert({
      user_id: profile.id, // Use Supabase UUID, not Clerk ID
      action_type: 'mindmap_generation',
      tokens_used: totalTokens,
      metadata: {
        document_id: documentId,
        node_count: mindMapData.nodes.length,
        edge_count: mindMapData.edges.length
      }
    })

    const duration = Date.now() - startTime
    logger.api('POST', '/api/generate-mindmap', 200, duration, {
      userId,
      documentId,
      provider: selectedProvider.name,
      nodeCount: mindMapData.nodes.length,
      edgeCount: mindMapData.edges.length
    })

    logger.debug('Mind map generation complete (preview mode)', {
      userId,
      documentId,
      provider: selectedProvider.name,
      nodeCount: mindMapData.nodes.length,
      edgeCount: mindMapData.edges.length,
      duration: `${duration}ms`
    })

    // Send completion event with mind map data
    send({
      type: 'complete',
      data: {
        success: true,
        mindMap: {
          // No ID yet - will be assigned when user saves to library
          title: mindMapData.title,
          mapType: mapType, // Include the selected map type for saving
          nodes: mindMapData.nodes,
          edges: mindMapData.edges,
          template: mindMapData.template,
          templateReason: mindMapData.templateReason,
          metadata: mindMapData.metadata
        },
        documentText: document.extracted_text, // Include for node detail expansion
        complexityAnalysis: {
          complexity: complexityAnalysis.complexity,
          score: complexityAnalysis.score,
          factors: complexityAnalysis.factors,
          reasoning: complexityAnalysis.reasoning,
          recommendedNodes: complexityAnalysis.recommendedNodes,
          recommendedDepth: complexityAnalysis.recommendedDepth
        },
        aiProvider: {
          selected: selectedProvider.name,
          reason: providerReason,
          model: modelName
        }
      }
    })

      } catch (error: unknown) {
        const duration = Date.now() - startTime
        logger.error('Mind map generation error in stream', error, { userId, documentId, duration: `${duration}ms` })
        logger.api('POST', '/api/generate-mindmap', 500, duration, { userId, error: error?.message })

        // Error will be automatically sent by createSSEStream
        throw error
      }
    })

    // Return streaming response
    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error: unknown) {
    // This catch is for pre-flight checks (auth, rate limiting, validation)
    const duration = Date.now() - startTime
    // Get userId from auth if available
    let errorUserId = 'unknown'
    try {
      const { userId: authUserId } = await auth()
      errorUserId = authUserId || 'unknown'
    } catch {}

    logger.error('Mind map generation pre-flight error', error, { userId: errorUserId, duration: `${duration}ms` })
    logger.api('POST', '/api/generate-mindmap', 500, duration, { userId: errorUserId, error: error?.message || 'Unknown error' })

    // Ensure we always return valid JSON
    const errorMessage = error?.message || "Failed to generate mind map"
    const isConfigError = errorMessage.toLowerCase().includes('provider not configured') ||
                          errorMessage.toLowerCase().includes('api key')

    return NextResponse.json(
      {
        error: isConfigError
          ? 'Mind map generation is not configured. Please check your environment variables.'
          : errorMessage,
        details: isConfigError
          ? 'Add at least one AI provider API key: DEEPSEEK_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY'
          : error?.stack,
        configurationHelp: isConfigError ? 'See .env.example for setup instructions' : undefined
      },
      { status: 500 }
    )
  }
}
