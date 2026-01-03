/**
 * API Route: /api/flashcards/export
 *
 * POST: Export flashcards in various formats (Anki text, CSV, APKG)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateAnkiExport,
  generateAnkiTextExport,
  generateCSVExport,
  type FlashcardForExport
} from '@/lib/anki-export'
import {
  generatePDFExport,
  type PDFLayout
} from '@/lib/pdf-export'

export const runtime = 'nodejs'

type ExportFormat = 'anki-text' | 'csv' | 'apkg' | 'pdf'

interface ExportRequest {
  format: ExportFormat
  flashcardIds?: string[]
  documentId?: string
  deckName?: string
  includeReversed?: boolean
  includeTags?: boolean
  // PDF-specific options
  pdfLayout?: PDFLayout
  includeAnswers?: boolean
}

/**
 * POST /api/flashcards/export
 * Export flashcards in the specified format
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExportRequest = await req.json()
    const {
      format = 'anki-text',
      flashcardIds,
      documentId,
      deckName = 'Synaptic Export',
      includeReversed = false,
      includeTags = true,
      pdfLayout = 'grid',
      includeAnswers = true
    } = body

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Build query for flashcards
    let query = supabase
      .from('flashcards')
      .select(`
        id,
        front,
        back,
        tags,
        created_at,
        difficulty,
        document_id,
        documents!inner(file_name)
      `)
      .eq('user_id', profile.id)

    // Filter by specific flashcard IDs
    if (flashcardIds && flashcardIds.length > 0) {
      query = query.in('id', flashcardIds)
    }

    // Filter by document
    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    // Order by creation date
    query = query.order('created_at', { ascending: true })

    const { data: flashcards, error: fetchError } = await query

    if (fetchError) {
      console.error('[Flashcards Export] Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch flashcards' },
        { status: 500 }
      )
    }

    if (!flashcards || flashcards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards found to export' },
        { status: 404 }
      )
    }

    // Transform to export format
    const exportCards: FlashcardForExport[] = flashcards.map(card => ({
      id: card.id,
      front: card.front,
      back: card.back,
      tags: card.tags || [],
      created_at: card.created_at,
      difficulty: card.difficulty
    }))

    // Determine deck name from document if not provided
    let finalDeckName = deckName
    if (documentId && flashcards[0]?.documents) {
      const docs = flashcards[0].documents as { file_name: string }[] | { file_name: string }
      const docName = Array.isArray(docs) ? docs[0]?.file_name : docs.file_name
      if (docName) {
        finalDeckName = docName.replace(/\.[^/.]+$/, '') || deckName
      }
    }

    const options = {
      deckName: finalDeckName,
      includeReversed,
      includeTags
    }

    // Generate export based on format
    switch (format) {
      case 'anki-text': {
        const { filename, content } = generateAnkiTextExport(exportCards, options)

        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Filename': filename
          }
        })
      }

      case 'csv': {
        const { filename, content } = generateCSVExport(exportCards, options)

        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Filename': filename
          }
        })
      }

      case 'apkg': {
        const { filename, data } = await generateAnkiExport(exportCards, options)

        return new NextResponse(data, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Filename': filename
          }
        })
      }

      case 'pdf': {
        const pdfOptions = {
          deckName: finalDeckName,
          layout: pdfLayout,
          includeAnswers,
          includeTags
        }
        const { filename, data } = await generatePDFExport(exportCards, pdfOptions)

        return new NextResponse(data, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Filename': filename
          }
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid export format. Use: anki-text, csv, apkg, or pdf' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Flashcards Export] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export flashcards' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/flashcards/export
 * Get export options and available flashcard counts
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Build count query
    let countQuery = supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)

    if (documentId) {
      countQuery = countQuery.eq('document_id', documentId)
    }

    const { count } = await countQuery

    // Get documents with flashcards for dropdown
    const { data: documents } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        flashcards!inner(id)
      `)
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })

    const documentsWithCounts = documents?.map(doc => ({
      id: doc.id,
      name: doc.file_name,
      flashcardCount: Array.isArray(doc.flashcards) ? doc.flashcards.length : 0
    })) || []

    return NextResponse.json({
      totalFlashcards: count || 0,
      documents: documentsWithCounts,
      formats: [
        {
          id: 'anki-text',
          name: 'Anki Text Import',
          description: 'Tab-separated file for Anki import',
          extension: '.txt'
        },
        {
          id: 'csv',
          name: 'CSV (Universal)',
          description: 'Comma-separated values for any app',
          extension: '.csv'
        },
        {
          id: 'pdf',
          name: 'PDF Study Sheet',
          description: 'Printable PDF for offline study',
          extension: '.pdf'
        },
        {
          id: 'apkg',
          name: 'Anki Package',
          description: 'Native Anki deck package (experimental)',
          extension: '.apkg'
        }
      ]
    })
  } catch (error) {
    console.error('[Flashcards Export] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to get export options' },
      { status: 500 }
    )
  }
}
