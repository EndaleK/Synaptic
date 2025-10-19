import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { detectContentType, getSourceName } from "@/lib/importers/detector"
import { arxivImporter } from "@/lib/importers/arxiv"
import { webPageImporter } from "@/lib/importers/web-page"
import type { WebImportProvider } from "@/lib/importers/types"

interface ImportRequest {
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const { url }: ImportRequest = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      )
    }

    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

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
      extractedContent = await importer.extract(url)
    } catch (extractError) {
      console.error('Content extraction error:', extractError)
      return NextResponse.json(
        {
          error: `Failed to extract content: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
          details: extractError instanceof Error ? extractError.stack : undefined
        },
        { status: 500 }
      )
    }

    // Save to Supabase
    const supabase = await createClient()

    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        file_name: extractedContent.metadata.title,
        file_type: 'imported',
        file_size: new TextEncoder().encode(extractedContent.content).length,
        extracted_text: extractedContent.content,
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
      console.error('Database save error:', dbError)
      return NextResponse.json(
        { error: "Failed to save imported content" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      content: extractedContent.content,
      metadata: extractedContent.metadata,
      message: `Successfully imported ${getSourceName(detected.type)}: ${extractedContent.metadata.title}`
    })

  } catch (error: any) {
    console.error("Import API error:", error)

    return NextResponse.json(
      {
        error: "Failed to import content from URL",
        details: error.message
      },
      { status: 500 }
    )
  }
}
