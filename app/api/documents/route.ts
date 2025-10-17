import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { parseDocument } from '@/lib/document-parser'
import {
  uploadDocumentToStorage,
  saveDocumentToDatabase,
  getUserDocuments,
  updateDocumentStatus
} from '@/lib/supabase/documents-server'
import type { DocumentInsert } from '@/lib/supabase/types'

/**
 * GET /api/documents
 * Fetch all documents for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch documents from database
    const { documents, error } = await getUserDocuments(userId, limit, offset)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch documents: ${error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('GET /api/documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents
 * Upload and process a new document
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`Processing document upload: ${file.name}, type: ${file.type}, size: ${file.size}`)

    // Step 1: Create document record with pending status
    const documentData: DocumentInsert = {
      user_id: userId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      processing_status: 'pending',
      storage_path: ''
    }

    const { document, error: dbError } = await saveDocumentToDatabase(documentData)

    if (dbError || !document) {
      console.error('Failed to create document record:', dbError)
      return NextResponse.json(
        { error: `Failed to save document: ${dbError}` },
        { status: 500 }
      )
    }

    const documentId = document.id

    // Step 2: Upload file to storage
    await updateDocumentStatus(documentId, 'processing')

    const { path: storagePath, error: storageError } = await uploadDocumentToStorage(file, userId)

    if (storageError) {
      await updateDocumentStatus(documentId, 'failed', storageError)
      return NextResponse.json(
        { error: `Failed to upload file: ${storageError}` },
        { status: 500 }
      )
    }

    // Step 3: Extract text content
    const parseResult = await parseDocument(file)

    if (parseResult.error) {
      await updateDocumentStatus(documentId, 'failed', parseResult.error)
      return NextResponse.json(
        { error: `Failed to parse document: ${parseResult.error}` },
        { status: 400 }
      )
    }

    const extractedText = parseResult.text

    if (!extractedText || extractedText.length === 0) {
      await updateDocumentStatus(documentId, 'failed', 'No readable text content found')
      return NextResponse.json(
        { error: 'Document contains no readable text content' },
        { status: 400 }
      )
    }

    // Step 4: Update document with storage path and extracted text
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient())
    const client = await supabase

    const { error: updateError } = await client
      .from('documents')
      .update({
        storage_path: storagePath,
        extracted_text: extractedText,
        processing_status: 'completed'
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Failed to update document:', updateError)
      await updateDocumentStatus(documentId, 'failed', updateError.message)
      return NextResponse.json(
        { error: `Failed to update document: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log(`Document ${documentId} processed successfully`)

    // Return the complete document data
    return NextResponse.json({
      document: {
        ...document,
        storage_path: storagePath,
        extracted_text: extractedText,
        processing_status: 'completed'
      },
      textLength: extractedText.length
    })
  } catch (error) {
    console.error('POST /api/documents error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
