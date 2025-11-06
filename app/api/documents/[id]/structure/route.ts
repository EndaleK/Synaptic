/**
 * Document Structure API
 *
 * GET /api/documents/[id]/structure
 * Returns book structure analysis including TOC, Index, Bookmarks, AI suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeBookStructure } from '@/lib/ai/analyzers/structure-analyzer'
import { generateContentSuggestions } from '@/lib/ai/analyzers/content-suggester'
import type { BookStructure, TOCSection } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if structure already analyzed and cached
    const bookStructure = document.book_structure as BookStructure | null
    const structureAnalysis = document.structure_analysis
    const aiSuggestions = document.ai_suggestions

    // If we have cached analysis, return it
    if (bookStructure && structureAnalysis && aiSuggestions) {
      console.log(`📚 Returning cached structure analysis for document ${params.id}`)

      return NextResponse.json({
        structures: bookStructure,
        analysis: structureAnalysis,
        suggestions: aiSuggestions,
        cached: true
      })
    }

    // If no structure detected yet, check if we need to analyze
    if (!bookStructure) {
      return NextResponse.json({
        error: 'Book structure not yet analyzed. Upload and process the document first.',
        message: 'Structure extraction happens during document upload. Please re-upload or wait for processing to complete.'
      }, { status: 404 })
    }

    // If we have structure but no analysis, generate it now
    console.log(`🔍 Generating structure analysis for document ${params.id}`)

    // Analyze structure quality
    const analysis = await analyzeBookStructure(bookStructure)

    // Generate content suggestions based on recommended structure
    let suggestions = null
    const recommendedStructure = bookStructure[analysis.recommended as keyof BookStructure]

    if (recommendedStructure && 'chapters' in recommendedStructure && recommendedStructure.chapters) {
      suggestions = await generateContentSuggestions(
        recommendedStructure.chapters as TOCSection[]
      )
    }

    // Cache the analysis in database
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        structure_analysis: analysis,
        ai_suggestions: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Failed to cache structure analysis:', updateError)
      // Continue anyway, just don't cache
    }

    return NextResponse.json({
      structures: bookStructure,
      analysis,
      suggestions,
      cached: false
    })

  } catch (error) {
    console.error('Structure API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze document structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/[id]/structure
 * Trigger (re-)analysis of document structure
 * Supports both initial extraction and re-analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      console.error('Unauthorized structure extraction attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🔍 Structure extraction requested for document ${params.id} by user ${userId}`)

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('User profile not found:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get document with extracted text (verify ownership)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      console.error('Document not found or access denied:', docError)
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    let bookStructure = document.book_structure as BookStructure | null

    // If no structure exists, extract it from text
    if (!bookStructure) {
      const extractedText = document.extracted_text

      if (!extractedText) {
        return NextResponse.json(
          { error: 'Document has no extracted text. Cannot analyze structure.' },
          { status: 400 }
        )
      }

      console.log(`📚 Extracting structure for document ${params.id} (first-time analysis)`)

      try {
        // Import structure detectors
        console.log('Importing structure detectors...')
        const { extractTOC } = await import('@/lib/structure-detectors/toc-detector')
        const { extractIndex } = await import('@/lib/structure-detectors/index-detector')
        const { extractCrossReferences } = await import('@/lib/structure-detectors/cross-ref-detector')
        const { quickAnalyzeStructure } = await import('@/lib/ai/analyzers/structure-analyzer')
        const { quickGenerateSuggestions } = await import('@/lib/ai/analyzers/content-suggester')
        console.log('✅ Imports successful')

        // Extract all structures
        console.log('Running structure detection...')
        const [toc, index, crossRefs] = await Promise.all([
          Promise.resolve(extractTOC(extractedText)),
          Promise.resolve(extractIndex(extractedText)),
          Promise.resolve(extractCrossReferences(extractedText))
        ])

        console.log(`📊 Structure detection results:`)
        console.log(`  - TOC: ${toc.detected ? `${toc.chapters.length} chapters` : 'not detected'}`)
        console.log(`  - Index: ${index.detected ? `${index.entries.length} entries` : 'not detected'}`)
        console.log(`  - Cross-refs: ${crossRefs.totalFound} references`)

        // Build book structure
        bookStructure = {
          toc: toc.detected ? toc : undefined,
          index: index.detected ? index : undefined,
          crossRefs: crossRefs.totalFound > 0 ? crossRefs : undefined,
        }

        // Check if any structure was found
        const hasStructure = toc.detected || index.detected || crossRefs.totalFound > 0

        if (!hasStructure) {
          console.log('❌ No structure detected in document')
          return NextResponse.json(
            {
              error: 'No book structure detected',
              message: 'This document does not appear to have a table of contents, index, or other structured elements. The Smart Structure feature works best with textbooks and academic materials that have clear organizational structure.'
            },
            { status: 404 }
          )
        }

        // Analyze and generate suggestions
        console.log('Analyzing structure quality...')
        const analysis = quickAnalyzeStructure(bookStructure)
        const recommendedStructure = bookStructure[analysis.recommended as keyof BookStructure]

        let suggestions = null
        if (recommendedStructure && 'chapters' in recommendedStructure && recommendedStructure.chapters) {
          console.log('Generating content suggestions...')
          suggestions = quickGenerateSuggestions(recommendedStructure.chapters as TOCSection[])
        }

        // Save to database
        console.log('Saving structure to database...')
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            book_structure: bookStructure,
            structure_analysis: analysis,
            ai_suggestions: suggestions,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.id)
          .eq('user_id', profile.id)

        if (updateError) {
          console.error('Database update error:', updateError)
          throw new Error(`Failed to save structure: ${updateError.message}`)
        }

        console.log(`✅ Structure extracted and saved for document ${params.id}`)

        return NextResponse.json({
          structures: bookStructure,
          analysis,
          suggestions,
          message: 'Structure extracted successfully',
          cached: false
        })
      } catch (extractionError) {
        console.error('Structure extraction error:', extractionError)
        throw new Error(
          `Structure extraction failed: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`
        )
      }
    }

    // Structure exists, just re-analyze
    console.log(`🔄 Re-analyzing structure for document ${params.id}`)

    const analysis = await analyzeBookStructure(bookStructure)

    // Generate suggestions
    let suggestions = null
    const recommendedStructure = bookStructure[analysis.recommended as keyof BookStructure]

    if (recommendedStructure && 'chapters' in recommendedStructure && recommendedStructure.chapters) {
      suggestions = await generateContentSuggestions(
        recommendedStructure.chapters as TOCSection[]
      )
    }

    // Update database
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        structure_analysis: analysis,
        ai_suggestions: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      throw new Error(`Failed to update structure analysis: ${updateError.message}`)
    }

    return NextResponse.json({
      structures: bookStructure,
      analysis,
      suggestions,
      message: 'Structure re-analyzed successfully',
      cached: false
    })

  } catch (error) {
    console.error('Structure analysis error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze document structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
