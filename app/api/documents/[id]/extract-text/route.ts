/**
 * API Route: POST /api/documents/{id}/extract-text
 *
 * Extract text from a PDF without ChromaDB/RAG indexing
 * Useful for production environments without vector database
 *
 * Uses Gemini Vision API for serverless-friendly extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createSSEStream, createSSEHeaders } from '@/lib/sse-utils'
import { parseServerPDF } from '@/lib/server-pdf-parser'

export const maxDuration = 300 // 5 minutes for large file extraction
export const runtime = 'nodejs'

interface ExtractParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: ExtractParams
) {
  const documentId = (await params).id

  // Verify authentication
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stream = createSSEStream(async (send) => {
      try {
        // Step 1: Verify user owns document
        send({ type: 'progress', progress: 0, message: 'Verifying document ownership...' })

        const supabase = await createClient()
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (!profile) {
          throw new Error('User profile not found')
        }

        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .eq('user_id', profile.id)
          .single()

        if (docError || !document) {
          throw new Error('Document not found or access denied')
        }

        // Check if already extracted
        if (document.extracted_text && document.extracted_text.length > 100) {
          send({
            type: 'complete',
            data: {
              documentId,
              textLength: document.extracted_text.length,
              alreadyExtracted: true
            }
          })
          return
        }

        // Step 2: Download from storage
        send({ type: 'progress', progress: 10, message: 'Downloading document from storage...' })

        if (!document.storage_path) {
          throw new Error('Document has no storage path')
        }

        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('documents')
          .download(document.storage_path)

        if (downloadError || !fileData) {
          throw new Error('Failed to download document from storage')
        }

        // Step 3: Extract text
        send({ type: 'progress', progress: 30, message: 'Extracting text with AI (1-2 minutes)...' })

        const file = new File([fileData], document.file_name, { type: document.file_type })
        const parseResult = await parseServerPDF(file)

        if (parseResult.error || !parseResult.text) {
          throw new Error(`Text extraction failed: ${parseResult.error || 'No text extracted'}`)
        }

        send({ type: 'progress', progress: 70, message: `Extracted ${parseResult.text.length} characters...` })

        // Step 4: Save to database
        send({ type: 'progress', progress: 90, message: 'Saving to database...' })

        const { error: updateError } = await supabase
          .from('documents')
          .update({
            extracted_text: parseResult.text,
            metadata: {
              ...document.metadata,
              extraction_method: parseResult.method,
              text_length: parseResult.text.length,
              extracted_at: new Date().toISOString()
            }
          })
          .eq('id', documentId)

        if (updateError) {
          throw new Error('Failed to save extracted text to database')
        }

        // Success!
        send({ type: 'progress', progress: 100, message: 'Extraction complete!' })
        send({
          type: 'complete',
          data: {
            documentId,
            textLength: parseResult.text.length,
            method: parseResult.method
          }
        })

      } catch (error) {
        console.error('Text extraction error:', error)

        // Save error to database
        try {
          const supabase = await createClient()
          await supabase
            .from('documents')
            .update({
              metadata: {
                ...((await supabase.from('documents').select('metadata').eq('id', documentId).single()).data?.metadata || {}),
                extraction_error: error instanceof Error ? error.message : 'Unknown error',
                extraction_failed_at: new Date().toISOString()
              }
            })
            .eq('id', documentId)
        } catch (dbError) {
          console.error('Failed to save error to database:', dbError)
        }

        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Text extraction failed'
        })
      }
    })

    return new Response(stream, { headers: createSSEHeaders() })

  } catch (error) {
    console.error('Text extraction endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract text' },
      { status: 500 }
    )
  }
}
