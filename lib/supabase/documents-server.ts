// Supabase Document Management Functions (Server-Side)
import { createClient } from './server'
import type { Document, DocumentInsert } from './types'

/**
 * Upload document file to Supabase Storage (Server-Side)
 */
export async function uploadDocumentToStorage(
  file: File,
  userId: string
): Promise<{ path: string; error: string | null }> {
  try {
    const supabase = await createClient()

    // Create unique file path: userId/timestamp-filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userId}/${timestamp}-${sanitizedFileName}`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { path: '', error: error.message }
    }

    return { path: data.path, error: null }
  } catch (error) {
    console.error('Upload to storage failed:', error)
    return {
      path: '',
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Save document metadata to database (Server-Side)
 */
export async function saveDocumentToDatabase(
  documentData: DocumentInsert
): Promise<{ document: Document | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return { document: null, error: error.message }
    }

    return { document: data as Document, error: null }
  } catch (error) {
    console.error('Save to database failed:', error)
    return {
      document: null,
      error: error instanceof Error ? error.message : 'Database save failed'
    }
  }
}

/**
 * Get all documents for a user (Server-Side)
 */
export async function getUserDocuments(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ documents: Document[]; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Fetch documents error:', error)
      return { documents: [], error: error.message }
    }

    return { documents: (data as Document[]) || [], error: null }
  } catch (error) {
    console.error('Get user documents failed:', error)
    return {
      documents: [],
      error: error instanceof Error ? error.message : 'Fetch failed'
    }
  }
}

/**
 * Get a single document by ID (Server-Side)
 */
export async function getDocumentById(
  documentId: string,
  userId: string
): Promise<{ document: Document | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Fetch document error:', error)
      return { document: null, error: error.message }
    }

    return { document: data as Document, error: null }
  } catch (error) {
    console.error('Get document by ID failed:', error)
    return {
      document: null,
      error: error instanceof Error ? error.message : 'Fetch failed'
    }
  }
}

/**
 * Delete a document (removes from storage and database) (Server-Side)
 */
export async function deleteDocument(
  documentId: string,
  userId: string,
  storagePath: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Delete from storage first
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return { success: false, error: dbError.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Delete document failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Update document processing status (Server-Side)
 */
export async function updateDocumentStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const updateData: { processing_status: string; error_message?: string } = {
      processing_status: status
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    const { error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)

    if (error) {
      console.error('Update status error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Update document status failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed'
    }
  }
}

/**
 * Get document download URL from storage (Server-Side)
 */
export async function getDocumentDownloadUrl(
  storagePath: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error} = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (error) {
      console.error('Get download URL error:', error)
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl, error: null }
  } catch (error) {
    console.error('Get document download URL failed:', error)
    return {
      url: null,
      error: error instanceof Error ? error.message : 'URL generation failed'
    }
  }
}
