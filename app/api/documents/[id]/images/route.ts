/**
 * API Route: GET/POST /api/documents/[id]/images
 *
 * GET: Retrieve images extracted from a document
 * POST: Trigger image extraction for a document (if not already done)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { extractPDFImages } from '@/lib/pdf-image-extractor'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for image extraction

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/documents/[id]/images
 * Retrieve all images for a document
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    const supabase = await createClient()

    // Verify document ownership
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id, user_id, images_extracted, image_count')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get images from database
    const { data: images, error } = await supabase
      .from('document_images')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true })
      .order('image_index', { ascending: true })

    if (error) {
      console.error('Failed to fetch images:', error)
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      documentId,
      imagesExtracted: document.images_extracted || false,
      imageCount: document.image_count || 0,
      images: images?.map(img => ({
        id: img.id,
        pageNumber: img.page_number,
        imageIndex: img.image_index,
        storageUrl: img.storage_url,
        width: img.width,
        height: img.height,
        mimeType: img.mime_type,
        description: img.description,
        bbox: img.bbox
      })) || []
    })
  } catch (error) {
    console.error('Get images error:', error)
    return NextResponse.json(
      { error: 'Failed to get images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/[id]/images
 * Extract images from a PDF document
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get document
    const { data: document } = await supabase
      .from('documents')
      .select('id, user_id, file_type, storage_path, images_extracted')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if images already extracted
    if (document.images_extracted) {
      // Return existing images
      const { data: existingImages } = await supabase
        .from('document_images')
        .select('*')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true })

      return NextResponse.json({
        success: true,
        message: 'Images already extracted',
        imageCount: existingImages?.length || 0,
        images: existingImages?.map(img => ({
          id: img.id,
          pageNumber: img.page_number,
          imageIndex: img.image_index,
          storageUrl: img.storage_url,
          width: img.width,
          height: img.height,
          mimeType: img.mime_type
        })) || []
      })
    }

    // Only extract from PDFs
    if (document.file_type !== 'application/pdf') {
      return NextResponse.json({
        success: false,
        error: 'Image extraction is only supported for PDF documents'
      }, { status: 400 })
    }

    // Download PDF from storage
    if (!document.storage_path) {
      return NextResponse.json({
        success: false,
        error: 'Document has no storage path'
      }, { status: 400 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      console.error('Failed to download PDF:', downloadError)
      return NextResponse.json({
        success: false,
        error: 'Failed to download document'
      }, { status: 500 })
    }

    // Save to temp file
    const tempDir = os.tmpdir()
    const tempPath = path.join(tempDir, `${documentId}.pdf`)
    const buffer = Buffer.from(await fileData.arrayBuffer())
    await fs.writeFile(tempPath, buffer)

    try {
      // Extract images
      console.log(`📸 Extracting images from document ${documentId}...`)
      const extractionResult = await extractPDFImages(tempPath)

      if (!extractionResult.success) {
        return NextResponse.json({
          success: false,
          error: extractionResult.error || 'Image extraction failed'
        }, { status: 500 })
      }

      const images = extractionResult.images || []
      const storedImages: Array<{
        pageNumber: number
        imageIndex: number
        storageUrl: string
        width: number
        height: number
        mimeType: string
      }> = []

      // Upload each image to Supabase Storage
      for (const image of images) {
        if (!image.base64) continue

        try {
          const imageBuffer = Buffer.from(image.base64, 'base64')
          const storagePath = `${profile.id}/documents/${documentId}/images/${image.filename}`

          const { error: uploadError } = await supabase.storage
            .from('document-images')
            .upload(storagePath, imageBuffer, {
              contentType: image.mimeType || `image/${image.extension}`,
              upsert: true
            })

          if (uploadError) {
            console.error(`Failed to upload ${image.filename}:`, uploadError)
            continue
          }

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
          console.error(`Error uploading ${image.filename}:`, uploadError)
        }
      }

      // Save image metadata to database
      if (storedImages.length > 0) {
        const imageRecords = storedImages.map(img => ({
          document_id: documentId,
          page_number: img.pageNumber,
          image_index: img.imageIndex,
          storage_url: img.storageUrl,
          width: img.width,
          height: img.height,
          mime_type: img.mimeType
        }))

        const { error: insertError } = await supabase
          .from('document_images')
          .insert(imageRecords)

        if (insertError) {
          console.error('Failed to save image metadata:', insertError)
        }
      }

      // Update document to mark images as extracted
      await supabase
        .from('documents')
        .update({
          images_extracted: true,
          image_count: storedImages.length
        })
        .eq('id', documentId)

      console.log(`✅ Extracted ${storedImages.length} images from document ${documentId}`)

      return NextResponse.json({
        success: true,
        message: `Extracted ${storedImages.length} images`,
        imageCount: storedImages.length,
        images: storedImages
      })

    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempPath)
      } catch {
        // Ignore cleanup errors
      }
    }

  } catch (error) {
    console.error('Image extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
