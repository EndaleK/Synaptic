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
      selection // Optional content selection (pages, topics, or full document)
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
        tracker.completeStep(1, 'Fetching document...')

        // Initialize Supabase
        const supabase = await createClient()

    // OPTIMIZED: Fetch user profile and document in a single JOIN query
    // Reduces 2 sequential DB queries to 1 query (100-300ms faster)
    logger.debug('Fetching document with profile verification', {
      userId,
      documentId
    })

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
      // Log detailed error information
      logger.error('Document/profile fetch error for mind map generation', fetchError, {
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
        .select('id, user_id, file_name')
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
            // Don't return error, continue with the request
          }
        }
      }

      // Only return error if we still don't have the document
      if (!documentWithProfile) {
        const duration = Date.now() - startTime
        const errorMessage = fetchError?.code === 'PGRST116' ? 'Document not found or access denied' : 'Failed to fetch document'
        logger.api('POST', '/api/generate-mindmap', 404, duration, { userId, error: errorMessage })
        return NextResponse.json(
          { error: errorMessage, debug: { documentExists: !!anyDocument, fetchErrorCode: fetchError?.code } },
          { status: 404 }
        )
      }
    }

    const document = {
      id: documentWithProfile.id,
      file_name: documentWithProfile.file_name,
      extracted_text: documentWithProfile.extracted_text,
      metadata: documentWithProfile.metadata,
      user_id: documentWithProfile.user_id
    }

    const profile = {
      id: (documentWithProfile.user_profiles as any).id
    }

    if (!document.extracted_text) {
      logger.warn('Document has no extracted text', { userId, documentId })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-mindmap', 400, duration, { userId, error: 'No extracted text' })
      return NextResponse.json(
        { error: "Document has no extracted text" },
        { status: 400 }
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
        }

        // Validate extracted text
        if (!documentText || documentText.trim().length === 0) {
          logger.warn('No content found in selection', { userId, documentId, selectionType: selection.type })
          return NextResponse.json(
            { error: 'No content found in selected area' },
            { status: 400 }
          )
        }

      } catch (error) {
        logger.error('Text extraction failed for mind map', error, { userId, documentId, selection })
        return NextResponse.json(
          { error: 'Failed to extract text from selection' },
          { status: 400 }
        )
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
    tracker.completeStep(2, 'Analyzing document complexity...')

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
      // Complex documents: Prefer Anthropic, but fallback to DeepSeek if not configured
      const anthropicProvider = providerFactory.getProvider('anthropic')
      if (anthropicProvider.isConfigured()) {
        selectedProviderType = 'anthropic'
      } else {
        selectedProviderType = 'deepseek'
        wasDowngraded = true
        logger.info('Anthropic not configured, falling back to DeepSeek for complex document', { userId, documentId })
      }
    } else {
      // Simple/moderate documents: Use DeepSeek for cost savings (60-70% cheaper than OpenAI)
      selectedProviderType = 'deepseek'
    }

    const selectedProvider = providerFactory.getProviderWithFallback(selectedProviderType, 'openai')

    // Check if provider is configured - return helpful error if not
    if (!selectedProvider.isConfigured()) {
      logger.error('AI provider not configured', null, {
        userId,
        documentId,
        attemptedProvider: selectedProvider.name,
        requestedProvider: selectedProviderType
      })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-mindmap', 500, duration, { userId, error: 'AI provider not configured' })
      return NextResponse.json(
        {
          error: `Mind map generation is not configured. Please add at least one AI provider API key to your environment variables.`,
          details: `Attempted to use ${selectedProvider.name}, but API key is missing. Add one of: DEEPSEEK_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY`,
          configurationHelp: 'See .env.example for setup instructions'
        },
        { status: 500 }
      )
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
    tracker.completeStep(3, 'Generating mind map structure...')

    // Use the refactored generateMindMap function with provider injection
    const mindMapData = await generateMindMap({
      text: documentText,
      maxNodes: effectiveMaxNodes,
      maxDepth: effectiveMaxDepth,
      provider: selectedProvider
    })

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

    // Step 4: Processing structure complete
    tracker.completeStep(4, 'Processing nodes and edges...')

    // Step 5: Save to database
    tracker.completeStep(5, 'Saving mind map to database...')

    // Save to database using Supabase UUID
    let mindMap = null
    const { data: savedMindMap, error: dbError } = await supabase
      .from('mindmaps')
      .insert({
        user_id: profile.id, // Use Supabase UUID, not Clerk ID
        document_id: documentId,
        title: mindMapData.title,
        nodes: mindMapData.nodes,
        edges: mindMapData.edges,
        layout_data: mindMapData.metadata
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Database save error for mind map', dbError, {
        userId,
        documentId,
        errorCode: dbError.code,
        errorMessage: dbError.message,
        errorDetails: dbError.details,
        errorHint: dbError.hint
      })
      // Don't fail the request, mind map is still generated
    } else {
      mindMap = savedMindMap
      logger.debug('Mind map saved to database', {
        mindMapId: mindMap.id,
        userId,
        documentId
      })
    }

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
      mindMapId: mindMap?.id,
      provider: selectedProvider.name,
      nodeCount: mindMapData.nodes.length,
      edgeCount: mindMapData.edges.length
    })

    logger.debug('Mind map generation complete', {
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
          id: mindMap?.id,
          title: mindMapData.title,
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

      } catch (error: any) {
        const duration = Date.now() - startTime
        logger.error('Mind map generation error in stream', error, { userId, documentId, duration: `${duration}ms` })
        logger.api('POST', '/api/generate-mindmap', 500, duration, { userId, error: error?.message })

        // Error will be automatically sent by createSSEStream
        throw error
      }
    })

    // Return streaming response
    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error: any) {
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
