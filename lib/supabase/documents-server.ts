// Supabase Document Management Functions (Server-Side)
import { createClient } from './server'
import type { Document, DocumentInsert } from './types'

/**
 * Upload document file to Supabase Storage (Server-Side) with retry logic
 *
 * Converts File to Buffer for Node.js environment compatibility.
 * Supports files up to 500MB (after increasing Supabase storage limit).
 */
export async function uploadDocumentToStorage(
  file: File,
  userId: string,
  maxRetries = 3
): Promise<{ path: string; error: string | null }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const supabase = await createClient()

      // Create unique file path: userId/timestamp-filename
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${userId}/${timestamp}-${sanitizedFileName}`

      console.log(`Upload attempt ${attempt}/${maxRetries}: ${file.name} (${file.size} bytes)`)

      // CRITICAL FIX: Convert File to Buffer for Node.js server environment
      // Supabase's server-side SDK requires Buffer, not File object
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type  // Preserve MIME type
        })

      if (error) {
        lastError = error instanceof Error ? error : new Error(error.message)
        console.error(`Upload error (attempt ${attempt}/${maxRetries}):`, error)

        // Retry on timeout or network errors
        const isRetryable = error.message.toLowerCase().includes('timeout') ||
                           error.message.toLowerCase().includes('fetch failed') ||
                           error.message.toLowerCase().includes('headers timeout')

        if (attempt < maxRetries && isRetryable) {
          const backoffDelay = 1000 * Math.pow(2, attempt - 1) // Exponential backoff: 1s, 2s, 4s
          console.log(`Retrying upload after ${backoffDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
          continue
        }

        return { path: '', error: error.message }
      }

      console.log(`✅ Upload successful: ${data.path}`)
      return { path: data.path, error: null }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.error(`Upload attempt ${attempt}/${maxRetries} failed:`, error)

      // Retry on network errors
      if (attempt < maxRetries) {
        const backoffDelay = 1000 * Math.pow(2, attempt - 1)
        console.log(`Retrying upload after ${backoffDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
        continue
      }
    }
  }

  return {
    path: '',
    error: lastError?.message || 'Upload failed after retries'
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
  clerkUserId: string,
  limit = 50,
  offset = 0
): Promise<{ documents: Document[]; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get user profile ID first (documents.user_id references user_profiles.id, not clerk_user_id)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !profile) {
      console.error('User profile not found:', profileError)
      return { documents: [], error: 'User profile not found' }
    }

    const { data, error } = await supabase
      .from('documents')
      .select(`
        id,
        user_id,
        file_name,
        file_type,
        file_size,
        storage_path,
        processing_status,
        processing_progress,
        error_message,
        source_url,
        source_type,
        metadata,
        folder_id,
        rag_indexed_at,
        rag_chunk_count,
        rag_collection_name,
        created_at,
        updated_at
      `)
      .eq('user_id', profile.id)
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
 * Includes retry logic for read-after-write consistency issues
 */
export async function getDocumentById(
  documentId: string,
  clerkUserId: string
): Promise<{ document: Document | null; error: string | null }> {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 200

  try {
    console.log(`[getDocumentById] Fetching document: ${documentId} for user: ${clerkUserId}`)
    const supabase = await createClient()

    // Get user profile ID first (documents.user_id references user_profiles.id, not clerk_user_id)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !profile) {
      console.error('[getDocumentById] User profile not found:', profileError)
      return { document: null, error: 'User profile not found' }
    }

    // Retry loop to handle read-after-write consistency
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', profile.id)
        .single()

      if (error) {
        // PGRST116 = "No rows returned" - document might not be replicated yet
        const isNotFound = error.code === 'PGRST116' || error.message.includes('no rows')

        if (isNotFound && attempt < MAX_RETRIES) {
          console.warn(`[getDocumentById] Document not found (attempt ${attempt}/${MAX_RETRIES}), retrying after ${RETRY_DELAY_MS}ms...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
          continue
        }

        console.error(`[getDocumentById] Fetch error (attempt ${attempt}):`, error)
        return { document: null, error: error.message }
      }

      console.log(`[getDocumentById] Document fetched successfully: ${data?.file_name}`)
      return { document: data as Document, error: null }
    }

    // Should not reach here
    return { document: null, error: 'Max retries exceeded' }
  } catch (error) {
    console.error('[getDocumentById] Exception:', error)
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
  clerkUserId: string,
  storagePath: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get user profile ID first (documents.user_id references user_profiles.id, not clerk_user_id)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !profile) {
      console.error('User profile not found:', profileError)
      return { success: false, error: 'User profile not found' }
    }

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
      .eq('user_id', profile.id)

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
