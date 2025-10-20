import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generateMindMap, validateMindMap } from "@/lib/mindmap-generator"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { MindMapGenerationSchema } from "@/lib/validation"
import { estimateRequestCost, trackUsage } from "@/lib/cost-estimator"
import { canGenerateMindMap, trackMindMapGeneration } from "@/lib/usage-tracker"

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
      maxNodes = 25,
      maxDepth = 3
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

    // Fetch document (use userId directly)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, user_id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      logger.error('Document fetch error for mind map generation', docError, { userId, documentId })
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

    // Estimate cost before generation
    const costEstimate = estimateRequestCost('gpt-3.5-turbo', document.extracted_text, 2000)
    logger.debug('Cost estimate for mind map generation', {
      userId,
      documentId,
      ...costEstimate
    })

    // Generate mind map
    logger.debug('Generating mind map', { userId, documentId, maxNodes, maxDepth })
    const mindMapData = await generateMindMap({
      text: document.extracted_text,
      maxNodes,
      maxDepth
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

    // Save to database
    const { data: mindMap, error: dbError } = await supabase
      .from('mindmaps')
      .insert({
        user_id: userId,
        document_id: documentId,
        title: mindMapData.title,
        nodes: mindMapData.nodes,
        edges: mindMapData.edges,
        layout_data: mindMapData.metadata
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Database save error for mind map', dbError, { userId, documentId })
      // Don't fail the request, mind map is still generated
    }

    // Track usage
    const totalTokens = mindMapData.nodes.reduce((sum, node) => sum + node.label.length + node.description.length, 0)

    // Track GPT usage for cost monitoring
    trackUsage(userId, 'gpt-3.5-turbo', costEstimate.inputTokens, costEstimate.outputTokens)

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
      nodeCount: mindMapData.nodes.length,
      edgeCount: mindMapData.edges.length
    })

    logger.debug('Mind map generation complete', {
      userId,
      documentId,
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
      documentText: document.extracted_text // Include for node detail expansion
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Mind map generation error', error, { userId, documentId: req.url, duration: `${duration}ms` })
    logger.api('POST', '/api/generate-mindmap', 500, duration, { userId, error: 'Unknown error' })

    return NextResponse.json(
      {
        error: error.message || "Failed to generate mind map",
        details: error.stack
      },
      { status: 500 }
    )
  }
}
