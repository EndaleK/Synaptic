import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generateMindMap, validateMindMap } from "@/lib/mindmap-generator"
import { generateMindMapWithClaude } from "@/lib/anthropic"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { MindMapGenerationSchema } from "@/lib/validation"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { canGenerateMindMap, trackMindMapGeneration } from "@/lib/usage-tracker"
import { analyzeDocumentComplexity } from "@/lib/document-complexity-analyzer"
import type { AIProvider } from "@/lib/ai-provider"

export const maxDuration = 60 // 1 minute max execution time

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
      maxDepth
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

    // Check usage limits (free tier: 10 mind map generations/month)
    const usageCheck = canGenerateMindMap(userId, 'free') // TODO: Get actual tier from user profile
    if (!usageCheck.allowed) {
      logger.warn('Mind map generation blocked - usage limit reached', {
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

    logger.debug('Starting mind map generation', {
      userId,
      documentId,
      maxNodes,
      maxDepth
    })

    // Initialize Supabase
    const supabase = await createClient()

    // Fetch document
    // Note: user_id in documents table contains Clerk user IDs (not UUIDs)
    logger.debug('Attempting to fetch document', {
      userId,
      documentId,
      query: 'SELECT id, file_name, extracted_text, user_id FROM documents WHERE id = ? AND user_id = ?'
    })

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, user_id')
      .eq('id', documentId)
      .eq('user_id', userId) // userId is Clerk ID
      .single()

    if (docError || !document) {
      // Log detailed error information
      logger.error('Document fetch error for mind map generation', docError, {
        userId,
        documentId,
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
          requestUserId: userId,
          userIdMatch: anyDocument.user_id === userId
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

    // Analyze document complexity to determine optimal parameters
    const complexityAnalysis = analyzeDocumentComplexity(document.extracted_text)
    logger.debug('Document complexity analysis', {
      userId,
      documentId,
      complexity: complexityAnalysis.complexity,
      score: complexityAnalysis.score,
      recommendedNodes: complexityAnalysis.recommendedNodes,
      recommendedDepth: complexityAnalysis.recommendedDepth
    })

    // Use analyzed parameters (or manual override if provided explicitly)
    const effectiveMaxNodes = body.maxNodes !== undefined ? body.maxNodes : complexityAnalysis.recommendedNodes
    const effectiveMaxDepth = body.maxDepth !== undefined ? body.maxDepth : complexityAnalysis.recommendedDepth

    // Select AI provider based on complexity score
    // Simple/Moderate (< 50): GPT-4o (cheaper, handles 15-25 nodes)
    // Complex/Very Complex (≥ 50): Claude 3.5 Sonnet (handles 40-55 nodes without truncation)
    const selectedProvider: AIProvider = complexityAnalysis.score >= 50 ? 'claude' : 'openai'
    const providerReason = complexityAnalysis.score >= 50
      ? `Complex document (score ${complexityAnalysis.score}/100) requires Claude 3.5 Sonnet for large mind maps (${effectiveMaxNodes} nodes) without JSON truncation`
      : `Simple/moderate document (score ${complexityAnalysis.score}/100) can use GPT-4o for cost-effective generation (${effectiveMaxNodes} nodes)`

    logger.info('Selected AI provider for mind map', {
      userId,
      documentId,
      provider: selectedProvider,
      complexityScore: complexityAnalysis.score,
      recommendedNodes: effectiveMaxNodes,
      reason: providerReason
    })

    // Estimate cost before generation
    const modelName = selectedProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o'
    const costEstimate = estimateRequestCost(modelName, document.extracted_text, 4000)
    logger.debug('Cost estimate for mind map generation', {
      userId,
      documentId,
      provider: selectedProvider,
      model: modelName,
      ...costEstimate
    })

    // Generate mind map with selected provider
    logger.debug('Generating mind map', {
      userId,
      documentId,
      provider: selectedProvider,
      maxNodes: effectiveMaxNodes,
      maxDepth: effectiveMaxDepth,
      autoDetected: body.maxNodes === undefined && body.maxDepth === undefined
    })

    let mindMapData: any
    if (selectedProvider === 'claude') {
      mindMapData = await generateMindMapWithClaude(document.extracted_text, effectiveMaxNodes, effectiveMaxDepth)
    } else {
      mindMapData = await generateMindMap({
        text: document.extracted_text,
        maxNodes: effectiveMaxNodes,
        maxDepth: effectiveMaxDepth
      })
    }

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

    // Save to database using Clerk user ID directly
    // Note: Documents table uses user_id as TEXT (Clerk ID), not UUID reference
    let mindMap = null
    const { data: savedMindMap, error: dbError } = await supabase
      .from('mindmaps')
      .insert({
        user_id: userId, // Use Clerk user ID directly (TEXT type)
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

    // Track mind map generation for usage limits
    trackMindMapGeneration(userId, 'free') // TODO: Get actual tier from user profile

    await supabase.from('usage_tracking').insert({
      user_id: userId,
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
      provider: selectedProvider,
      nodeCount: mindMapData.nodes.length,
      edgeCount: mindMapData.edges.length
    })

    logger.debug('Mind map generation complete', {
      userId,
      documentId,
      provider: selectedProvider,
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
        selected: selectedProvider,
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
    logger.api('POST', '/api/generate-mindmap', 500, duration, { userId: errorUserId, error: 'Unknown error' })

    return NextResponse.json(
      {
        error: error.message || "Failed to generate mind map",
        details: error.stack
      },
      { status: 500 }
    )
  }
}
