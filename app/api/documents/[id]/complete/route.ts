/**
 * API Route: POST /api/documents/{id}/complete
 *
 * Called after client completes direct upload to Supabase Storage
 *
 * Actions:
 * 1. Verify file exists in Supabase Storage
 * 2. Get actual file size from storage
 * 3. Mark document as "completed" immediately
 * 4. For small PDFs (<10MB): Extract text synchronously (ready in 2-5 seconds)
 * 5. For large PDFs (≥10MB): Queue async background job via Inngest
 * 6. For DOCX: Extract text synchronously with mammoth
 * 7. For other files: Mark as completed immediately
 *
 * PROCESSING Strategy:
 * - Small PDFs (<10MB): Synchronous extraction → Ready for learning modes in 2-5 seconds
 * - Large PDFs (≥10MB): Async Inngest processing → Ready in 15-60 seconds
 * - DOCX files: Synchronous extraction with mammoth → Ready immediately
 * - ChromaDB: Lazy indexing → Only indexed when user first tries to use document
 * - Result: Small documents ready instantly, large documents processed in background
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { incrementUsage } from '@/lib/usage-limits'
import { validateUUIDParam } from '@/lib/validation/uuid'
import { serverAnalytics } from '@/lib/analytics-server'
import { analyzeDocument } from '@/lib/document-analyzer'
import { orchestrateGeneration, getUserLearningStyle } from '@/lib/content-orchestrator'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes (Vercel Pro max) for PDF extraction and ChromaDB indexing

// File size thresholds for processing strategies
// Small PDFs (<10MB): Synchronous extraction during upload completion (fast, <5 seconds)
// Large PDFs (≥10MB): Async Inngest processing (if configured) or lazy extraction on first use
const SMALL_PDF_THRESHOLD = 10 * 1024 * 1024 // 10MB - sync extraction threshold

// Legacy threshold for RAG/chunked processing
const LARGE_FILE_THRESHOLD = 80 * 1024 * 1024 // 80MB

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

    // Validate UUID format
    try {
      validateUUIDParam(documentId, 'document ID')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      )
    }

    console.log('🎯 Document completion API called:', { userId, documentId, timestamp: new Date().toISOString() })

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

    // 5. Determine processing strategy based on file type and size
    // OPTIMIZATION: Mark all documents as "completed" immediately for fast UX
    // Text extraction happens in background via Inngest
    // ChromaDB indexing happens lazily when user first needs it
    const isPDF = document.file_type === 'application/pdf'
    const isLargeFile = actualFileSize > LARGE_FILE_THRESHOLD
    const processingStatus: 'completed' = 'completed' // Always completed immediately
    let extractedText: string | null = null
    let hasExtractedText = false
    const ragIndexed = false
    const ragChunkCount = 0
    let extractionMethod: string = 'none'
    let pageCount: number | undefined = undefined

    if (isPDF) {
      // Small PDFs (<10MB): Extract text synchronously for immediate use
      // Large PDFs (≥10MB): Queue async background processing via Inngest
      if (actualFileSize < SMALL_PDF_THRESHOLD) {
        // SMALL PDFs: Extract text synchronously (fast, typically <5 seconds)
        console.log(`📝 Extracting text from small PDF synchronously: ${document.file_name} (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB)`)

        try {
          // Download file from storage
          const { data: fileBlob, error: downloadError } = await supabase
            .storage
            .from('documents')
            .download(document.storage_path)

          if (downloadError) {
            console.error('❌ Failed to download PDF from storage:', downloadError)
            extractionMethod = 'failed_download'
          } else if (!fileBlob) {
            console.error('❌ No file blob returned from storage')
            extractionMethod = 'failed_no_blob'
          } else {
            console.log(`✅ Downloaded ${fileBlob.size} bytes, parsing PDF...`)
            const arrayBuffer = await fileBlob.arrayBuffer()

            // Create a File object from the blob for parseServerPDF
            const pdfFile = new File([arrayBuffer], document.file_name, { type: 'application/pdf' })

            // Use server-side PDF parser (pdf-parse with PyMuPDF fallback)
            const { parseServerPDF } = await import('@/lib/server-pdf-parser')
            const result = await parseServerPDF(pdfFile)

            if (result.error) {
              console.error(`❌ PDF parsing error: ${result.error}`)
              extractionMethod = 'failed_parse'
            } else if (!result.text || result.text.length === 0) {
              console.error(`❌ PDF extracted empty text - may be scanned/image-based`)
              extractionMethod = 'failed_empty'
            } else {
              extractedText = result.text
              hasExtractedText = true
              extractionMethod = result.method || 'pdf-parse'
              pageCount = result.pageCount // Capture page count for topic selection UI
              console.log(`✅ PDF text extracted synchronously: ${result.text.length} characters, ${pageCount} pages (method: ${extractionMethod})`)
            }
          }
        } catch (pdfError) {
          console.error('❌ PDF extraction exception:', pdfError)
          extractionMethod = 'failed_exception'
          // Not fatal - document still marked as completed
        }
      } else {
        // LARGE PDFs (≥10MB): Queue async background processing via Inngest
        console.log(`🚀 Triggering async text extraction for large PDF: ${document.file_name} (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB)`)

        try {
          await inngest.send({
            name: 'document/process',
            data: {
              documentId,
              userId: profile.id,
              fileName: document.file_name,
              fileType: document.file_type,
              fileSize: actualFileSize,
              storagePath: document.storage_path
            }
          })

          console.log(`✅ Background text extraction job queued for: ${document.file_name}`)
        } catch (inngestError) {
          console.error('Failed to queue Inngest job:', inngestError)
          // Not fatal - document still usable, text extraction will happen on first use (lazy loading)
        }
      }
    } else if (document.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               document.file_type === 'application/msword' ||
               document.file_type === 'application/vnd.ms-word' ||
               document.file_type === 'application/x-msword' ||
               document.file_name?.toLowerCase().endsWith('.docx') ||
               document.file_name?.toLowerCase().endsWith('.doc')) {
      // Word document processing
      const isDocx = document.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     document.file_name?.toLowerCase().endsWith('.docx')
      const isOldDoc = !isDocx && (
        document.file_type === 'application/msword' ||
        document.file_type === 'application/vnd.ms-word' ||
        document.file_type === 'application/x-msword' ||
        document.file_name?.toLowerCase().endsWith('.doc')
      )

      if (isOldDoc) {
        // Mammoth doesn't support .doc files - warn user
        console.warn(`⚠️ Old .doc format detected: ${document.file_name}. Mammoth only supports .docx`)
        extractionMethod = 'unsupported_doc_format'
        // Document is still marked as completed, but user will need to convert to .docx
      } else {
        // DOCX files: Extract text with mammoth
        console.log(`📝 Extracting text from DOCX: ${document.file_name} (type: ${document.file_type})`)

        try {
          // Download file from storage
          console.log(`📥 Downloading from storage: ${document.storage_path}`)
          const { data: fileBlob, error: downloadError } = await supabase
            .storage
            .from('documents')
            .download(document.storage_path)

          if (downloadError) {
            console.error('❌ Failed to download DOCX from storage:', downloadError)
            extractionMethod = 'failed_download'
          } else if (!fileBlob) {
            console.error('❌ No file blob returned from storage')
            extractionMethod = 'failed_no_blob'
          } else {
            console.log(`✅ Downloaded ${fileBlob.size} bytes`)
            const arrayBuffer = await fileBlob.arrayBuffer()

            // Extract text using mammoth directly
            console.log(`🔍 Parsing DOCX with mammoth...`)
            try {
              const mammoth = await import('mammoth')
              // Convert ArrayBuffer to Node.js Buffer for mammoth
              // mammoth uses {buffer} in Node.js, not {arrayBuffer} (which is browser-only)
              const buffer = Buffer.from(arrayBuffer)
              const result = await mammoth.extractRawText({ buffer })

              if (!result.value || result.value.trim().length === 0) {
                console.error(`❌ DOCX extracted empty text`)
                extractionMethod = 'failed_empty'
              } else {
                extractedText = result.value
                hasExtractedText = true
                extractionMethod = 'mammoth'
                console.log(`✅ DOCX text extracted: ${result.value.length} characters`)
              }
            } catch (mammothError) {
              console.error('❌ Mammoth parsing error:', mammothError)
              extractionMethod = 'failed_parse'
            }
          }
        } catch (docxError) {
          console.error('❌ DOCX extraction exception:', docxError)
          extractionMethod = 'failed_exception'
        }
      }
    } else {
      console.log(`✅ Non-PDF/DOCX file, marking as completed immediately`)
    }

    // 6. Update document record with processing results
    const updateData: any = {
      file_size: actualFileSize,
      processing_status: processingStatus, // Always 'completed' for fast UX
      extracted_text: extractedText, // For DOCX: extracted immediately, for PDF: populated by background job
      rag_indexed_at: ragIndexed ? new Date().toISOString() : null,
      rag_chunk_count: ragChunkCount,
      rag_collection_name: ragIndexed ? `doc_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}` : null,
      metadata: {
        ...document.metadata,
        upload_completed_at: new Date().toISOString(),
        actual_file_size: actualFileSize,
        is_large_file: isLargeFile,
        has_extracted_text: hasExtractedText, // True for small PDFs and DOCX (immediate extraction)
        text_extraction_queued: isPDF && !hasExtractedText && actualFileSize >= SMALL_PDF_THRESHOLD, // Only large PDFs queue background extraction
        processing_started_at: undefined, // Background job will set this for large PDFs
        processing_completed_at: new Date().toISOString(), // Upload completed immediately
        extraction_method: extractionMethod, // 'pdf-parse', 'pymupdf', 'mammoth', 'async_inngest', 'none', or 'failed_*'
        text_length: extractedText?.length || undefined,
        page_count: pageCount, // CRITICAL: Enables topic selection UI in flashcard generation
        rag_indexed: ragIndexed, // Will be false, indexing happens lazily
        optimization_note: isPDF
          ? (hasExtractedText
              ? 'Small PDF - text extracted synchronously during upload'
              : 'Large PDF - text extraction queued for background processing')
          : hasExtractedText
            ? 'Text extracted immediately during upload'
            : 'Fast upload - ready to use'
      }
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

    // Track document upload in usage tracking
    console.log('📊 About to track document upload:', { userId, feature: 'documents', fileName: document.file_name })
    await incrementUsage(userId, 'documents')

    // Track analytics event (fire-and-forget)
    serverAnalytics.documentUploaded(userId, document.file_type, actualFileSize)

    console.log(`✅ Upload completed for: ${document.file_name} (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB)`)

    if (isPDF && hasExtractedText) {
      console.log(`✅ Small PDF text extracted synchronously - ready for immediate use!`)
    } else if (isPDF && !hasExtractedText) {
      console.log(`🔄 Large PDF - text extraction queued for background processing`)
    }

    // 7. Auto-analyze document and queue content generation (non-blocking)
    // Only for documents with extracted text (skip large PDFs until background extraction completes)
    let analysisQueued = false
    let contentJobsQueued = 0

    if (hasExtractedText && extractedText) {
      try {
        console.log(`🧠 Starting auto-analysis for: ${document.file_name}`)

        // Run document analysis (complexity, topics, time estimates)
        const analysis = await analyzeDocument(
          documentId,
          profile.id,
          extractedText,
          { skipAI: false } // Use AI for topic extraction
        )

        console.log(`✅ Document analyzed: complexity=${analysis.complexityScore}, topics=${analysis.topics.length}`)
        analysisQueued = true

        // Get user's learning style and orchestrate content generation
        const learningStyle = await getUserLearningStyle(profile.id)
        console.log(`📚 User learning style: ${learningStyle}`)

        // Queue top 2 content types based on learning style
        const orchestrationResult = await orchestrateGeneration(
          documentId,
          profile.id,
          { learningStyle }
        )

        contentJobsQueued = orchestrationResult.queuedJobs.length
        console.log(
          `🚀 Content generation queued: ${contentJobsQueued} jobs`,
          orchestrationResult.queuedJobs.map((j) => j.contentType)
        )

        if (orchestrationResult.skippedTypes.length > 0) {
          console.log(
            `⏭️ Skipped content types:`,
            orchestrationResult.skippedTypes
          )
        }
      } catch (analysisError) {
        // Non-fatal: Document is still usable, just without auto-generated content
        console.error('⚠️ Auto-analysis/orchestration error (non-fatal):', analysisError)
      }
    }

    // 8. Return success response
    const successMessage = isPDF
      ? (hasExtractedText
          ? 'Document uploaded and ready to use!'
          : 'Document uploaded! Text extraction happening in background.')
      : 'Document uploaded successfully!'

    return NextResponse.json({
      success: true,
      documentId,
      fileName: document.file_name,
      fileSize: actualFileSize,
      processingStatus,
      hasExtractedText,
      message: successMessage,
      // Phase 2: Intelligent Study System
      intelligence: {
        analyzed: analysisQueued,
        contentJobsQueued,
        note: analysisQueued
          ? `Document analyzed and ${contentJobsQueued} content generation jobs queued based on your learning style.`
          : hasExtractedText
            ? 'Analysis will run after text extraction completes.'
            : 'Large file - analysis will run after background text extraction.',
      },
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
