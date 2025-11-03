/**
 * API Route: Upload Large Document (500MB+)
 *
 * Handles chunked uploads of large PDF files with streaming processing
 * 1. Accept file chunks from client
 * 2. Accumulate chunks in memory
 * 3. Upload to Cloudflare R2 storage (optional backup)
 * 4. Extract text using PDF parser
 * 5. Index in ChromaDB for vector search
 * 6. Save metadata to Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // Required for pdf-parse
export const maxDuration = 300 // 5 minutes max for Vercel hobby plan

// Temporary storage for chunks during upload (cleared after processing)
const chunkStorage = new Map<string, Buffer[]>()

/**
 * POST /api/upload-large-document
 *
 * Accepts multipart form data with file chunks
 * Supports files up to 500GB
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check if R2 and ChromaDB are configured
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({
        error: 'Large file upload not configured',
        details: 'Cloudflare R2 storage is not configured. Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables. See docs/LARGE_PDF_SETUP.md for setup instructions.',
        setupRequired: true
      }, { status: 503 })
    }

    if (!process.env.CHROMA_URL) {
      return NextResponse.json({
        error: 'Large file upload not configured',
        details: 'ChromaDB is not configured. Please set CHROMA_URL environment variable and ensure ChromaDB is running. See docs/LARGE_PDF_SETUP.md for setup instructions.',
        setupRequired: true
      }, { status: 503 })
    }

    // 3. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const chunkIndex = formData.get('chunkIndex') as string
    const totalChunks = formData.get('totalChunks') as string
    const fileName = formData.get('fileName') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 3. Generate unique document ID (use timestamp from first chunk only)
    // Use fileName + userId as consistent key across all chunks
    const chunkKey = `${userId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // 4. Convert chunk to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 5. Store chunk in memory
    const currentChunkIndex = parseInt(chunkIndex)
    if (!chunkStorage.has(chunkKey)) {
      console.log(`🆕 Starting new upload session for ${fileName}`)
      chunkStorage.set(chunkKey, [])
    }

    // Store chunk at correct index position
    const chunks = chunkStorage.get(chunkKey)!
    chunks[currentChunkIndex] = buffer

    console.log(`📤 Received chunk ${parseInt(chunkIndex) + 1}/${totalChunks} for ${fileName} (${buffer.length} bytes)`)

    // 6. If this is the last chunk, process the complete document
    const isLastChunk = currentChunkIndex === parseInt(totalChunks) - 1

    let processingResult = null
    let r2Url = ''
    let r2FileKey = ''

    if (isLastChunk) {
      console.log(`🔄 Processing complete document: ${fileName}`)

      try {
        // Get user profile ID from user_profiles table
        const supabase = await createClient()
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (profileError || !profile) {
          console.error('Failed to get user profile:', profileError)
          throw new Error('User profile not found. Please ensure your account is set up correctly.')
        }

        const userProfileId = profile.id
        console.log(`✅ Found user profile ID: ${userProfileId}`)

        // Concatenate all chunks into complete buffer
        const completeFileBuffer = Buffer.concat(chunks)
        console.log(`✅ Assembled ${completeFileBuffer.length} bytes from ${totalChunks} chunks`)

        // Clear chunk storage to free memory
        chunkStorage.delete(chunkKey)

        // Generate final document ID with timestamp
        const timestamp = Date.now()
        const documentId = `${userId}_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        r2FileKey = `documents/${userId}/${documentId}`

        // Upload complete file to R2 storage
        const { uploadToR2 } = await import('@/lib/r2-storage')
        const uploadResult = await uploadToR2(
          completeFileBuffer,
          r2FileKey,
          file.type || 'application/pdf'
        )
        r2Url = uploadResult.url
        console.log(`☁️ Uploaded complete file to R2: ${r2FileKey}`)

        // Save metadata to Supabase FIRST with 'processing' status
        // This allows user to see document immediately in UI
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: userProfileId,
            file_name: fileName,
            file_size: completeFileBuffer.length,
            file_type: file.type || 'application/pdf',
            storage_path: r2FileKey,
            extracted_text: '', // Will be updated after processing
            processing_status: 'processing', // Will be updated when complete
            metadata: {
              r2_url: r2Url,
              document_id: documentId,
            },
          })
          .select()
          .single()

        if (dbError) {
          console.error('Supabase insert error:', dbError)
          throw new Error('Failed to save document metadata')
        }

        console.log(`✅ Document metadata saved: ${document.id}, starting async processing`)

        // Process PDF extraction and indexing ASYNCHRONOUSLY in background
        // This allows immediate response to user (3 seconds) instead of 10+ minutes
        ;(async () => {
          try {
            console.log(`📄 Starting PDF text extraction for ${fileName}`)

            // Dynamically import pdf2json (avoids webpack bundling issues)
            const { default: PDFParser } = await import('pdf2json')

            // Extract text from complete PDF buffer
            const pdfData: any = await new Promise((resolve, reject) => {
              const pdfParser = new PDFParser()

              pdfParser.on("pdfParser_dataError", (errData: any) => {
                reject(new Error(errData.parserError?.message || 'PDF parsing failed'))
              })

              pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                resolve(pdfData)
              })

              pdfParser.parseBuffer(completeFileBuffer)
            })

            // Extract text from parsed PDF data
            let extractedText = ''
            let pageCount = 0

            if (pdfData && pdfData.Pages) {
              pageCount = pdfData.Pages.length

              pdfData.Pages.forEach((page: any) => {
                if (page.Texts) {
                  page.Texts.forEach((textItem: any) => {
                    if (textItem.R) {
                      textItem.R.forEach((run: any) => {
                        if (run.T) {
                          extractedText += decodeURIComponent(run.T) + ' '
                        }
                      })
                    }
                  })
                }
                extractedText += '\n'
              })
            }

            extractedText = extractedText.trim()

            console.log(`📄 Extracted ${extractedText.length} characters from ${pageCount} pages`)

            // Check if PDF is scanned (no extractable text)
            if (extractedText.length === 0) {
              console.warn(`⚠️ No text extracted from PDF. This appears to be a scanned document.`)

              // Update database with scanned PDF error
              await supabase
                .from('documents')
                .update({
                  processing_status: 'failed',
                  error_message: 'Scanned PDF detected - no extractable text. OCR processing required.',
                  metadata: {
                    r2_url: r2Url,
                    page_count: pageCount,
                    chunk_count: 0,
                    is_scanned: true,
                    document_id: documentId,
                  },
                })
                .eq('id', document.id)

              console.log(`❌ Document ${document.id} marked as scanned PDF`)
              return
            }

            // Update document with extracted text
            await supabase
              .from('documents')
              .update({
                extracted_text: extractedText.substring(0, 50000), // Store first 50K chars in DB
                metadata: {
                  r2_url: r2Url,
                  page_count: pageCount,
                  document_id: documentId,
                },
              })
              .eq('id', document.id)

            console.log(`🔍 Starting vector indexing for ${document.id}`)

            // Index in vector database
            const { indexDocument } = await import('@/lib/vector-store')
            const { chunks: vectorChunks } = await indexDocument(
              documentId,
              extractedText,
              {
                fileName,
                userId,
                pageCount: pageCount.toString(),
              }
            )

            console.log(`🔍 Indexed ${vectorChunks} chunks in ChromaDB for ${documentId}`)

            // Update document with final status
            const { error: updateError } = await supabase
              .from('documents')
              .update({
                processing_status: 'completed',
                metadata: {
                  r2_url: r2Url,
                  page_count: pageCount,
                  chunk_count: vectorChunks,
                  document_id: documentId,
                },
              })
              .eq('id', document.id)

            if (updateError) {
              console.error('Failed to update document with indexing results:', updateError)
            } else {
              console.log(`✅ Document ${document.id} processing completed`)
            }
          } catch (processingError) {
            console.error('Background processing error:', processingError)
            // Update document status to failed
            await supabase
              .from('documents')
              .update({
                processing_status: 'failed',
                error_message: processingError instanceof Error ? processingError.message : 'Unknown processing error',
              })
              .eq('id', document.id)
              .catch((updateErr) => {
                console.error('Failed to update error status:', updateErr)
              })
          }
        })()

        // Return immediately to user (don't wait for processing)
        processingResult = {
          documentId: document.id,
          fileName,
          fileSize: completeFileBuffer.length,
          pageCount: 0, // Unknown until processing completes
          chunks: 0, // Unknown until processing completes
          r2Url,
          processingStatus: 'processing',
        }

        console.log(`✅ Document uploaded successfully: ${document.id}. Processing in background.`)
      } catch (processingError) {
        console.error('Document processing error:', processingError)

        // Clean up chunk storage on error
        chunkStorage.delete(chunkKey)

        // Get user profile ID for error record
        const supabase = await createClient()
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        const userProfileId = profile?.id || null

        // Still save to DB with error status
        await supabase
          .from('documents')
          .insert({
            user_id: userProfileId,
            file_name: fileName,
            file_size: 0, // Don't have complete buffer in error case
            file_type: file.type || 'application/pdf',
            storage_path: r2FileKey || '',
            processing_status: 'failed',
            error_message: processingError instanceof Error ? processingError.message : 'Unknown error',
            metadata: {
              r2_url: r2Url || '',
            },
          })

        return NextResponse.json(
          {
            error: 'Document uploaded but processing failed',
            details: processingError instanceof Error ? processingError.message : 'Unknown error',
            r2Url,
          },
          { status: 500 }
        )
      }
    }

    // 7. Return success response for chunk upload
    return NextResponse.json({
      success: true,
      chunkIndex: currentChunkIndex,
      totalChunks: parseInt(totalChunks),
      isComplete: isLastChunk,
      message: isLastChunk ? 'Document processed successfully' : `Chunk ${currentChunkIndex + 1}/${totalChunks} received`,
      ...(r2Url && { r2Url }),
      ...(processingResult && { processing: processingResult }),
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/upload-large-document?documentId=xxx
 *
 * Get document processing status
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Query Supabase for document status
    const supabase = await createClient()

    // Get user profile ID first
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Query document by ID and verify ownership
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      documentId: document.id,
      fileName: document.file_name,
      status: document.processing_status,
      errorMessage: document.error_message,
      metadata: document.metadata,
      uploadedAt: document.created_at,
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}
