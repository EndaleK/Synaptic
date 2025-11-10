/**
 * API Route: Generate Mind Map with RAG (Retrieval-Augmented Generation)
 *
 * For large documents (500MB+ textbooks):
 * 1. Use document ID to load from vector store
 * 2. Retrieve relevant chunks using semantic search (for topic mode)
 * 3. Generate mind map from selected content or full document
 * 4. Much more memory-efficient than processing entire document
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { searchDocument, getDocumentStats } from "@/lib/vector-store"
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

export const maxDuration = 300 // 5 minutes for complex documents
export const runtime = 'nodejs' // Required for pdf2json

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated mind map RAG generation request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting (AI tier - 10 requests/min)
    const rateLimitResponse = await applyRateLimit(req, RateLimits.ai, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for mind map RAG generation', { userId })
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
      logger.warn('Mind map RAG generation validation failed', { userId, error: validationError })
      return NextResponse.json(
        { error: "Invalid input. Check documentId, maxNodes, and maxDepth." },
        { status: 400 }
      )
    }

    // Check usage limits based on subscription tier
    const usageCheck = await checkUsageLimit(userId, 'mindmaps')
    if (!usageCheck.allowed) {
      logger.warn('Mind map RAG generation blocked - usage limit reached', {
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
    logger.debug('Starting mind map RAG generation with streaming', {
      userId,
      documentId,
      maxNodes,
      maxDepth,
      selection: selection?.type || 'full'
    })

    const stream = createSSEStream(async (send) => {
      // Progress tracker for multi-step process
      const tracker = new ProgressTracker([
        'Fetching document',
        'Extracting content',
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
          logger.warn('Document not found or unauthorized for mind map RAG', { userId, documentId })
          throw new Error('Document not found or access denied')
        }

        // Step 2: Extract content based on selection
        tracker.completeStep(2, 'Extracting content...')

        let documentText = ''
        let selectionDescription = 'full document'

        if (selection && selection.type === 'pages' && selection.pageRange) {
          // PAGE RANGE MODE: Extract text from specific pages
          const { start, end } = selection.pageRange
          selectionDescription = `pages ${start}-${end}`

          logger.info('Mind map RAG generation with page range', {
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

          if (!documentText || documentText.trim().length === 0) {
            throw new Error('No content found in selected page range')
          }

        } else if (selection && selection.type === 'topic' && selection.topic) {
          // TOPIC MODE: Use vector search for topic-specific content
          const topicQuery = selection.topic.title
          selectionDescription = `topic: ${topicQuery}`

          logger.info('Mind map RAG generation with topic', {
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
              documentText = document.extracted_text.substring(0, 48000)
            } else {
              throw new Error('Document not indexed and has no extracted text. Please index the document first.')
            }
          } else {
            // Use vector search to find relevant chunks
            const topicResults = await searchDocument(documentId, topicQuery, 10)
            const relevantChunks = topicResults.map((r) => r.text)
            documentText = relevantChunks.join('\n\n').substring(0, 48000)

            logger.debug('Topic-based RAG retrieval for mind map', {
              userId,
              documentId,
              topic: topicQuery,
              chunksRetrieved: relevantChunks.length,
            })
          }

        } else {
          // FULL DOCUMENT MODE: Use vector search for comprehensive coverage
          selectionDescription = 'full document'

          logger.info('Mind map RAG generation for full document', {
            userId,
            documentId,
          })

          // Check if document is indexed
          const docStats = await getDocumentStats(documentId)
          if (!docStats.exists || docStats.chunkCount === 0) {
            logger.warn('Document not RAG indexed, falling back to extracted_text', { documentId })
            // Fallback: use extracted_text
            if (document.extracted_text) {
              documentText = document.extracted_text.substring(0, 48000)
            } else {
              throw new Error('Document not indexed and has no extracted text. Please index the document first.')
            }
          } else {
            // Use broad query to get representative chunks from entire document
            const overviewQuery = `${document.file_name} overview main topics key concepts structure`
            const overviewResults = await searchDocument(documentId, overviewQuery, 15)
            const representativeChunks = overviewResults.map((r) => r.text)
            documentText = representativeChunks.join('\n\n').substring(0, 48000)

            logger.debug('Full document RAG retrieval for mind map', {
              userId,
              documentId,
              chunksRetrieved: representativeChunks.length,
            })
          }
        }

        // Validate extracted text
        if (!documentText || documentText.trim().length === 0) {
          throw new Error('No content extracted from document')
        }

        logger.debug('Document text prepared for mind map RAG', {
          userId,
          documentId,
          fileName: document.file_name,
          selectionType: selection?.type || 'full',
          selectionDescription,
          textLength: documentText.length
        })

        // Step 3: Analyze complexity
        tracker.completeStep(3, 'Analyzing document complexity...')

        // Analyze document complexity to determine optimal parameters
        const complexityAnalysis = analyzeDocumentComplexity(documentText)
        logger.debug('Document complexity analysis for RAG', {
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
            logger.info('Anthropic not configured, falling back to DeepSeek for complex RAG document', { userId, documentId })
          }
        } else {
          // Simple/moderate documents: Use DeepSeek for cost savings
          selectedProviderType = 'deepseek'
        }

        const selectedProvider = providerFactory.getProviderWithFallback(selectedProviderType, 'openai')

        // Check if provider is configured
        if (!selectedProvider.isConfigured()) {
          logger.error('AI provider not configured for mind map RAG', null, {
            userId,
            documentId,
            attemptedProvider: selectedProvider.name,
            requestedProvider: selectedProviderType
          })
          throw new Error(`Mind map generation is not configured. Please add at least one AI provider API key to your environment variables. Attempted to use ${selectedProvider.name}, but API key is missing. Add one of: DEEPSEEK_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY`)
        }

        // Safety cap: DeepSeek works best with fewer nodes
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

        logger.info('Selected AI provider for mind map RAG', {
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
        logger.debug('Cost estimate for mind map RAG generation', {
          userId,
          documentId,
          provider: selectedProvider.name,
          model: modelName,
          ...costEstimate
        })

        // Step 4: Generate mind map
        tracker.completeStep(4, 'Generating mind map structure...')

        logger.debug('Generating mind map with RAG', {
          userId,
          documentId,
          provider: selectedProvider.name,
          maxNodes: effectiveMaxNodes,
          maxDepth: effectiveMaxDepth,
          autoDetected: body.maxNodes === undefined && body.maxDepth === undefined,
          selection: selectionDescription
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
          logger.warn('Mind map RAG validation failed, but continuing', {
            userId,
            documentId,
            nodeCount: mindMapData.nodes.length,
            edgeCount: mindMapData.edges.length
          })
        }

        logger.debug('Mind map RAG generated', {
          userId,
          documentId,
          nodeCount: mindMapData.nodes.length,
          edgeCount: mindMapData.edges.length
        })

        // Step 5: Processing structure complete
        tracker.completeStep(5, 'Processing nodes and edges...')

        // Step 6: Save to database
        tracker.completeStep(6, 'Saving mind map to database...')

        // Save to database using Supabase UUID
        const { data: savedMindMap, error: dbError } = await supabase
          .from('mindmaps')
          .insert({
            user_id: profile.id,
            document_id: documentId,
            title: mindMapData.title,
            description: mindMapData.description || `Mind map for ${document.file_name}`,
            nodes: mindMapData.nodes,
            edges: mindMapData.edges,
            metadata: {
              complexity: complexityAnalysis.complexity,
              complexity_score: complexityAnalysis.score,
              provider: selectedProvider.name,
              auto_detected: body.maxNodes === undefined && body.maxDepth === undefined,
              selection: selectionDescription,
              rag_mode: true
            }
          })
          .select()
          .single()

        if (dbError) {
          logger.error('Database save error for mind map RAG', dbError, {
            userId,
            documentId
          })
          throw new Error(`Failed to save mind map: ${dbError.message}`)
        }

        // Track usage
        trackUsage(userId, modelName, documentText, JSON.stringify(mindMapData))
        await incrementUsage(userId, 'mindmaps')

        await supabase.from('usage_tracking').insert({
          user_id: profile.id,
          action_type: 'mindmap_generation_rag',
          tokens_used: documentText.length + JSON.stringify(mindMapData).length,
          metadata: {
            document_id: documentId,
            provider: selectedProvider.name,
            nodes: mindMapData.nodes.length,
            edges: mindMapData.edges.length,
            complexity: complexityAnalysis.complexity,
            selection: selectionDescription
          }
        })

        const duration = Date.now() - startTime
        logger.api('POST', '/api/generate-mindmap-rag', 200, duration, {
          userId,
          documentId,
          mindMapId: savedMindMap.id,
          nodes: mindMapData.nodes.length,
          edges: mindMapData.edges.length,
          provider: selectedProvider.name,
          complexity: complexityAnalysis.complexity,
          selection: selectionDescription
        })

        logger.debug('Mind map RAG generation complete', {
          userId,
          documentId,
          mindMapId: savedMindMap.id,
          duration: `${duration}ms`
        })

        // Send completion event with mind map data
        send({
          type: 'complete',
          data: {
            success: true,
            mindMap: {
              id: savedMindMap.id,
              title: mindMapData.title,
              description: mindMapData.description,
              nodes: mindMapData.nodes,
              edges: mindMapData.edges,
              metadata: {
                complexity: complexityAnalysis.complexity,
                complexity_score: complexityAnalysis.score,
                provider: selectedProvider.name,
                selection: selectionDescription,
                rag_mode: true
              }
            }
          }
        })

      } catch (error) {
        logger.error('Mind map RAG generation error', error, { userId, documentId })

        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Mind map generation failed'
        })
      }
    })

    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error) {
    logger.error('Mind map RAG endpoint error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate mind map' },
      { status: 500 }
    )
  }
}
