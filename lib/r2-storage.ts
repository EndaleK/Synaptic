/**
 * Cloudflare R2 Storage Utilities
 *
 * Provides file upload, download, and deletion for large PDFs (500MB+)
 * Uses AWS S3-compatible API with zero egress fees
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto', // Cloudflare R2 uses 'auto' region
  endpoint: process.env.R2_ENDPOINT, // e.g., https://<account-id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'synaptic-documents'

// Helper function to strip bucket prefix from storage keys
// Storage paths in DB may include 'documents/' prefix, but R2 SDK expects keys without it
const BUCKET_PREFIX = 'documents/'
function stripBucketPrefix(key: string): string {
  return key.startsWith(BUCKET_PREFIX) ? key.substring(BUCKET_PREFIX.length) : key
}

/**
 * Upload a file to R2 storage
 * Supports files up to 500GB with automatic multipart upload
 */
export async function uploadToR2(
  file: Buffer | ReadableStream,
  key: string,
  contentType: string = 'application/pdf'
): Promise<{ url: string; key: string }> {
  // Strip bucket prefix if present in key
  const actualKey = stripBucketPrefix(key)

  console.log('📤 R2 Upload starting:', {
    bucket: BUCKET_NAME,
    originalKey: key,
    actualKey,
    endpoint: process.env.R2_ENDPOINT,
    contentType,
    fileSize: file instanceof Buffer ? file.length : 'stream'
  })

  try {
    // Use Upload for automatic multipart handling (files > 5MB)
    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: actualKey,  // Use stripped key
        Body: file,
        ContentType: contentType,
      },
    })

    const result = await upload.done()
    console.log('✅ R2 Upload successful:', { bucket: BUCKET_NAME, key })

    // Return the public URL (if bucket is configured for public access)
    // Or return the key for later retrieval via signed URLs
    // If R2_PUBLIC_URL is not configured, use signed URLs instead
    const url = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : '' // Empty means we'll use signed URLs on-demand

    return { url, key }
  } catch (error) {
    console.error('❌ R2 upload error:', {
      bucket: BUCKET_NAME,
      key,
      endpoint: process.env.R2_ENDPOINT,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error
    })
    throw new Error(`Failed to upload file to R2 storage: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a signed URL for downloading a file from R2
 * URL expires after specified seconds (default 1 hour)
 */
export async function getR2SignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  // Strip bucket prefix if present in key
  const actualKey = stripBucketPrefix(key)

  console.log('🔐 R2 Generating signed URL:', {
    bucket: BUCKET_NAME,
    originalKey: key,
    actualKey,
    endpoint: process.env.R2_ENDPOINT,
    expiresIn
  })

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: actualKey,  // Use stripped key
    })

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn })
    console.log('✅ R2 Signed URL generated successfully for key:', key)
    return signedUrl
  } catch (error) {
    console.error('❌ R2 signed URL generation failed:', {
      bucket: BUCKET_NAME,
      key,
      endpoint: process.env.R2_ENDPOINT,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error
    })
    throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Download a file from R2 as a stream
 * Memory-efficient for large files
 */
export async function downloadFromR2(key: string): Promise<ReadableStream> {
  // Strip bucket prefix if present in key
  const actualKey = stripBucketPrefix(key)

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: actualKey,  // Use stripped key
    })

    const response = await r2Client.send(command)

    if (!response.Body) {
      throw new Error('No file content received from R2')
    }

    // Convert SDK stream to web ReadableStream
    return response.Body.transformToWebStream()
  } catch (error) {
    console.error('R2 download error:', error)
    throw new Error('Failed to download file from R2')
  }
}

/**
 * Download a file from R2 storage as a Buffer
 */
export async function downloadFromR2AsBuffer(key: string): Promise<Buffer> {
  // Strip bucket prefix if present in key
  const actualKey = stripBucketPrefix(key)

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: actualKey,  // Use stripped key
    })

    const response = await r2Client.send(command)

    if (!response.Body) {
      throw new Error('No file content received from R2')
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch (error) {
    console.error('R2 download error:', error)
    throw new Error('Failed to download file from R2')
  }
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFromR2(key: string): Promise<void> {
  // Strip bucket prefix if present in key
  const actualKey = stripBucketPrefix(key)

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: actualKey,  // Use stripped key
    })

    await r2Client.send(command)
  } catch (error) {
    console.error('R2 delete error:', error)
    throw new Error('Failed to delete file from R2')
  }
}

/**
 * Check if a file exists in R2
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  // Strip bucket prefix if present in key
  const actualKey = stripBucketPrefix(key)

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: actualKey,  // Use stripped key
    })

    await r2Client.send(command)
    console.log('✅ R2 File exists:', { bucket: BUCKET_NAME, key })
    return true
  } catch (error) {
    console.warn('⚠️ R2 File does not exist:', {
      bucket: BUCKET_NAME,
      key,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

/**
 * Get file metadata from R2
 */
export async function getR2FileMetadata(key: string): Promise<{
  size: number
  contentType: string
  lastModified: Date
}> {
  // Strip bucket prefix if present in key
  const actualKey = stripBucketPrefix(key)

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: actualKey,  // Use stripped key
    })

    const response = await r2Client.send(command)

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
    }
  } catch (error) {
    console.error('R2 metadata error:', error)
    throw new Error('Failed to get file metadata from R2')
  }
}
