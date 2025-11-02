/**
 * API Route: Upload Large Document (500MB+)
 *
 * Handles chunked uploads of large PDF files with streaming processing
 * 1. Accept file chunks from client
 * 2. Upload to Cloudflare R2 storage
 * 3. Extract text using streaming PDF parser
 * 4. Index in ChromaDB for vector search
 * 5. Save metadata to Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // Required for pdf-parse
export const maxDuration = 300 // 5 minutes for large files

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

    // 3. Generate unique document ID
    const timestamp = Date.now()
    const documentId = `${userId}_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const r2Key = `documents/${userId}/${documentId}`

    // 4. Convert file to buffer for R2 upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 5. Dynamically import R2 and vector store modules
    const { uploadToR2 } = await import('@/lib/r2-storage')
    const { indexDocument } = await import('@/lib/vector-store')

    // 6. Upload to R2 storage
    console.log(`📤 Uploading chunk ${chunkIndex}/${totalChunks} for ${fileName}`)
    const { url: r2Url, key: r2FileKey } = await uploadToR2(
      buffer,
      r2Key,
      file.type || 'application/pdf'
    )

    // 7. If this is the last chunk, process the complete document
    const isLastChunk = parseInt(chunkIndex) === parseInt(totalChunks) - 1

    let processingResult = null
    if (isLastChunk) {
      console.log(`🔄 Processing complete document: ${fileName}`)

      try {
        // Dynamically import pdf2json (avoids webpack bundling issues)
        const { default: PDFParser } = await import('pdf2json')

        // Extract text from PDF buffer
        const pdfData: any = await new Promise((resolve, reject) => {
          const pdfParser = new PDFParser()

          pdfParser.on("pdfParser_dataError", (errData: any) => {
            reject(new Error(errData.parserError?.message || 'PDF parsing failed'))
          })

          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            resolve(pdfData)
          })

          pdfParser.parseBuffer(buffer)
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

        // Index in vector database for RAG
        const { chunks } = await indexDocument(
          documentId,
          extractedText,
          {
            fileName,
            userId,
            pageCount: pageCount.toString(),
          }
        )

        // Save metadata to Supabase
        const supabase = await createClient()
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .insert({
            clerk_user_id: userId,
            file_name: fileName,
            file_size: buffer.length,
            file_type: file.type || 'application/pdf',
            r2_file_key: r2FileKey,
            extracted_content: extractedText.substring(0, 50000), // Store first 50K chars in DB
            page_count: pageCount,
            chunk_count: chunks,
            processing_status: 'completed',
          })
          .select()
          .single()

        if (dbError) {
          console.error('Supabase insert error:', dbError)
          throw new Error('Failed to save document metadata')
        }

        processingResult = {
          documentId: document.id,
          fileName,
          fileSize: buffer.length,
          pageCount,
          chunks,
          r2Url,
        }

        console.log(`✅ Document processed successfully: ${documentId}`)
      } catch (processingError) {
        console.error('Document processing error:', processingError)

        // Still save to DB with error status
        const supabase = await createClient()
        await supabase
          .from('documents')
          .insert({
            clerk_user_id: userId,
            file_name: fileName,
            file_size: buffer.length,
            file_type: file.type || 'application/pdf',
            r2_file_key: r2FileKey,
            processing_status: 'failed',
            error_message: processingError instanceof Error ? processingError.message : 'Unknown error',
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

    // 7. Return success response
    return NextResponse.json({
      success: true,
      chunkIndex: parseInt(chunkIndex),
      totalChunks: parseInt(totalChunks),
      isComplete: isLastChunk,
      documentId,
      r2Url,
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
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('clerk_user_id', userId)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      documentId: document.id,
      fileName: document.file_name,
      status: document.processing_status,
      pageCount: document.page_count,
      chunkCount: document.chunk_count,
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
