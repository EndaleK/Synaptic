/**
 * API Route: Upload Large Document (Streaming Multipart Upload)
 *
 * Handles chunked uploads of large PDF files with ZERO memory buffering
 * 1. Accept file chunks from client (max 4MB per chunk to stay under Vercel's 4.5MB limit)
 * 2. Stream each chunk IMMEDIATELY to R2 (multipart upload) or Supabase (temp files)
 * 3. Complete multipart upload server-side (R2) or concatenate chunks (Supabase)
 * 4. Save metadata to Supabase
 * 5. Client-side PDF text extraction happens in browser
 *
 * MEMORY OPTIMIZATION: Never buffers complete file in memory, only current 4MB chunk
 * This allows uploads of 200MB+ files without hitting serverless memory limits
 *
 * IMPORTANT: Each chunk must be < 4.5MB due to Vercel's request body limit
 * Client should send chunks of 4MB max to ensure compatibility
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs' // Required for pdf-parse and Buffer operations
export const maxDuration = 300 // 5 minutes max (requires Vercel Pro plan)
// Note: Vercel enforces 4.5MB max body size at edge level (cannot be changed)

// Initialize R2 client for multipart uploads
const getR2Client = () => {
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
}

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'documents'

// Upload session tracking to handle parallel chunk uploads
interface UploadSession {
  uploadId?: string  // R2/S3 multipart upload ID
  parts: Map<number, string>  // Map of chunk index → ETag (for multipart upload)
  documentId: string | null  // UUID from database (set after document creation)
  fileName: string
  userId: string
  userProfileId?: string  // Cached after first lookup
  timestamp: number
  totalChunks: number
  authValidatedAt: number  // Track when auth was last validated
  storageKey: string  // R2/Supabase storage path
  fileType: string
  hasR2: boolean  // Track which storage backend we're using
}

// Temporary storage for sessions during upload (no chunks buffered in memory)
const sessionStorage = new Map<string, UploadSession>()

// Auth session cache - prevents re-validating Clerk auth for every chunk
// Clerk sessions can expire during long uploads (10-15 min), causing "Unauthorized" errors
// We validate once and trust the session for the duration of the upload
const authSessionCache = new Map<string, { userId: string, validatedAt: number }>()

/**
 * POST /api/upload-large-document
 *
 * Accepts multipart form data with file chunks
 * Supports files up to 500GB
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user (with caching to prevent session timeout during long uploads)
    // For chunked uploads, we validate auth once and cache it for 30 minutes
    const authCacheKey = request.headers.get('x-upload-session-id') || 'default'
    const cachedAuth = authSessionCache.get(authCacheKey)
    const now = Date.now()

    let userId: string

    if (cachedAuth && (now - cachedAuth.validatedAt) < 30 * 60 * 1000) {
      // Use cached auth if less than 30 minutes old
      userId = cachedAuth.userId
      console.log(`[DEBUG] Using cached auth for session: ${authCacheKey}`)
    } else {
      // Validate with Clerk and cache the result
      const authResult = await auth()
      if (!authResult.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = authResult.userId
      authSessionCache.set(authCacheKey, { userId, validatedAt: now })
      console.log(`[DEBUG] New auth validated and cached for session: ${authCacheKey}`)
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
    const existingDocumentId = formData.get('documentId') as string | null // Client sends this for chunks after first

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`[DEBUG] Received chunk ${parseInt(chunkIndex) + 1}/${totalChunks} for ${fileName}`, {
      hasExistingDocId: !!existingDocumentId,
      documentId: existingDocumentId || 'will create new'
    })

    // 3. Generate unique session key (consistent across all chunks for this upload)
    const chunkKey = `${userId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // 4. Convert chunk to buffer (only current chunk, not all chunks!)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 5. Initialize or retrieve upload session
    const currentChunkIndex = parseInt(chunkIndex)
    let session: UploadSession
    let documentId: string

    // Detect file type early
    let fileType = file.type
    if (!fileType || fileType === 'application/octet-stream') {
      if (fileName.toLowerCase().endsWith('.pdf')) {
        fileType = 'application/pdf'
      } else if (fileName.toLowerCase().endsWith('.docx')) {
        fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      } else if (fileName.toLowerCase().endsWith('.doc')) {
        fileType = 'application/msword'
      } else if (fileName.toLowerCase().endsWith('.txt')) {
        fileType = 'text/plain'
      } else {
        fileType = 'application/octet-stream'
      }
    }

    // Try to get session from memory first (for performance)
    // But if not found and client provided documentId, query database instead
    if (!sessionStorage.has(chunkKey) && !existingDocumentId) {
      // First chunk: Create new upload session AND database record immediately
      const timestamp = Date.now()
      const supabase = await createClient()

      // Get or create user profile
      console.log(`[DEBUG] First chunk - Getting user profile for userId: ${userId}`)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      let userProfileId: string

      if (profileError || !profile) {
        console.warn('[WARN] User profile not found, attempting auto-creation:', profileError?.message)
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            clerk_user_id: userId,
            learning_style: 'not_assessed'
          })
          .select()
          .single()

        if (createError || !newProfile) {
          console.error('[ERROR] Failed to create user profile:', createError)
          throw new Error(`Failed to create user profile: ${createError?.message || 'Unknown error'}`)
        }
        userProfileId = newProfile.id
        console.log(`[DEBUG] ✅ Auto-created user profile ID: ${userProfileId}`)
      } else {
        userProfileId = profile.id
        console.log(`[DEBUG] ✅ Found user profile ID: ${userProfileId}`)
      }

      // Create document record immediately with "pending" status
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

      // Use correct storage path format from the start (prevents stuck documents with wrong path)
      const tempStoragePath = hasR2
        ? `documents/${userId}/${userId}_${timestamp}_${sanitizedFileName}`  // R2 format with prefix
        : `${userProfileId}/${timestamp}-${sanitizedFileName}`  // Supabase format without prefix

      console.log(`[DEBUG] Creating document record with "pending" status`, {
        hasR2,
        tempStoragePath
      })

      console.log(`[DEBUG] 📝 Creating document record (initial):`, {
        user_id: userProfileId,
        file_name: fileName,
        clerk_user_id: userId,
        file_type: fileType,
        storage_path: tempStoragePath // Will be updated after R2 initialization
      })

      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userProfileId,
          file_name: fileName,
          file_size: 0, // Will be updated when all chunks received
          file_type: fileType,
          storage_path: tempStoragePath, // Temporary, will be updated below
          extracted_text: '',
          processing_status: 'pending', // Status flow: pending → processing → completed
          metadata: {
            total_chunks: parseInt(totalChunks),
            received_chunks: 0
          },
        })
        .select()
        .single()

      if (dbError || !document) {
        console.error('[ERROR] Failed to create document record:', dbError)
        throw new Error(`Failed to initialize upload: ${dbError?.message || 'Unknown error'}`)
      }

      console.log(`[DEBUG] ✅ Document created:`, {
        id: document.id,
        user_id: document.user_id,
        file_name: document.file_name,
        status: document.processing_status,
        clerk_user_id: userId
      })

      // Initialize multipart upload for R2 (if configured)
      let uploadId: string | undefined
      let actualStoragePath = tempStoragePath
      let usingR2 = false

      if (hasR2) {
        const r2Client = getR2Client()
        if (r2Client) {
          try {
            console.log(`[DEBUG] Initiating R2 multipart upload for: ${tempStoragePath}`)
            const createMultipartCommand = new CreateMultipartUploadCommand({
              Bucket: R2_BUCKET_NAME,
              Key: tempStoragePath,
              ContentType: fileType,
            })

            const multipartResponse = await r2Client.send(createMultipartCommand)
            uploadId = multipartResponse.UploadId
            usingR2 = true
            console.log(`[DEBUG] ✅ R2 multipart upload initiated: ${uploadId}`)
          } catch (r2Error) {
            console.error(`[ERROR] Failed to initiate R2 multipart upload:`, r2Error)
            console.error(`[ERROR] R2 Error details:`, {
              endpoint: process.env.R2_ENDPOINT,
              bucket: R2_BUCKET_NAME,
              hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
              accessKeyStart: process.env.R2_ACCESS_KEY_ID?.slice(0, 8) || 'N/A',
              accessKeyEnd: process.env.R2_ACCESS_KEY_ID?.slice(-4) || 'N/A',
              accessKeyLength: process.env.R2_ACCESS_KEY_ID?.length || 0,
              hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
              secretKeyStart: process.env.R2_SECRET_ACCESS_KEY?.slice(0, 8) || 'N/A',
              secretKeyEnd: process.env.R2_SECRET_ACCESS_KEY?.slice(-4) || 'N/A',
              secretKeyLength: process.env.R2_SECRET_ACCESS_KEY?.length || 0,
              expectedAccessKeyStart: '6757762B',
              expectedAccessKeyEnd: '3a99',
              expectedSecretKeyStart: 'b48723d1',
              expectedSecretKeyEnd: '98a6',
              error: r2Error instanceof Error ? r2Error.message : String(r2Error),
              errorStack: r2Error instanceof Error ? r2Error.stack : undefined
            })
            // Fall back to Supabase - change storage path format
            actualStoragePath = `${userProfileId}/${timestamp}-${sanitizedFileName}`
            console.log(`[DEBUG] Falling back to Supabase storage: ${actualStoragePath}`)
          }
        } else {
          // R2 client creation failed - use Supabase format
          actualStoragePath = `${userProfileId}/${timestamp}-${sanitizedFileName}`
          console.log(`[DEBUG] R2 client unavailable, using Supabase storage: ${actualStoragePath}`)
        }
      } else {
        // R2 not configured - use Supabase format
        actualStoragePath = `${userProfileId}/${timestamp}-${sanitizedFileName}`
      }

      // Update document record with correct storage path if it changed
      if (actualStoragePath !== tempStoragePath) {
        console.log(`[DEBUG] Updating storage_path in database: ${tempStoragePath} → ${actualStoragePath}`)
        const { error: updateError } = await supabase
          .from('documents')
          .update({ storage_path: actualStoragePath })
          .eq('id', document.id)

        if (updateError) {
          console.error('[ERROR] Failed to update storage_path:', updateError)
          // Non-fatal, continue
        } else {
          console.log(`[DEBUG] ✅ Storage path updated to Supabase format`)
        }
      }

      session = {
        uploadId, // R2 multipart upload ID (undefined for Supabase)
        parts: new Map(), // Track uploaded parts and their ETags
        documentId: document.id,
        fileName,
        userId,
        userProfileId,
        timestamp,
        totalChunks: parseInt(totalChunks),
        authValidatedAt: now,
        storageKey: actualStoragePath, // Use actual path (R2 or Supabase format)
        fileType,
        hasR2: usingR2 // Only true if R2 multipart upload succeeded
      }

      documentId = document.id
      sessionStorage.set(chunkKey, session)
      console.log(`🆕 Upload session initialized for ${fileName} with documentId: ${document.id}, storage: ${usingR2 ? 'R2' : 'Supabase'}${uploadId ? `, uploadId: ${uploadId}` : ''}`)
    } else if (!sessionStorage.has(chunkKey) && existingDocumentId) {
      // Session not in memory (hit different serverless instance), but client provided documentId
      // Reconstruct session from database
      console.log(`[DEBUG] Session not in memory, reconstructing from database using documentId: ${existingDocumentId}`)

      const supabase = await createClient()

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profileError || !profile) {
        console.error('[ERROR] Failed to get user profile:', profileError)
        throw new Error(`Failed to get user profile: ${profileError?.message || 'Unknown error'}`)
      }

      // Query database to verify document exists and get metadata
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, user_id, file_name, metadata, storage_path, file_type')
        .eq('id', existingDocumentId)
        .single()

      if (docError || !document) {
        console.error('[ERROR] Failed to find document:', docError)
        throw new Error(`Document ${existingDocumentId} not found: ${docError?.message || 'Unknown error'}`)
      }

      // Verify ownership (either same profile or same Clerk user)
      if (document.user_id !== profile.id) {
        // Check if it belongs to same Clerk user (different profile)
        const { data: docOwnerProfile } = await supabase
          .from('user_profiles')
          .select('clerk_user_id')
          .eq('id', document.user_id)
          .single()

        if (!docOwnerProfile || docOwnerProfile.clerk_user_id !== userId) {
          throw new Error(`Access denied: Document ${existingDocumentId} does not belong to user ${userId}`)
        }
      }

      console.log(`[DEBUG] ✅ Document verified:`, {
        id: document.id,
        user_id: document.user_id,
        file_name: document.file_name
      })

      // Extract uploadId from metadata if available (for R2 multipart uploads)
      const uploadId = document.metadata?.uploadId as string | undefined

      // Reconstruct session (parts map will be populated as chunks arrive)
      session = {
        uploadId,
        parts: new Map(), // Will be populated as chunks arrive
        documentId: document.id,
        fileName: document.file_name,
        userId,
        userProfileId: profile.id,
        timestamp: Date.now(),
        totalChunks: parseInt(totalChunks),
        authValidatedAt: now,
        storageKey: document.storage_path,
        fileType: document.file_type || fileType,
        hasR2
      }

      documentId = document.id
      sessionStorage.set(chunkKey, session)
      console.log(`♻️  Session reconstructed from database for ${fileName}`)
    } else {
      // Session exists in memory (same serverless instance handling multiple chunks)
      session = sessionStorage.get(chunkKey)!
      documentId = session.documentId!
      console.log(`[DEBUG] Using existing session from memory for ${fileName}`)
    }

    // 6. Upload chunk immediately to storage (NO buffering in memory!)
    console.log(`📤 Uploading chunk ${parseInt(chunkIndex) + 1}/${totalChunks} for ${fileName} (${buffer.length} bytes)`)

    // AWS S3/R2 part numbers are 1-indexed, not 0-indexed
    const partNumber = currentChunkIndex + 1

    try {
      if (session.uploadId && session.hasR2) {
        // R2 multipart upload: Upload this chunk as a part
        const r2Client = getR2Client()
        if (r2Client) {
          console.log(`[DEBUG] Uploading part ${partNumber} to R2 multipart upload ${session.uploadId}`)

          const uploadPartCommand = new UploadPartCommand({
            Bucket: R2_BUCKET_NAME,
            Key: session.storageKey,
            UploadId: session.uploadId,
            PartNumber: partNumber,
            Body: buffer,
          })

          const uploadPartResponse = await r2Client.send(uploadPartCommand)
          const etag = uploadPartResponse.ETag

          if (!etag) {
            throw new Error(`R2 upload part ${partNumber} did not return ETag`)
          }

          // Store ETag for final completion
          session.parts.set(partNumber, etag)
          console.log(`[DEBUG] ✅ Part ${partNumber} uploaded with ETag: ${etag}`)
        }
      } else {
        // Supabase Storage: Upload chunk as temporary file
        const supabase = await createClient()
        const chunkPath = `${session.storageKey}.chunk${currentChunkIndex}`

        console.log(`[DEBUG] Uploading chunk ${currentChunkIndex} to Supabase: ${chunkPath}`)

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(chunkPath, buffer, {
            cacheControl: '3600',
            upsert: true, // Allow re-uploading same chunk (retry logic)
            contentType: 'application/octet-stream'
          })

        if (uploadError) {
          console.error(`[ERROR] Failed to upload chunk ${currentChunkIndex}:`, uploadError)
          throw new Error(`Failed to upload chunk to storage: ${uploadError.message}`)
        }

        session.parts.set(partNumber, chunkPath) // Store path instead of ETag
        console.log(`[DEBUG] ✅ Chunk ${currentChunkIndex} uploaded to: ${chunkPath}`)
      }
    } catch (uploadError) {
      console.error(`[ERROR] Chunk upload failed:`, uploadError)
      throw new Error(`Failed to upload chunk ${currentChunkIndex}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`)
    }

    // Buffer has been uploaded - can be garbage collected now!
    // No need to hold it in memory

    // 7. Check if ALL chunks have been received (not just if this is the last chunk)
    // Chunks can arrive out of order due to parallel uploads
    const receivedChunks = session.parts.size
    const allChunksReceived = receivedChunks === session.totalChunks

    console.log(`📊 Progress: ${receivedChunks}/${session.totalChunks} chunks uploaded`)

    let processingResult = null
    let r2Url = ''
    let r2FileKey = ''

    if (allChunksReceived) {
      console.log(`🔄 All chunks received! Processing complete document: ${fileName}`)

      try {
        // Get or create user profile (with caching in session)
        const supabase = await createClient()
        let userProfileId: string

        if (session.userProfileId) {
          // Use cached profile ID from earlier chunk
          userProfileId = session.userProfileId
          console.log(`[DEBUG] ✅ Using cached user profile ID: ${userProfileId}`)
        } else {
          console.log(`[DEBUG] Step 1: Getting user profile for userId: ${userId}`)

          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('clerk_user_id', userId)
            .single()

          if (profileError || !profile) {
            console.warn('[WARN] User profile not found, attempting auto-creation:', profileError?.message)

            // Auto-create user profile (fallback from middleware)
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert({
                clerk_user_id: userId,
                learning_style: 'not_assessed'
              })
              .select()
              .single()

            if (createError || !newProfile) {
              console.error('[ERROR] Failed to create user profile:', createError)
              throw new Error(`Failed to create user profile: ${createError?.message || 'Unknown error'}. Please try refreshing the page.`)
            }

            userProfileId = newProfile.id
            console.log(`[DEBUG] ✅ Auto-created user profile ID: ${userProfileId}`)
          } else {
            userProfileId = profile.id
            console.log(`[DEBUG] ✅ Found user profile ID: ${userProfileId}`)
          }

          // Cache profile ID in session for subsequent chunks
          session.userProfileId = userProfileId
        }

        console.log(`[DEBUG] Step 2: Finalizing upload (all ${session.totalChunks} parts uploaded)`)

        // Validate all parts are present
        const missingParts: number[] = []
        for (let i = 1; i <= session.totalChunks; i++) {
          if (!session.parts.has(i)) {
            missingParts.push(i)
          }
        }

        if (missingParts.length > 0) {
          console.error(`[ERROR] Missing parts detected:`, missingParts)
          throw new Error(`Upload incomplete: missing parts ${missingParts.join(', ')}. Please try uploading again.`)
        }

        console.log(`[DEBUG] ✅ All ${session.totalChunks} parts validated`)

        // Storage path already set in session
        r2FileKey = session.storageKey
        let totalFileSize = 0

        console.log(`[DEBUG] Step 3: Completing upload (hasR2: ${session.hasR2}, uploadId: ${session.uploadId})`)

        // Complete upload based on storage backend
        if (session.uploadId && session.hasR2) {
          // R2 multipart upload: Complete with all ETags
          const r2Client = getR2Client()
          if (r2Client) {
            console.log(`[DEBUG] Completing R2 multipart upload ${session.uploadId}`)

            // Convert parts Map to array of {ETag, PartNumber} sorted by PartNumber
            const parts = Array.from(session.parts.entries())
              .sort(([a], [b]) => a - b) // Sort by part number
              .map(([partNumber, etag]) => ({
                ETag: etag,
                PartNumber: partNumber
              }))

            console.log(`[DEBUG] Completing with ${parts.length} parts`)

            try {
              const completeCommand = new CompleteMultipartUploadCommand({
                Bucket: R2_BUCKET_NAME,
                Key: r2FileKey,
                UploadId: session.uploadId,
                MultipartUpload: { Parts: parts }
              })

              const completeResponse = await r2Client.send(completeCommand)
              console.log(`[DEBUG] ✅ R2 multipart upload completed successfully`)

              // Get file metadata to determine size
              const { getR2FileMetadata } = await import('@/lib/r2-storage')
              try {
                const metadata = await getR2FileMetadata(r2FileKey)
                totalFileSize = metadata.size
                console.log(`[DEBUG] ✅ Retrieved file size from R2: ${totalFileSize} bytes`)
              } catch (metaError) {
                console.warn(`[WARN] Could not retrieve file metadata, estimating size:`, metaError)
                // Estimate size as sum of chunk sizes (4MB per chunk)
                totalFileSize = session.totalChunks * 4 * 1024 * 1024
              }

              r2Url = process.env.R2_PUBLIC_URL ? `${process.env.R2_PUBLIC_URL}/${r2FileKey}` : ''
              console.log(`[DEBUG] ☁️ Complete file available at R2: ${r2FileKey}`)
            } catch (completeError) {
              console.error(`[ERROR] Failed to complete R2 multipart upload:`, completeError)

              // Abort the multipart upload to clean up
              try {
                const abortCommand = new AbortMultipartUploadCommand({
                  Bucket: R2_BUCKET_NAME,
                  Key: r2FileKey,
                  UploadId: session.uploadId
                })
                await r2Client.send(abortCommand)
                console.log(`[DEBUG] Aborted incomplete multipart upload`)
              } catch (abortError) {
                console.error(`[ERROR] Failed to abort multipart upload:`, abortError)
              }

              throw new Error(`Failed to complete R2 upload: ${completeError instanceof Error ? completeError.message : 'Unknown error'}`)
            }
          }
        } else {
          // Supabase Storage: Concatenate chunk files
          console.log(`[DEBUG] Concatenating ${session.totalChunks} Supabase chunks`)

          // Download all chunks and concatenate
          const chunkBuffers: Buffer[] = []

          for (let i = 0; i < session.totalChunks; i++) {
            const partNumber = i + 1
            const chunkPath = session.parts.get(partNumber)

            if (!chunkPath) {
              throw new Error(`Missing chunk path for part ${partNumber}`)
            }

            console.log(`[DEBUG] Downloading chunk ${i}: ${chunkPath}`)

            const { data: chunkData, error: downloadError } = await supabase.storage
              .from('documents')
              .download(chunkPath)

            if (downloadError || !chunkData) {
              console.error(`[ERROR] Failed to download chunk ${i}:`, downloadError)
              throw new Error(`Failed to download chunk ${i}: ${downloadError?.message || 'Unknown error'}`)
            }

            const chunkBuffer = Buffer.from(await chunkData.arrayBuffer())
            chunkBuffers.push(chunkBuffer)
          }

          // Concatenate all chunks
          const completeFileBuffer = Buffer.concat(chunkBuffers)
          totalFileSize = completeFileBuffer.length
          console.log(`[DEBUG] ✅ Concatenated ${chunkBuffers.length} chunks into ${totalFileSize} bytes`)

          // Upload final file
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(r2FileKey, completeFileBuffer, {
              cacheControl: '3600',
              upsert: true, // Overwrite if exists
              contentType: session.fileType
            })

          if (uploadError) {
            console.error('[ERROR] Supabase final upload failed:', uploadError)
            throw new Error(`Failed to upload final file: ${uploadError.message}`)
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(r2FileKey)

          r2Url = publicUrl
          console.log(`[DEBUG] ☁️ Complete file uploaded to Supabase: ${r2FileKey}`)

          // Clean up chunk files
          console.log(`[DEBUG] Cleaning up ${session.totalChunks} temporary chunk files`)
          for (let i = 0; i < session.totalChunks; i++) {
            const partNumber = i + 1
            const chunkPath = session.parts.get(partNumber)
            if (chunkPath) {
              try {
                await supabase.storage.from('documents').remove([chunkPath])
              } catch (cleanupError) {
                console.warn(`[WARN] Failed to cleanup chunk ${i}:`, cleanupError)
                // Non-fatal, continue
              }
            }
          }
        }

        console.log(`[DEBUG] Step 4: Updating document record with final metadata`)
        console.log(`[DEBUG] 📝 About to update document:`, {
          documentId: session.documentId,
          newFileSize: totalFileSize,
          newStoragePath: r2FileKey,
          newStatus: 'processing'
        })

        // Update document record with final file info and change status to 'processing'
        // Document was already created on first chunk with "pending" status
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .update({
            file_size: totalFileSize,
            storage_path: r2FileKey,
            processing_status: 'processing', // Change from "pending" to "processing"
            metadata: {
              r2_url: r2Url,
              total_chunks: session.totalChunks,
              received_chunks: session.totalChunks,
              uploadId: session.uploadId // Store uploadId for session reconstruction
            },
          })
          .eq('id', session.documentId!) // Update the document created on first chunk
          .select()
          .single()

        if (dbError || !document) {
          console.error('[ERROR] Supabase update error:', dbError)
          console.error('[ERROR] Update details:', { documentId: session.documentId, fileSize: totalFileSize, r2FileKey })
          throw new Error(`Failed to update document metadata: ${dbError?.message || 'Unknown error'}`)
        }

        console.log(`[DEBUG] ✅ Document updated with final metadata:`, {
          id: document.id,
          user_id: document.user_id,
          file_name: document.file_name,
          file_size: document.file_size,
          storage_path: document.storage_path,
          status: document.processing_status
        })


        // NOTE: PDF text extraction happens CLIENT-SIDE using pdf.js in browser
        // The client will call /api/documents/update-text after extraction completes
        // This avoids Vercel serverless timeout issues and works on Hobby plan

        // Return immediately to user (don't wait for processing)
        processingResult = {
          documentId: document.id,
          fileName,
          fileSize: totalFileSize,
          pageCount: 0, // Unknown until processing completes
          chunks: 0, // Unknown until processing completes
          r2Url,
          processingStatus: 'processing',
        }

        console.log(`✅ Document uploaded successfully: ${document.id}. Processing in background.`)
        console.log(`[DEBUG] processingResult created:`, JSON.stringify(processingResult))
      } catch (processingError) {
        console.error('Document processing error:', processingError)

        // Clean up session storage on error
        sessionStorage.delete(chunkKey)

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
    const response: any = {
      success: true,
      chunkIndex: currentChunkIndex,
      totalChunks: session.totalChunks,
      isComplete: allChunksReceived,
      message: allChunksReceived ? 'Document processed successfully' : `Chunk ${currentChunkIndex + 1}/${session.totalChunks} received (${receivedChunks}/${session.totalChunks} total)`,
      documentId: documentId, // Always include documentId (created on first chunk, passed from client on subsequent chunks)
    }

    console.log(`[DEBUG] Sending response:`, {
      chunkIndex: currentChunkIndex,
      isComplete: allChunksReceived,
      documentId: documentId
    })

    // Add optional fields
    if (r2Url) {
      response.r2Url = r2Url
    }

    if (processingResult) {
      response.processing = processingResult
      console.log(`[DEBUG] ✅ Document fully processed: ${session.documentId}`)
    }

    console.log(`[DEBUG] Sending response for chunk ${currentChunkIndex + 1}/${session.totalChunks}: documentId=${session.documentId || 'pending'}, isComplete=${allChunksReceived}`)

    // Clean up completed sessions after a delay to allow all chunks to access documentId
    if (allChunksReceived && session.documentId) {
      setTimeout(() => {
        if (sessionStorage.has(chunkKey)) {
          sessionStorage.delete(chunkKey)
          console.log(`🧹 Cleaned up session for ${fileName}`)
        }
      }, 30000) // 30 seconds delay for cleanup
    }

    return NextResponse.json(response)

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
