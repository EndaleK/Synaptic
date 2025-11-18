import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { parseDocument } from '@/lib/document-parser'
import {
  uploadDocumentToStorage,
  saveDocumentToDatabase,
  getUserDocuments,
  updateDocumentStatus
} from '@/lib/supabase/documents-server'
import { detectDocumentSections } from '@/lib/document-parser/section-detector'
import type { DocumentInsert } from '@/lib/supabase/types'
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { FileUploadSchema, validateDocumentLength, validateContentSafety } from '@/lib/validation'
import { canUploadDocument, trackDocumentUpload } from '@/lib/usage-tracker'
import { processFileParallel, shouldUseParallelProcessing, estimateUploadTime } from '@/lib/upload-optimizer'
import { withMonitoring, trackApiMetric, flagSlowOperation } from '@/lib/monitoring/api-monitor'
import { trackSupabaseQuery } from '@/lib/monitoring/supabase-monitor'

// Vercel limits: 4.5MB max request body size (cannot be changed)
// For files > 5MB, use /api/upload-large-document (chunked upload)
export const runtime = 'nodejs' // Required for Buffer and file operations
export const maxDuration = 300 // 5 minutes max

/**
 * GET /api/documents
 * Fetch all documents for authenticated user
 */
async function handleGetDocuments(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null

  try {
    // Authenticate user
    const authResult = await auth()
    userId = authResult.userId

    if (!userId) {
      logger.warn('Unauthenticated documents list request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Apply rate limiting (standard tier - 60 requests/min)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.standard, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for documents list', { userId })
      return rateLimitResponse
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    logger.debug('Fetching documents', { userId, limit, offset })

    // Fetch documents from database with monitoring
    const { documents, error } = await trackSupabaseQuery(
      'SELECT',
      'documents',
      () => getUserDocuments(userId!, limit, offset)
    )

    if (error) {
      logger.error('Failed to fetch documents from database', new Error(error), { userId })
      const duration = Date.now() - startTime
      logger.api('GET', '/api/documents', 500, duration, { userId, error: 'Database error' })
      return NextResponse.json(
        { error: `Failed to fetch documents: ${error}` },
        { status: 500 }
      )
    }

    // Track metrics
    const duration = Date.now() - startTime
    trackApiMetric('documents.count', documents?.length || 0)
    logger.api('GET', '/api/documents', 200, duration, {
      userId,
      documentCount: documents?.length || 0,
      limit,
      offset
    })

    return NextResponse.json({ documents })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('GET /api/documents error', error, { userId, duration: `${duration}ms` })
    logger.api('GET', '/api/documents', 500, duration, { userId, error: 'Unknown error' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withMonitoring(handleGetDocuments, '/api/documents')

/**
 * POST /api/documents
 * Upload and process a new document
 */
async function handlePostDocument(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null
  let documentId: string | null = null

  try {
    // Authenticate user
    const authResult = await auth()
    userId = authResult.userId

    if (!userId) {
      logger.warn('Unauthenticated document upload request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Apply rate limiting (upload tier - 20 requests/hour)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.upload, userId)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for document upload', { userId })
      return rateLimitResponse
    }

    // Check usage limits (free tier: 10 documents/month)
    const usageCheck = canUploadDocument(userId, 'free') // TODO: Get actual tier from user profile
    if (!usageCheck.allowed) {
      logger.warn('Document upload blocked - usage limit reached', {
        userId,
        reason: usageCheck.reason,
        currentUsage: usageCheck.currentUsage
      })
      return NextResponse.json(
        {
          error: usageCheck.reason,
          currentUsage: usageCheck.currentUsage,
          upgradeUrl: '/pricing' // TODO: Add actual pricing page URL
        },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      logger.warn('No file provided in upload request', { userId })
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    try {
      FileUploadSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
      })
    } catch (validationError) {
      logger.warn('File validation failed', { userId, fileName: file.name, error: validationError })
      return NextResponse.json(
        { error: 'Invalid file. Must be PDF, DOCX, DOC, TXT, or JSON under 500MB' },
        { status: 400 }
      )
    }

    // Track file size metric
    trackApiMetric('document.upload.file_size', file.size, 'byte')

    // Estimate upload time for logging
    const uploadEstimate = estimateUploadTime(file.size)
    logger.debug('Processing document upload', {
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      estimatedTime: `${uploadEstimate.estimated}s`,
      message: uploadEstimate.message
    })

    // Add context for monitoring
    addApiContext('document_upload', {
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      estimated_time: uploadEstimate.estimated
    })

    // Get user profile ID first (documents.user_id references user_profiles.id, not clerk_user_id)
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient())

    const { data: profile, error: profileError } = await trackSupabaseQuery(
      'SELECT',
      'user_profiles',
      () => supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', userId!)
        .single()
    )

    if (profileError || !profile) {
      logger.error('User profile not found', profileError, { userId })
      return NextResponse.json(
        { error: 'User profile not found. Please ensure your account is set up correctly.' },
        { status: 404 }
      )
    }

    const userProfileId = profile.id
    logger.debug('Found user profile ID', { userId, userProfileId })

    // Step 1: Create document record with pending status
    const documentData: DocumentInsert = {
      user_id: userProfileId, // Use Supabase UUID, not Clerk ID
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      processing_status: 'pending',
      storage_path: ''
    }

    const { document, error: dbError } = await trackSupabaseQuery(
      'INSERT',
      'documents',
      () => saveDocumentToDatabase(documentData)
    )

    if (dbError || !document) {
      logger.error('Failed to create document record', new Error(dbError || 'No document returned'), { userId, fileName: file.name })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/documents', 500, duration, { userId, error: 'Database error' })
      return NextResponse.json(
        { error: `Failed to save document: ${dbError}` },
        { status: 500 }
      )
    }

    documentId = document.id
    logger.debug('Document record created', { userId, documentId, fileName: file.name })

    await trackSupabaseQuery(
      'UPDATE',
      'documents',
      () => updateDocumentStatus(documentId!, 'processing')
    )

    // Step 2 & 3: Upload and parse in parallel for large files (optimization)
    const useParallel = shouldUseParallelProcessing(file.size)
    let storagePath: string
    let parseResult: Awaited<ReturnType<typeof parseDocument>>

    if (useParallel) {
      logger.info('Using parallel processing for large file', {
        userId,
        documentId,
        fileSize: file.size
      })

      const parallelStartTime = Date.now()

      // Process upload and parsing simultaneously
      const { uploadResult, parseResult: parseResultParallel } = await processFileParallel(
        uploadDocumentToStorage(file, userId),
        parseDocument(file)
      )

      const parallelDuration = Date.now() - parallelStartTime
      trackApiMetric('document.parallel_processing.duration', parallelDuration, 'millisecond')

      if (uploadResult.error) {
        // Create user-friendly error message
        const errorMsg = uploadResult.error.toLowerCase()
        let userFriendlyError = uploadResult.error

        if (errorMsg.includes('timeout') || errorMsg.includes('fetch failed') || errorMsg.includes('headers timeout')) {
          userFriendlyError = 'Upload timed out. Large files may take several minutes to upload. Please ensure you have a stable internet connection and try again. If the problem persists, try uploading a smaller file.'
        } else if (errorMsg.includes('failed after retries')) {
          userFriendlyError = 'Upload failed after multiple attempts. Please check your internet connection and try again later.'
        }

        await updateDocumentStatus(documentId, 'failed', userFriendlyError)
        logger.error('Failed to upload file to storage', new Error(uploadResult.error), { userId, documentId, fileName: file.name })
        const duration = Date.now() - startTime
        logger.api('POST', '/api/documents', 500, duration, { userId, error: 'Storage error' })
        return NextResponse.json(
          { error: userFriendlyError },
          { status: 500 }
        )
      }

      storagePath = uploadResult.path
      parseResult = parseResultParallel

      logger.info('Parallel processing complete', {
        userId,
        documentId,
        duration: `${parallelDuration}ms`
      })

      // Flag if parallel processing was slow (>30s for files that should benefit)
      if (parallelDuration > 30000) {
        flagSlowOperation('Parallel document processing', parallelDuration, 30000)
      }
    } else {
      // Sequential processing for small files (original behavior)
      const uploadStartTime = Date.now()
      const uploadResult = await uploadDocumentToStorage(file, userId)
      const uploadDuration = Date.now() - uploadStartTime

      trackApiMetric('document.upload.duration', uploadDuration, 'millisecond')

      if (uploadResult.error) {
        // Create user-friendly error message
        const errorMsg = uploadResult.error.toLowerCase()
        let userFriendlyError = uploadResult.error

        if (errorMsg.includes('timeout') || errorMsg.includes('fetch failed') || errorMsg.includes('headers timeout')) {
          userFriendlyError = 'Upload timed out. Large files may take several minutes to upload. Please ensure you have a stable internet connection and try again. If the problem persists, try uploading a smaller file.'
        } else if (errorMsg.includes('failed after retries')) {
          userFriendlyError = 'Upload failed after multiple attempts. Please check your internet connection and try again later.'
        }

        await updateDocumentStatus(documentId, 'failed', userFriendlyError)
        logger.error('Failed to upload file to storage', new Error(uploadResult.error), { userId, documentId, fileName: file.name })
        const duration = Date.now() - startTime
        logger.api('POST', '/api/documents', 500, duration, { userId, error: 'Storage error' })
        return NextResponse.json(
          { error: userFriendlyError },
          { status: 500 }
        )
      }

      storagePath = uploadResult.path
      logger.debug('File uploaded to storage', { userId, documentId, storagePath })

      // Extract text content with performance tracking
      const parseStartTime = Date.now()
      parseResult = await parseDocument(file)
      const parseDuration = Date.now() - parseStartTime

      trackApiMetric('document.parse.duration', parseDuration, 'millisecond')

      // Flag slow PDF parsing (>5s is expected for complex PDFs, but worth monitoring)
      if (parseDuration > 5000 && file.type === 'application/pdf') {
        flagSlowOperation('PDF parsing', parseDuration, 5000)
      }
    }

    // Validate storage path for PDFs (critical for PDF viewer)
    if (file.type === 'application/pdf' && (!storagePath || storagePath.trim() === '')) {
      const errorMsg = 'PDF uploaded but storage path is empty. This will prevent PDF display.'
      logger.error('Storage path validation failed', new Error(errorMsg), { userId, documentId, fileType: file.type })
      await updateDocumentStatus(documentId, 'failed', errorMsg)
      const duration = Date.now() - startTime
      logger.api('POST', '/api/documents', 500, duration, { userId, error: 'Missing storage path' })
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      )
    }

    if (parseResult.error) {
      await updateDocumentStatus(documentId, 'failed', parseResult.error)
      logger.warn('Document parsing failed', { userId, documentId, fileName: file.name, error: parseResult.error })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/documents', 400, duration, { userId, error: 'Parse error' })
      return NextResponse.json(
        { error: `Failed to parse document: ${parseResult.error}` },
        { status: 400 }
      )
    }

    const extractedText = parseResult.text

    if (!extractedText || extractedText.length === 0) {
      await updateDocumentStatus(documentId, 'failed', 'No readable text content found')
      logger.warn('Document has no readable text', { userId, documentId, fileName: file.name })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/documents', 400, duration, { userId, error: 'No text content' })
      return NextResponse.json(
        { error: 'Document contains no readable text content' },
        { status: 400 }
      )
    }

    // Track extracted text metrics
    trackApiMetric('document.extracted_text.length', extractedText.length, 'none')
    if (parseResult.pageCount) {
      trackApiMetric('document.page_count', parseResult.pageCount, 'none')
    }

    // Validate document content length and safety
    const lengthValidation = validateDocumentLength(extractedText)
    if (!lengthValidation.valid) {
      await updateDocumentStatus(documentId, 'failed', lengthValidation.reason || 'Invalid document length')
      logger.warn('Document length validation failed', { userId, documentId, length: extractedText.length, reason: lengthValidation.reason })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/documents', 400, duration, { userId, error: 'Invalid length' })
      return NextResponse.json(
        { error: lengthValidation.reason },
        { status: 400 }
      )
    }

    const safetyValidation = validateContentSafety(extractedText)
    if (!safetyValidation.safe) {
      await updateDocumentStatus(documentId, 'failed', safetyValidation.reason || 'Content safety check failed')
      logger.warn('Document content safety validation failed', { userId, documentId, reason: safetyValidation.reason })
      const duration = Date.now() - startTime
      logger.api('POST', '/api/documents', 400, duration, { userId, error: 'Content unsafe' })
      return NextResponse.json(
        { error: safetyValidation.reason },
        { status: 400 }
      )
    }

    logger.debug('Document text extracted and validated', { userId, documentId, textLength: extractedText.length })

    // Step 4: Update document with storage path and extracted text
    const { error: updateError } = await trackSupabaseQuery(
      'UPDATE',
      'documents',
      () => supabase
        .from('documents')
        .update({
          storage_path: storagePath,
          extracted_text: extractedText,
          processing_status: 'completed',
          metadata: {
            page_count: parseResult.pageCount || null,
            extraction_method: 'server-side',
            updated_at: new Date().toISOString(),
          }
        })
        .eq('id', documentId)
    )

    if (updateError) {
      logger.error('Failed to update document with final data', updateError, { userId, documentId })
      await updateDocumentStatus(documentId, 'failed', updateError.message)
      const duration = Date.now() - startTime
      logger.api('POST', '/api/documents', 500, duration, { userId, error: 'Database update error' })
      return NextResponse.json(
        { error: `Failed to update document: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Track successful document upload
    trackDocumentUpload(userId, 'free') // TODO: Get actual tier from user profile

    const duration = Date.now() - startTime
    trackApiMetric('document.total_processing.duration', duration, 'millisecond')

    logger.api('POST', '/api/documents', 200, duration, {
      userId,
      documentId,
      fileName: file.name,
      fileSize: file.size,
      textLength: extractedText.length
    })

    logger.debug('Document processed successfully', {
      userId,
      documentId,
      fileName: file.name,
      duration: `${duration}ms`
    })

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
    const duration = Date.now() - startTime
    logger.error('POST /api/documents error', error, { userId, duration: `${duration}ms` })
    logger.api('POST', '/api/documents', 500, duration, { userId, error: 'Unknown error' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withMonitoring(handlePostDocument, '/api/documents')
