/**
 * PDF Image Extraction Library
 *
 * Extracts images from PDF documents using PyMuPDF.
 * Images are stored in Supabase Storage and referenced in the database.
 */

import { spawn } from 'child_process'
import path from 'path'
import { createClient } from '@/lib/supabase/server'

export interface ExtractedImage {
  pageNumber: number
  imageIndex: number
  filename: string
  width: number
  height: number
  colorspace: number
  bitsPerComponent: number
  xref: number
  extension: string
  sizeBytes: number
  bbox?: [number, number, number, number]
  base64?: string
  mimeType?: string
  storageUrl?: string
}

export interface ImageExtractionResult {
  success: boolean
  images?: ExtractedImage[]
  totalImages?: number
  pageCount?: number
  error?: string
  method?: string
}

/**
 * Check if PyMuPDF is available (only works locally, not on Vercel)
 */
function isPyMuPDFAvailable(): boolean {
  // On Vercel, venv won't exist
  if (process.env.VERCEL) {
    return false
  }

  try {
    const fs = require('fs')
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python3')
    return fs.existsSync(pythonPath)
  } catch {
    return false
  }
}

/**
 * Extract images from a PDF file using PyMuPDF
 *
 * @param pdfPath - Path to the PDF file
 * @returns Promise with extraction result including base64 encoded images
 */
export async function extractPDFImages(pdfPath: string): Promise<ImageExtractionResult> {
  // Check if PyMuPDF is available before attempting extraction
  if (!isPyMuPDFAvailable()) {
    return {
      success: false,
      error: 'Image extraction is not available in production. PyMuPDF requires a local Python environment.',
      method: 'pymupdf-unavailable'
    }
  }

  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'extract-pdf-images.py')

    // Check if Python venv exists
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python3')

    const pythonProcess = spawn(pythonPath, [scriptPath, pdfPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    // Set timeout for the process (2 minutes)
    const timeoutId = setTimeout(() => {
      pythonProcess.kill()
      resolve({
        success: false,
        error: 'Image extraction timed out after 2 minutes',
        method: 'pymupdf'
      })
    }, 120000)

    pythonProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code: number | null) => {
      clearTimeout(timeoutId)
      if (code === 0 && stdout) {
        try {
          const result = JSON.parse(stdout)
          resolve(result)
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to parse extraction result: ${parseError}`,
            method: 'pymupdf'
          })
        }
      } else {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${code}`,
          method: 'pymupdf'
        })
      }
    })

    pythonProcess.on('error', (error: Error) => {
      clearTimeout(timeoutId)
      resolve({
        success: false,
        error: `Failed to start Python process: ${error.message}. Make sure PyMuPDF is installed: pip install PyMuPDF`,
        method: 'pymupdf'
      })
    })
  })
}

/**
 * Extract images from a PDF and store them in Supabase Storage
 *
 * @param pdfPath - Path to the PDF file
 * @param documentId - UUID of the document in the database
 * @param userProfileId - UUID of the user who owns the document
 * @returns Promise with storage URLs for extracted images
 */
export async function extractAndStoreImages(
  pdfPath: string,
  documentId: string,
  userProfileId: string
): Promise<{
  success: boolean
  images: Array<{
    pageNumber: number
    imageIndex: number
    storageUrl: string
    width: number
    height: number
    mimeType: string
  }>
  error?: string
}> {
  // First extract images with base64 encoding
  const extractionResult = await extractPDFImages(pdfPath)

  if (!extractionResult.success || !extractionResult.images) {
    return {
      success: false,
      images: [],
      error: extractionResult.error || 'No images found'
    }
  }

  const supabase = await createClient()
  const storedImages: Array<{
    pageNumber: number
    imageIndex: number
    storageUrl: string
    width: number
    height: number
    mimeType: string
  }> = []

  // Upload each image to Supabase Storage
  for (const image of extractionResult.images) {
    if (!image.base64) continue

    try {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(image.base64, 'base64')

      // Create storage path
      const storagePath = `${userProfileId}/documents/${documentId}/images/${image.filename}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('document-images')
        .upload(storagePath, imageBuffer, {
          contentType: image.mimeType || `image/${image.extension}`,
          upsert: true
        })

      if (error) {
        console.error(`Failed to upload image ${image.filename}:`, error)
        continue
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('document-images')
        .getPublicUrl(storagePath)

      storedImages.push({
        pageNumber: image.pageNumber,
        imageIndex: image.imageIndex,
        storageUrl: urlData.publicUrl,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType || `image/${image.extension}`
      })
    } catch (uploadError) {
      console.error(`Error uploading image ${image.filename}:`, uploadError)
    }
  }

  return {
    success: true,
    images: storedImages
  }
}

/**
 * Save extracted image metadata to the database
 *
 * @param documentId - UUID of the document
 * @param images - Array of extracted image metadata
 */
export async function saveImageMetadata(
  documentId: string,
  images: Array<{
    pageNumber: number
    imageIndex: number
    storageUrl: string
    width: number
    height: number
    mimeType: string
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Insert image records
  const imageRecords = images.map(img => ({
    document_id: documentId,
    page_number: img.pageNumber,
    image_index: img.imageIndex,
    storage_url: img.storageUrl,
    width: img.width,
    height: img.height,
    mime_type: img.mimeType
  }))

  const { error } = await supabase
    .from('document_images')
    .insert(imageRecords)

  if (error) {
    console.error('Failed to save image metadata:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get all images for a document
 *
 * @param documentId - UUID of the document
 * @returns Array of image metadata with storage URLs
 */
export async function getDocumentImages(documentId: string): Promise<{
  success: boolean
  images: Array<{
    id: string
    pageNumber: number
    imageIndex: number
    storageUrl: string
    width: number
    height: number
    mimeType: string
    description?: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_images')
    .select('*')
    .eq('document_id', documentId)
    .order('page_number', { ascending: true })
    .order('image_index', { ascending: true })

  if (error) {
    return { success: false, images: [], error: error.message }
  }

  return {
    success: true,
    images: (data || []).map(img => ({
      id: img.id,
      pageNumber: img.page_number,
      imageIndex: img.image_index,
      storageUrl: img.storage_url,
      width: img.width,
      height: img.height,
      mimeType: img.mime_type,
      description: img.description
    }))
  }
}
