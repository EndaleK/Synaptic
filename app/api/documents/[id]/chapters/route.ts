/**
 * API Route: GET /api/documents/{id}/chapters
 *
 * Extracts chapter/section structure from a document for lazy RAG indexing.
 * Allows users to select specific chapters to index rather than entire textbook.
 *
 * Process:
 * 1. Fetch document from database
 * 2. Get extracted text (or download from storage if needed)
 * 3. Use AI + heuristics to identify chapter boundaries
 * 4. Return structured chapter data
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { extractChapters } from '@/lib/chapter-extractor'
import { validateUUIDParam } from '@/lib/validation/uuid'

export const runtime = 'nodejs'
export const maxDuration = 30 // Chapter extraction can take 15-20 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    // Validate UUID format
    try {
      validateUUIDParam(documentId, 'Document ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    // 2. Get user profile
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    console.log(`📖 Extracting chapters from: ${document.file_name}`)

    // 4. Get document text
    let documentText = document.extracted_text

    // If no extracted text, try to download and extract
    if (!documentText || documentText.trim().length === 0) {
      console.log('⚠️ No extracted text found, attempting to download from storage...')

      if (document.file_type === 'application/pdf') {
        try {
          const { data: pdfData, error: downloadError } = await supabase
            .storage
            .from('documents')
            .download(document.storage_path)

          if (!downloadError && pdfData) {
            const { parseServerPDF } = await import('@/lib/server-pdf-parser')
            const file = new File([pdfData], document.file_name, { type: 'application/pdf' })
            const parseResult = await parseServerPDF(file)

            if (!parseResult.error && parseResult.text) {
              documentText = parseResult.text
            }
          }
        } catch (extractError) {
          console.error('Failed to extract text during chapter extraction:', extractError)
        }
      }
    }

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text content available for chapter extraction' },
        { status: 400 }
      )
    }

    // 5. Extract chapters using AI + heuristics
    const result = await extractChapters(documentText, {
      fileName: document.file_name,
      pageCount: document.metadata?.pageCount || undefined
    })

    console.log(`✅ Extracted ${result.chapters.length} chapters using ${result.extractionMethod} method`)

    return NextResponse.json({
      success: true,
      chapters: result.chapters,
      totalPages: result.totalPages,
      extractionMethod: result.extractionMethod,
      documentId,
      documentName: document.file_name
    })

  } catch (error) {
    console.error('Chapter extraction error:', error)
    return NextResponse.json(
      {
        error: 'Failed to extract chapters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
