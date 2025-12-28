/**
 * API Route: POST /api/documents/{id}/analyze
 *
 * Triggers document analysis to extract:
 * - Complexity score and factors
 * - Topics with difficulty ratings
 * - Time estimates (reading and study hours)
 * - Content type classification
 * - Recommended study modes per learning style
 *
 * GET /api/documents/{id}/analyze
 * Returns cached analysis if exists
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'
import {
  analyzeDocument,
  getDocumentAnalysis,
} from '@/lib/document-analyzer'

export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for AI topic extraction

/**
 * GET /api/documents/{id}/analyze
 * Get cached document analysis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    // Validate UUID format
    try {
      validateUUIDParam(documentId, 'document ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      )
    }

    // Verify document ownership
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get cached analysis
    const analysis = await getDocumentAnalysis(documentId)

    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis found. POST to this endpoint to analyze.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('[DocumentAnalyze] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get document analysis' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/{id}/analyze
 * Trigger document analysis (or return cached if exists)
 *
 * Query params:
 * - force=true: Force re-analysis even if cached
 * - skipAI=true: Skip AI topic extraction (faster, less accurate)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('force') === 'true'
    const skipAI = searchParams.get('skipAI') === 'true'

    // Validate UUID format
    try {
      validateUUIDParam(documentId, 'document ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      )
    }

    // Get user profile
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get document with extracted text
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, user_id')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if document has extracted text
    if (!document.extracted_text || document.extracted_text.length === 0) {
      return NextResponse.json(
        {
          error: 'Document has no extracted text. Wait for text extraction to complete.',
          hint: 'For large PDFs, text extraction happens in the background.',
        },
        { status: 400 }
      )
    }

    console.log(
      `[DocumentAnalyze] Analyzing document: ${document.file_name} (${document.extracted_text.length} chars)`
    )

    // Run analysis
    const analysis = await analyzeDocument(
      documentId,
      profile.id,
      document.extracted_text,
      {
        skipAI,
        forceRefresh,
      }
    )

    console.log(
      `[DocumentAnalyze] Analysis complete: complexity=${analysis.complexityScore}, topics=${analysis.topics.length}, readingTime=${analysis.estimatedReadingMinutes}min`
    )

    return NextResponse.json({
      analysis,
      cached: !forceRefresh && analysis.id !== undefined,
    })
  } catch (error) {
    console.error('[DocumentAnalyze] POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
