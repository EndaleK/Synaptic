/**
 * API Route: POST /api/upload-large-document
 *
 * SIMPLIFIED: Supabase-only chunked upload (R2 logic removed)
 *
 * Handles large file uploads via chunked approach:
 * 1. Client splits file into 4MB chunks
 * 2. Each chunk uploaded separately to this endpoint
 * 3. Chunks stored temporarily in Supabase
 * 4. On final chunk, all chunks assembled and saved as complete file
 *
 * This allows files up to 100MB+ without hitting Vercel's 4.5MB request limit
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

// Track upload sessions in memory (resets on server restart)
const uploadSessions = new Map<string, {
  documentId: string
  fileName: string
  fileType: string
  totalChunks: number
  receivedChunks: Set<number>
  chunks: Map<number, string> // chunk index -> storage path
  createdAt: number
}>()

// Cleanup old sessions (older than 1 hour)
function cleanupOldSessions() {
  const now = Date.now()
  const ONE_HOUR = 60 * 60 * 1000

  for (const [fileId, session] of uploadSessions.entries()) {
    if (now - session.createdAt > ONE_HOUR) {
      uploadSessions.delete(fileId)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    const userProfileId = profile.id

    // 3. Parse request data
    const formData = await request.formData()
    const chunk = formData.get('file') as Blob // Client sends 'file' not 'chunk'
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const documentId = formData.get('documentId') as string // Use as fileId

    // Derive file type from filename
    const fileType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'

    // Use documentId as fileId, or generate one for first chunk
    const fileId = documentId || `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`📦 Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`)

    // 4. Get or create upload session
    let session = uploadSessions.get(fileId)

    if (!session) {
      // Create document record on first chunk
      const timestamp = Date.now()
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${userProfileId}/${timestamp}-${sanitizedFileName}`

      console.log(`🆕 Creating new document record: ${storagePath}`)

      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userProfileId,
          file_name: fileName,
          file_size: 0, // Will update when complete
          file_type: fileType || 'application/pdf',
          storage_path: storagePath,
          extracted_text: '',
          processing_status: 'pending',
          metadata: {
            total_chunks: totalChunks,
            received_chunks: 0
          }
        })
        .select()
        .single()

      if (dbError || !document) {
        console.error('Failed to create document:', dbError)
        return NextResponse.json(
          { error: 'Failed to create document record' },
          { status: 500 }
        )
      }

      session = {
        documentId: document.id,
        fileName,
        fileType: fileType || 'application/pdf',
        totalChunks,
        receivedChunks: new Set(),
        chunks: new Map(),
        createdAt: Date.now()
      }

      uploadSessions.set(fileId, session)
      console.log(`✅ Document created with ID: ${document.id}`)
    }

    // 5. Upload chunk to Supabase storage
    const chunkPath = `temp/${fileId}/chunk-${chunkIndex}`
    const buffer = Buffer.from(await chunk.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(chunkPath, buffer, {
        contentType: 'application/octet-stream',
        upsert: true
      })

    if (uploadError) {
      console.error(`Failed to upload chunk ${chunkIndex}:`, uploadError)
      return NextResponse.json(
        { error: 'Failed to upload chunk', details: uploadError.message },
        { status: 500 }
      )
    }

    session.receivedChunks.add(chunkIndex)
    session.chunks.set(chunkIndex, chunkPath)

    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded`)

    // 6. Update metadata
    await supabase
      .from('documents')
      .update({
        metadata: {
          total_chunks: totalChunks,
          received_chunks: session.receivedChunks.size
        }
      })
      .eq('id', session.documentId)

    // 7. Check if all chunks received
    if (session.receivedChunks.size === totalChunks) {
      console.log(`🎉 All ${totalChunks} chunks received, assembling file...`)

      try {
        // Download all chunks in order
        const chunkBuffers: Buffer[] = []
        let totalSize = 0

        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = session.chunks.get(i)
          if (!chunkPath) {
            throw new Error(`Missing chunk ${i}`)
          }

          const { data: chunkData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(chunkPath)

          if (downloadError || !chunkData) {
            throw new Error(`Failed to download chunk ${i}: ${downloadError?.message}`)
          }

          const buffer = Buffer.from(await chunkData.arrayBuffer())
          chunkBuffers.push(buffer)
          totalSize += buffer.length
        }

        // Combine all chunks
        const completeFile = Buffer.concat(chunkBuffers)
        console.log(`✅ Assembled ${totalSize} bytes from ${totalChunks} chunks`)

        // Get storage path from document
        const { data: document } = await supabase
          .from('documents')
          .select('storage_path')
          .eq('id', session.documentId)
          .single()

        if (!document) {
          throw new Error('Document not found')
        }

        // Upload complete file to Supabase
        const { error: finalUploadError } = await supabase.storage
          .from('documents')
          .upload(document.storage_path, completeFile, {
            contentType: session.fileType,
            upsert: true
          })

        if (finalUploadError) {
          throw new Error(`Failed to upload complete file: ${finalUploadError.message}`)
        }

        console.log(`✅ Complete file uploaded to: ${document.storage_path}`)

        // Clean up temporary chunks
        for (const chunkPath of session.chunks.values()) {
          await supabase.storage
            .from('documents')
            .remove([chunkPath])
            .catch(err => console.warn('Failed to delete temp chunk:', err))
        }

        // Update document status
        await supabase
          .from('documents')
          .update({
            file_size: totalSize,
            processing_status: 'processing', // Will be updated by text extraction
            metadata: {
              total_chunks: totalChunks,
              received_chunks: totalChunks,
              upload_completed_at: new Date().toISOString()
            }
          })
          .eq('id', session.documentId)

        // Clean up session
        uploadSessions.delete(fileId)

        console.log(`✅ Upload complete! Document ID: ${session.documentId}`)

        return NextResponse.json({
          success: true,
          message: 'Upload complete',
          documentId: session.documentId,
          isComplete: true, // Client expects 'isComplete' not 'isLastChunk'
          isLastChunk: true // Keep for backwards compatibility
        })

      } catch (assemblyError) {
        console.error('Failed to assemble file:', assemblyError)

        // Update document status to failed
        await supabase
          .from('documents')
          .update({ processing_status: 'failed' })
          .eq('id', session.documentId)
          .catch(err => console.error('Failed to update status:', err))

        return NextResponse.json(
          {
            error: 'Failed to assemble file',
            details: assemblyError instanceof Error ? assemblyError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    // Not the last chunk yet
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
      documentId: session.documentId, // Client needs this for subsequent chunks
      receivedChunks: session.receivedChunks.size,
      totalChunks,
      isComplete: false,
      isLastChunk: false
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    // Cleanup old sessions periodically
    if (Math.random() < 0.1) { // 10% chance
      cleanupOldSessions()
    }
  }
}
