/**
 * API Route: POST /api/documents/{id}/complete
 *
 * Called after client completes direct upload to Supabase
 *
 * Actions:
 * 1. Verify file exists in Supabase Storage
 * 2. Get actual file size from storage
 * 3. Extract text (for small PDFs) or prepare for RAG indexing (large PDFs)
 * 4. Update document status to 'completed' or 'processing'
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow time for text extraction

const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

    // 2. Get user profile
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

    // 3. Get document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id) // Verify ownership
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    console.log(`📝 Completing upload for document: ${document.file_name}`)

    // 4. Verify file exists in Supabase Storage
    const { data: fileData, error: storageError } = await supabase
      .storage
      .from('documents')
      .list(document.storage_path.split('/')[0], {
        search: document.storage_path.split('/')[1]
      })

    if (storageError || !fileData || fileData.length === 0) {
      console.error('File not found in storage:', storageError)

      // Update document status to failed
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          metadata: {
            ...document.metadata,
            error: 'File not found in storage after upload',
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', documentId)

      return NextResponse.json(
        { error: 'File not found in storage. Upload may have failed.' },
        { status: 404 }
      )
    }

    const actualFileSize = fileData[0].metadata?.size || document.file_size

    console.log(`✅ File verified in storage: ${(actualFileSize / (1024 * 1024)).toFixed(2)} MB`)

    // 5. Determine processing strategy based on file size and type
    const isLargeFile = actualFileSize > LARGE_FILE_THRESHOLD
    const isPDF = document.file_type === 'application/pdf'

    // 6. Extract text from PDFs < 10MB (server-side)
    // Large PDFs (>10MB) will use RAG indexing on-demand
    let extractedText: string | null = null

    if (!isLargeFile && isPDF) {
      console.log(`📄 Extracting text from PDF (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB)...`)

      try {
        // Download PDF from storage
        const { data: pdfData, error: downloadError } = await supabase
          .storage
          .from('documents')
          .download(document.storage_path)

        if (downloadError || !pdfData) {
          console.error('Failed to download PDF for extraction:', downloadError)
        } else {
          // Extract text using server-side parser
          const { parseServerPDF } = await import('@/lib/server-pdf-parser')
          const file = new File([pdfData], document.file_name, { type: 'application/pdf' })
          const parseResult = await parseServerPDF(file)

          if (!parseResult.error && parseResult.text && parseResult.text.length > 0) {
            extractedText = parseResult.text
            console.log(`✅ Successfully extracted ${parseResult.text.length} characters from PDF`)
          } else {
            console.warn(`⚠️ PDF extraction returned no text or error: ${parseResult.error}`)
          }
        }
      } catch (extractionError) {
        console.error('PDF extraction failed during completion:', extractionError)
        // Continue anyway - document will still be viewable in PDF viewer
      }
    } else if (isLargeFile) {
      console.log(`📦 Large file detected (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB), RAG will be used on-demand`)
    }

    // 7. Update document record
    const updateData: any = {
      file_size: actualFileSize, // Update with actual size from storage
      processing_status: 'completed',
      metadata: {
        ...document.metadata,
        upload_completed_at: new Date().toISOString(),
        actual_file_size: actualFileSize,
        is_large_file: isLargeFile
      }
    }

    // Only update extracted_text if we successfully extracted something
    if (extractedText !== null) {
      updateData.extracted_text = extractedText
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)

    if (updateError) {
      console.error('Failed to update document:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document status' },
        { status: 500 }
      )
    }

    console.log(`✅ Upload completed successfully for: ${document.file_name}`)

    // 8. Return success response
    return NextResponse.json({
      success: true,
      documentId,
      fileName: document.file_name,
      fileSize: actualFileSize,
      processingStatus: 'completed',
      isLargeFile,
      hasExtractedText: extractedText !== null,
      message: isLargeFile
        ? 'Upload complete. Large file will be indexed for RAG processing.'
        : 'Upload complete. Document ready to use.'
    })

  } catch (error) {
    console.error('Upload completion error:', error)
    return NextResponse.json(
      {
        error: 'Failed to complete upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
