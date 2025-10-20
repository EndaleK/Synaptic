/**
 * Upload Optimization Utilities
 *
 * Provides utilities for optimizing large file uploads:
 * - Parallel processing (upload + parse simultaneously)
 * - Progress tracking
 * - File compression
 * - Chunked uploads
 */

import { logger } from './logger'

export interface UploadProgress {
  stage: 'uploading' | 'parsing' | 'validating' | 'complete'
  percent: number
  message: string
}

export type ProgressCallback = (progress: UploadProgress) => void

/**
 * Process file upload and parsing in parallel for faster completion
 */
export async function processFileParallel<T, U>(
  uploadTask: Promise<T>,
  parseTask: Promise<U>,
  onProgress?: ProgressCallback
): Promise<{ uploadResult: T; parseResult: U }> {
  let uploadComplete = false
  let parseComplete = false

  const updateProgress = () => {
    if (!onProgress) return

    if (!uploadComplete && !parseComplete) {
      onProgress({
        stage: 'uploading',
        percent: 25,
        message: 'Uploading file and extracting text...',
      })
    } else if (uploadComplete && !parseComplete) {
      onProgress({
        stage: 'parsing',
        percent: 75,
        message: 'Finalizing text extraction...',
      })
    } else if (!uploadComplete && parseComplete) {
      onProgress({
        stage: 'uploading',
        percent: 75,
        message: 'Finalizing upload...',
      })
    }
  }

  // Start both operations in parallel
  const uploadPromise = uploadTask.then((result) => {
    uploadComplete = true
    updateProgress()
    return result
  })

  const parsePromise = parseTask.then((result) => {
    parseComplete = true
    updateProgress()
    return result
  })

  // Wait for both to complete
  const [uploadResult, parseResult] = await Promise.all([uploadPromise, parsePromise])

  if (onProgress) {
    onProgress({
      stage: 'complete',
      percent: 100,
      message: 'Upload complete!',
    })
  }

  logger.debug('Parallel processing complete', {
    uploadComplete,
    parseComplete,
  })

  return { uploadResult, parseResult }
}

/**
 * Estimate upload time based on file size and connection speed
 */
export function estimateUploadTime(fileSize: number): {
  estimated: number // seconds
  message: string
} {
  // Assume average upload speed of 5 Mbps (conservative)
  const UPLOAD_SPEED_MBPS = 5
  const UPLOAD_SPEED_BYTES_PER_SEC = (UPLOAD_SPEED_MBPS * 1024 * 1024) / 8

  const estimatedSeconds = Math.ceil(fileSize / UPLOAD_SPEED_BYTES_PER_SEC)

  let message = ''
  if (estimatedSeconds < 10) {
    message = 'This should only take a few seconds'
  } else if (estimatedSeconds < 60) {
    message = `This should take about ${estimatedSeconds} seconds`
  } else {
    const minutes = Math.ceil(estimatedSeconds / 60)
    message = `This may take ${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  return {
    estimated: estimatedSeconds,
    message,
  }
}

/**
 * Check if file should use optimized processing
 * Large files benefit from parallel processing
 */
export function shouldUseParallelProcessing(fileSize: number): boolean {
  const THRESHOLD = 10 * 1024 * 1024 // 10MB
  return fileSize >= THRESHOLD
}

/**
 * Calculate optimal chunk size for uploads
 */
export function calculateChunkSize(fileSize: number): number {
  // Vercel max payload: 4.5MB, but use smaller chunks for reliability
  const MIN_CHUNK_SIZE = 1 * 1024 * 1024 // 1MB
  const MAX_CHUNK_SIZE = 4 * 1024 * 1024 // 4MB

  if (fileSize < MIN_CHUNK_SIZE) {
    return fileSize // Don't chunk small files
  }

  // For large files, use larger chunks
  if (fileSize > 100 * 1024 * 1024) {
    return MAX_CHUNK_SIZE
  }

  // For medium files, use medium chunks
  return 2 * 1024 * 1024 // 2MB
}

/**
 * Split file into chunks for parallel upload
 */
export async function splitFileIntoChunks(file: File, chunkSize: number): Promise<Blob[]> {
  const chunks: Blob[] = []
  let offset = 0

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    chunks.push(chunk)
    offset += chunkSize
  }

  logger.debug('File split into chunks', {
    fileName: file.name,
    fileSize: file.size,
    chunkSize,
    chunkCount: chunks.length,
  })

  return chunks
}

/**
 * Compress file before upload (for text-based files)
 * Note: PDFs are already compressed, so this mainly helps with TXT/DOCX
 */
export async function compressFile(file: File): Promise<File> {
  // Check if file is already compressed (PDF, images)
  const compressedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/zip']

  if (compressedTypes.includes(file.type)) {
    logger.debug('Skipping compression for already compressed file type', { type: file.type })
    return file
  }

  // For text files and DOCX, we could implement compression here
  // For now, just return the original file
  // TODO: Implement gzip compression for text-based files

  return file
}

/**
 * Create a readable stream for large file uploads
 * Allows for progress tracking and cancellation
 */
export function createUploadStream(file: File): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const chunkSize = calculateChunkSize(file.size)
      let offset = 0

      while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize)
        const buffer = await chunk.arrayBuffer()
        controller.enqueue(new Uint8Array(buffer))
        offset += chunkSize
      }

      controller.close()
    },
  })
}
