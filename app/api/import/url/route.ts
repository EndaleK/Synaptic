/**
 * API Route: POST /api/import/url
 *
 * Import content from external URLs (arXiv, web pages, Medium, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { detectContentType } from '@/lib/importers/detector'
import { arxivImporter } from '@/lib/importers/arxiv'
import { webPageImporter } from '@/lib/importers/web-page'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for fetching and processing

const requestSchema = z.object({
  url: z.string().url('Invalid URL format')
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request
    const body = await req.json()
    const { url } = requestSchema.parse(body)

    logger.info('URL import request', { userId, url })

    // 3. Detect content type
    const detected = detectContentType(url)
    if (detected.type === 'unsupported') {
      return NextResponse.json(
        { error: 'Unsupported URL type. Supported: arXiv, web pages, Medium' },
        { status: 400 }
      )
    }

    // 4. Get user profile
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 5. Select appropriate importer
    let importer
    let extractedContent

    try {
      if (detected.type === 'arxiv') {
        importer = arxivImporter
      } else {
        // Default to web page importer for all other types
        importer = webPageImporter
      }

      // 6. Extract content
      logger.info('Extracting content', { userId, url, importer: importer.name })
      extractedContent = await importer.extract(url)

    } catch (extractError) {
      logger.error('Content extraction failed', extractError, { userId, url })
      return NextResponse.json(
        { error: `Failed to extract content: ${extractError instanceof Error ? extractError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    // 7. Create document in database
    const fileName = `${extractedContent.metadata.title || 'Imported Document'}.md`
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: profile.id,
        file_name: fileName,
        file_type: 'text/markdown',
        file_size: extractedContent.content.length,
        extracted_text: extractedContent.content,
        processing_status: 'completed',
        metadata: {
          ...extractedContent.metadata,
          imported_from: 'url',
          original_url: url,
          importer: importer.name,
          detected_type: detected.type
        }
      })
      .select()
      .single()

    if (insertError || !document) {
      logger.error('Failed to create document', insertError, { userId, url })
      return NextResponse.json(
        { error: 'Failed to save imported document' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/import/url', 200, duration, {
      userId,
      documentId: document.id,
      url,
      type: detected.type,
      contentLength: extractedContent.content.length
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        title: extractedContent.metadata.title,
        source: url,
        type: detected.type
      }
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('POST /api/import/url error', error, { duration })
    logger.api('POST', '/api/import/url', 500, duration, { error: error?.message })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to import from URL',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
