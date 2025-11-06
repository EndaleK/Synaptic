/**
 * API Route: Update Document Text
 *
 * Saves client-extracted PDF text and extracts book structure
 * Called after browser-based PDF processing completes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { extractTOC } from '@/lib/structure-detectors/toc-detector'
import { extractIndex } from '@/lib/structure-detectors/index-detector'
import { extractCrossReferences } from '@/lib/structure-detectors/cross-ref-detector'
import { buildDetectedHeadings } from '@/lib/structure-detectors/heading-detector'
import { quickAnalyzeStructure } from '@/lib/ai/analyzers/structure-analyzer'
import { quickGenerateSuggestions } from '@/lib/ai/analyzers/content-suggester'
import type { BookStructure, TOCSection } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes - includes structure extraction

/**
 * POST /api/documents/update-text
 *
 * Updates document with extracted text and marks as completed
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const { documentId, extractedText, pageCount } = await request.json()

    if (!documentId || !extractedText) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId and extractedText' },
        { status: 400 }
      )
    }

    // 3. Get user profile ID
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Failed to get user profile:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 4. Fetch existing document to preserve metadata (r2_url, topics, etc.)
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !existingDoc) {
      console.error('Failed to fetch existing document:', fetchError)
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 5. Verify document ownership and update with merged metadata
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: extractedText.substring(0, 50000), // Store first 50K chars in DB
        processing_status: 'completed',
        metadata: {
          ...(existingDoc.metadata || {}), // Preserve existing metadata (r2_url, topics, etc.)
          page_count: pageCount,
          extraction_method: 'client-side',
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', documentId)
      .eq('user_id', profile.id) // Verify ownership
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update document:', updateError)
      return NextResponse.json(
        { error: `Database update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    console.log(`✅ Document ${documentId} updated with ${extractedText.length} characters from ${pageCount} pages`)

    // 6. Extract book structure in background (don't block response)
    // This runs asynchronously after responding to client
    extractBookStructure(documentId, extractedText, profile.id).catch(error => {
      console.error('Background structure extraction failed:', error)
      // Don't fail the request, structure extraction is optional enhancement
    })

    return NextResponse.json({
      success: true,
      documentId: document.id,
      textLength: extractedText.length,
      pageCount,
      message: 'Document text saved. Structure extraction in progress...'
    })

  } catch (error) {
    console.error('Error updating document text:', error)
    return NextResponse.json(
      {
        error: 'Failed to update document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Background task: Extract book structure from text
 * Runs asynchronously after text is saved
 */
async function extractBookStructure(
  documentId: string,
  extractedText: string,
  userId: string
) {
  console.log(`📚 Starting structure extraction for document ${documentId}`)

  try {
    const startTime = Date.now()

    // Run all structure detectors in parallel
    const [toc, index, crossRefs] = await Promise.all([
      Promise.resolve(extractTOC(extractedText)),
      Promise.resolve(extractIndex(extractedText)),
      Promise.resolve(extractCrossReferences(extractedText))
    ])

    console.log(`📊 Structure detection results:`)
    console.log(`  - TOC: ${toc.detected ? `${toc.chapters.length} chapters` : 'not detected'}`)
    console.log(`  - Index: ${index.detected ? `${index.entries.length} entries` : 'not detected'}`)
    console.log(`  - Cross-refs: ${crossRefs.totalFound} references`)

    // Build book structure object
    const bookStructure: BookStructure = {
      toc: toc.detected ? toc : undefined,
      index: index.detected ? index : undefined,
      crossRefs: crossRefs.totalFound > 0 ? crossRefs : undefined,
      // Note: headings and bookmarks come from PDF.js extraction (not from text)
      // They would be set during client-side PDF processing if available
    }

    // Only analyze if we found at least one structure
    const hasStructure = toc.detected || index.detected || crossRefs.totalFound > 0

    if (!hasStructure) {
      console.log(`ℹ️  No book structure detected for document ${documentId}`)
      return
    }

    // Quick analysis (heuristic-only, no AI calls to keep it fast)
    const analysis = quickAnalyzeStructure(bookStructure)

    console.log(`🎯 Structure analysis: Recommended structure is "${analysis.recommended}" (score: ${analysis.scores[analysis.recommended] || 0}/100)`)

    // Generate content suggestions based on recommended structure
    let suggestions = null
    const recommendedStructure = bookStructure[analysis.recommended as keyof BookStructure]

    if (recommendedStructure && 'chapters' in recommendedStructure && recommendedStructure.chapters) {
      suggestions = quickGenerateSuggestions(recommendedStructure.chapters as TOCSection[])
      console.log(`💡 Generated ${suggestions.flashcards.length} flashcard suggestions, ${suggestions.podcasts.length} podcast suggestions, ${suggestions.mindmaps.length} mindmap suggestions`)
    }

    // Save to database
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        book_structure: bookStructure,
        structure_analysis: analysis,
        ai_suggestions: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Failed to save book structure:', updateError)
      throw updateError
    }

    const duration = Date.now() - startTime
    console.log(`✅ Structure extraction completed in ${duration}ms for document ${documentId}`)

  } catch (error) {
    console.error('Structure extraction error:', error)
    throw error
  }
}
