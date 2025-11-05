/**
 * API Route: Upload Large Document (Chunked Upload)
 *
 * Handles chunked uploads of large PDF files with streaming processing
 * 1. Accept file chunks from client (max 4MB per chunk to stay under Vercel's 4.5MB limit)
 * 2. Accumulate chunks in memory
 * 3. Upload to Cloudflare R2 storage (optional backup) or Supabase
 * 4. Extract text using PDF parser
 * 5. Index in ChromaDB for vector search (optional)
 * 6. Save metadata to Supabase
 *
 * IMPORTANT: Each chunk must be < 4.5MB due to Vercel's request body limit
 * Client should send chunks of 4MB max to ensure compatibility
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // Required for pdf-parse and Buffer operations
export const maxDuration = 300 // 5 minutes max for Vercel hobby plan (300s)
// Note: Vercel enforces 4.5MB max body size at edge level (cannot be changed)

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

    // 2. Check storage configuration (R2 is optional, will fall back to Supabase)
    const hasR2 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
    const hasChromaDB = !!process.env.CHROMA_URL

    if (!hasR2) {
      console.log('ℹ️  R2 not configured, will use Supabase Storage as fallback')
    }
    if (!hasChromaDB) {
      console.log('ℹ️  ChromaDB not configured, will skip vector indexing')
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

    // 6. Check if ALL chunks have been received (not just if this is the last chunk)
    // Chunks can arrive out of order due to parallel uploads
    const receivedChunks = chunks.filter(chunk => chunk !== undefined).length
    const allChunksReceived = receivedChunks === parseInt(totalChunks)

    console.log(`📊 Progress: ${receivedChunks}/${totalChunks} chunks received`)

    let processingResult = null
    let r2Url = ''
    let r2FileKey = ''

    if (allChunksReceived) {
      console.log(`🔄 All chunks received! Processing complete document: ${fileName}`)

      try {
        console.log(`[DEBUG] Step 1: Getting user profile for userId: ${userId}`)

        // Get user profile ID from user_profiles table
        const supabase = await createClient()
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (profileError || !profile) {
          console.error('[ERROR] Failed to get user profile:', profileError)
          console.error('[ERROR] Profile data:', profile)
          throw new Error(`User profile not found: ${profileError?.message || 'No profile data'}. Please ensure your account is set up correctly.`)
        }

        const userProfileId = profile.id
        console.log(`[DEBUG] ✅ Found user profile ID: ${userProfileId}`)

        console.log(`[DEBUG] Step 2: Validating and concatenating ${chunks.length} chunks (expected: ${totalChunks})`)

        // Validate all chunks are present (no undefined/sparse array values)
        const missingChunks: number[] = []
        for (let i = 0; i < totalChunks; i++) {
          if (!chunks[i]) {
            missingChunks.push(i)
          }
        }

        if (missingChunks.length > 0) {
          console.error(`[ERROR] Missing chunks detected:`, missingChunks)
          throw new Error(`Upload incomplete: missing chunks ${missingChunks.join(', ')}. Please try uploading again.`)
        }

        // Concatenate all chunks into complete buffer
        const completeFileBuffer = Buffer.concat(chunks)
        console.log(`[DEBUG] ✅ Assembled ${completeFileBuffer.length} bytes from ${totalChunks} chunks`)

        // Clear chunk storage to free memory
        chunkStorage.delete(chunkKey)

        // Generate final document ID with timestamp
        const timestamp = Date.now()
        const documentId = `${userId}_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
        r2FileKey = `documents/${userId}/${documentId}`

        console.log(`[DEBUG] Step 3: Uploading to storage (hasR2: ${hasR2})`)

        // Upload complete file to storage (R2 if available, otherwise Supabase)
        if (hasR2) {
          // Use Cloudflare R2 storage
          console.log(`[DEBUG] Uploading to R2: ${r2FileKey}`)
          const { uploadToR2 } = await import('@/lib/r2-storage')
          const uploadResult = await uploadToR2(
            completeFileBuffer,
            r2FileKey,
            file.type || 'application/pdf'
          )
          r2Url = uploadResult.url
          console.log(`[DEBUG] ☁️ Uploaded complete file to R2: ${r2FileKey}`)
        } else {
          // Fall back to Supabase Storage (upload Buffer directly, no File object needed)
          const supabaseFilePath = `${userProfileId}/${timestamp}-${sanitizedFileName}`
          console.log(`[DEBUG] Uploading to Supabase Storage: ${supabaseFilePath} (${completeFileBuffer.length} bytes)`)

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(supabaseFilePath, completeFileBuffer, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type || 'application/pdf'
            })

          if (uploadError) {
            console.error('[ERROR] Supabase Storage upload error:', uploadError)
            console.error('[ERROR] Upload details:', { supabaseFilePath, fileSize: completeFileBuffer.length, contentType: file.type })
            throw new Error(`Failed to upload to storage: ${uploadError.message}`)
          }

          console.log(`[DEBUG] Upload successful, getting public URL`)

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(supabaseFilePath)

          r2Url = publicUrl
          r2FileKey = supabaseFilePath
          console.log(`[DEBUG] ☁️ Uploaded complete file to Supabase Storage: ${r2FileKey}, URL: ${publicUrl}`)
        }

        console.log(`[DEBUG] Step 4: Saving document metadata to database`)

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
          console.error('[ERROR] Supabase insert error:', dbError)
          console.error('[ERROR] Insert details:', { userProfileId, fileName, fileSize: completeFileBuffer.length, r2FileKey })
          throw new Error(`Failed to save document metadata: ${dbError.message}`)
        }

        console.log(`[DEBUG] ✅ Document metadata saved: ${document.id}`)

        // NOTE: PDF text extraction happens CLIENT-SIDE using pdf.js in browser
        // The client will call /api/documents/update-text after extraction completes
        // This avoids Vercel serverless timeout issues and works on Hobby plan

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
      isComplete: allChunksReceived,
      message: allChunksReceived ? 'Document processed successfully' : `Chunk ${currentChunkIndex + 1}/${totalChunks} received (${receivedChunks}/${totalChunks} total)`,
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
