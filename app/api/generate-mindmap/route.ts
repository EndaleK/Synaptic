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

    logger.debug('Starting mind map generation', {
      userId,
      documentId,
      maxNodes,
      maxDepth
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
      logger.error('User profile not found for mind map generation', profileError, { userId })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-mindmap', 404, duration, { userId, error: 'User profile not found' })
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch document using Supabase UUID (include metadata for page/topic selection)
    logger.debug('Attempting to fetch document', {
      userId,
      documentId,
      userProfileId: profile.id,
      query: 'SELECT id, file_name, extracted_text, metadata, user_id FROM documents WHERE id = ? AND user_id = ?'
    })

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, metadata, user_id')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      // Log detailed error information
      logger.error('Document fetch error for mind map generation', docError, {
        userId,
        documentId,
        userProfileId: profile.id,
        errorCode: docError?.code,
        errorMessage: docError?.message,
        errorDetails: docError?.details,
        errorHint: docError?.hint
      })

      // Try query without user_id filter to see if document exists
      const { data: anyDocument } = await supabase
        .from('documents')
        .select('id, user_id')
        .eq('id', documentId)
        .single()

      if (anyDocument) {
        logger.error('Document exists but user mismatch', null, {
          documentId,
          documentUserId: anyDocument.user_id,
          requestUserProfileId: profile.id,
          userIdMatch: anyDocument.user_id === profile.id
        })
      } else {
        logger.error('Document does not exist in database', null, { documentId })
      }

      const duration = Date.now() - startTime
      logger.api('POST', '/api/generate-mindmap', 404, duration, { userId, error: 'Document not found' })
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
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

    if (selection && selection.type === 'pages' && selection.pageRange) {
      // PAGE RANGE MODE: Extract text from specific pages
      const { start, end } = selection.pageRange
      selectionDescription = `pages ${start}-${end}`

      logger.info('Mind map generation with page range', {
        userId,
        documentId,
        pageStart: start,
        pageEnd: end,
      })

      const fullText = document.extracted_text || ''

      // If document has page metadata, extract specific pages
      if (document.metadata?.pages && Array.isArray(document.metadata.pages)) {
        const pages = document.metadata.pages.filter(
          (p: any) => p.pageNumber >= start && p.pageNumber <= end
        )
        documentText = pages.map((p: any) => p.text).join('\n\n')
      } else {
        // Fallback: Split by approximate page length
        const avgPageLength = 3500
        const startChar = (start - 1) * avgPageLength
        const endChar = end * avgPageLength
        documentText = fullText.substring(startChar, Math.min(endChar, fullText.length))
      }

      if (!documentText || documentText.trim().length === 0) {
        return NextResponse.json(
          { error: 'No content found in selected page range' },
          { status: 400 }
        )
      }

      // Limit to reasonable size for mind map generation
      documentText = documentText.substring(0, 48000) // ~12K tokens

    } else if (selection && selection.type === 'topic' && selection.topic) {
      // TOPIC MODE: Extract text from specific topic
      const topicTitle = selection.topic.title
      selectionDescription = `topic: ${topicTitle}`

      logger.info('Mind map generation with topic', {
        userId,
        documentId,
        topic: topicTitle,
      })

      // If document has topic metadata with page ranges
      if (document.metadata?.topics && Array.isArray(document.metadata.topics)) {
        const topic = document.metadata.topics.find((t: any) => t.title === topicTitle)

        if (topic && topic.pageRange) {
          const { start, end } = topic.pageRange
          const fullText = document.extracted_text || ''

          // Extract topic's pages
          if (document.metadata?.pages && Array.isArray(document.metadata.pages)) {
            const pages = document.metadata.pages.filter(
              (p: any) => p.pageNumber >= start && p.pageNumber <= end
            )
            documentText = pages.map((p: any) => p.text).join('\n\n')
          } else {
            // Fallback: Approximate extraction
            const avgPageLength = 3500
            const startChar = (start - 1) * avgPageLength
            const endChar = end * avgPageLength
            documentText = fullText.substring(startChar, Math.min(endChar, fullText.length))
          }
        }
      }

      // Limit to reasonable size
      documentText = documentText.substring(0, 48000)

      if (!documentText || documentText.trim().length === 0) {
        return NextResponse.json(
          { error: 'No content found for selected topic' },
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

    // Return response
    return NextResponse.json({
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
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    // Get userId from auth if available
    let errorUserId = 'unknown'
    try {
      const { userId: authUserId } = await auth()
      errorUserId = authUserId || 'unknown'
    } catch {}

    logger.error('Mind map generation error', error, { userId: errorUserId, documentId: req.url, duration: `${duration}ms` })
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
