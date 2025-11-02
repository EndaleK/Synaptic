import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { analyzeWriting, checkCitationNeeds, analyzeAcademicStructure } from '@/lib/writing-assistant/grammar-checker'
import type { WritingType, CitationStyle } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { content, writingType, citationStyle, includeStructureAnalysis } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Use the enhanced grammar checker
    const suggestions = await analyzeWriting(
      content,
      writingType as WritingType,
      citationStyle as CitationStyle
    )

    // Optionally include citation needs check for academic writing
    let citationNeeds = []
    if (writingType === 'academic') {
      citationNeeds = await checkCitationNeeds(content)
    }

    // Optionally include structure analysis for academic writing
    let structureAnalysis = null
    if (includeStructureAnalysis && writingType === 'academic') {
      structureAnalysis = await analyzeAcademicStructure(content)
    }

    return NextResponse.json({
      suggestions,
      citationNeeds,
      structureAnalysis
    })
  } catch (error) {
    console.error('Writing analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze writing' },
      { status: 500 }
    )
  }
}
