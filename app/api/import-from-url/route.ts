import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { detectContentType, getSourceName } from "@/lib/importers/detector"
import { arxivImporter } from "@/lib/importers/arxiv"
import { webPageImporter } from "@/lib/importers/web-page"
import { detectDocumentSections } from "@/lib/document-parser/section-detector"
import type { WebImportProvider } from "@/lib/importers/types"
import { applyRateLimit, RateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { URLImportSchema, validateDocumentLength, validateContentSafety, validateImportURL } from "@/lib/validation"

// Force this route to be server-side only (not Edge runtime)
// JSDOM and other Node.js dependencies require server runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ImportRequest {
  url: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated import request')
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Apply rate limiting (upload tier - 20 requests/hour)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.upload, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for URL import', { userId })
      return rateLimitResponse
    }

    const { url }: ImportRequest = await request.json()

    if (!url) {
      logger.warn('No URL provided in import request', { userId })
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }

    // Validate URL format and safety (SSRF prevention)
    try {
      URLImportSchema.parse({ url })
    } catch (validationError) {
      logger.warn('URL validation failed', { userId, url, error: validationError })
      return NextResponse.json(
        { error: "Invalid URL. Must be a valid HTTPS URL." },
        { status: 400 }
      )
    }

    // Additional URL safety check
    const urlValidation = validateImportURL(url)
    if (!urlValidation.valid) {
      logger.warn('URL safety validation failed', { userId, url, reason: urlValidation.reason })
      return NextResponse.json(
        { error: urlValidation.reason },
        { status: 400 }
      )
    }

    logger.debug('Processing URL import', { userId, url })

    // Note: We use clerk userId directly as documents table uses user_id
    // which is the Clerk user ID from JWT

    // Detect content type
    const detected = detectContentType(url)

    if (detected.type === 'unsupported') {
      return NextResponse.json(
        { error: "URL type not supported for import" },
        { status: 400 }
      )
    }

    // Select appropriate importer
    let importer: WebImportProvider

    switch (detected.type) {
      case 'arxiv':
        importer = arxivImporter
        break
      case 'web':
      case 'medium':
      case 'pdf-url':
        importer = webPageImporter
        break
      case 'youtube':
        // YouTube will be implemented in Phase 2
        return NextResponse.json(
          { error: "YouTube import coming soon! For now, try academic papers or web articles." },
          { status: 501 }
        )
      default:
        return NextResponse.json(
          { error: "Importer not yet implemented for this content type" },
          { status: 501 }
        )
    }

    // Extract content
    let extractedContent
    try {
      logger.debug('Extracting content from URL', { userId, url, contentType: detected.type })
      extractedContent = await importer.extract(url)
      logger.debug('Content extraction successful', {
        userId,
        url,
        contentLength: extractedContent.content.length,
        title: extractedContent.metadata.title
      })
    } catch (extractError) {
      logger.error('Content extraction error', extractError, { userId, url })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/import-from-url', 500, duration, { userId, error: 'Extraction failed' })
      return NextResponse.json(
        {
          error: `Failed to extract content: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
          details: extractError instanceof Error ? extractError.stack : undefined
        },
        { status: 500 }
      )
    }

    // Validate extracted content
    const lengthValidation = validateDocumentLength(extractedContent.content)
    if (!lengthValidation.valid) {
      logger.warn('Extracted content length validation failed', {
        userId,
        url,
        length: extractedContent.content.length,
        reason: lengthValidation.reason
      })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/import-from-url', 400, duration, { userId, error: 'Invalid content length' })
      return NextResponse.json(
        { error: lengthValidation.reason },
        { status: 400 }
      )
    }

    const safetyValidation = validateContentSafety(extractedContent.content)
    if (!safetyValidation.safe) {
      logger.warn('Extracted content safety validation failed', {
        userId,
        url,
        reason: safetyValidation.reason
      })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/import-from-url', 400, duration, { userId, error: 'Content unsafe' })
      return NextResponse.json(
        { error: safetyValidation.reason },
        { status: 400 }
      )
    }

    // Parse document sections
    const sections = detectDocumentSections(
      extractedContent.content,
      extractedContent.metadata.sourceType
    )
    logger.debug('Document sections detected', {
      userId,
      url,
      totalSections: sections.totalSections,
      maxDepth: sections.maxDepth,
      sourceType: extractedContent.metadata.sourceType
    })

    // Save to Supabase
    const supabase = await createClient()

    logger.debug('Saving imported content to database', {
      userId,
      url,
      title: extractedContent.metadata.title,
      contentLength: extractedContent.content.length
    })

    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        file_name: extractedContent.metadata.title,
        file_type: 'imported',
        file_size: new TextEncoder().encode(extractedContent.content).length,
        extracted_text: extractedContent.content,
        sections: sections,
        processing_status: 'completed',
        source_url: url,
        source_type: extractedContent.metadata.sourceType,
        metadata: {
          author: extractedContent.metadata.author,
          publishedDate: extractedContent.metadata.publishedDate,
          description: extractedContent.metadata.description,
          tags: extractedContent.metadata.tags,
          wordCount: extractedContent.metadata.wordCount,
          readingTime: extractedContent.metadata.readingTime,
          format: extractedContent.format,
          ...extractedContent.metadata.additionalData
        }
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Database save error for imported content', dbError, { userId, url })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/import-from-url', 500, duration, { userId, error: 'Database error' })
      return NextResponse.json(
        { error: "Failed to save imported content" },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/import-from-url', 200, duration, {
      userId,
      url,
      documentId: document.id,
      sourceType: extractedContent.metadata.sourceType,
      contentLength: extractedContent.content.length,
      sectionsCount: sections.totalSections
    })

    logger.debug('URL import successful', {
      userId,
      url,
      documentId: document.id,
      title: extractedContent.metadata.title,
      duration: `${duration}ms`
    })

    return NextResponse.json({
      success: true,
      document_id: document.id,
      content: extractedContent.content,
      metadata: extractedContent.metadata,
      message: `Successfully imported ${getSourceName(detected.type)}: ${extractedContent.metadata.title}`
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Import API error', error, { userId, url: request.url, duration: `${duration}ms` })
    logger.api('POST', '/api/import-from-url', 500, duration, { userId, error: 'Unknown error' })

    return NextResponse.json(
      {
        error: "Failed to import content from URL",
        details: error.message
      },
      { status: 500 }
    )
  }
}
