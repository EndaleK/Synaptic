/**
 * API Route: Check Storage Paths
 *
 * Diagnostic endpoint to identify documents with problematic storage paths
 * Helps identify documents uploaded with R2 configuration that need re-upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user profile ID
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

    // 3. Fetch all user documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, file_name, storage_path, processing_status, created_at, metadata')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('Failed to fetch documents:', docsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    // 4. Analyze storage paths
    const problematicDocs = []
    const validDocs = []

    for (const doc of documents || []) {
      const analysis = {
        id: doc.id,
        fileName: doc.file_name,
        storagePath: doc.storage_path,
        status: doc.processing_status,
        createdAt: doc.created_at,
        issue: null as string | null,
        action: null as string | null
      }

      // Check for R2-style path (has "documents/" prefix)
      if (doc.storage_path?.startsWith('documents/')) {
        analysis.issue = 'R2-style path detected (has "documents/" prefix)'
        analysis.action = 'DELETE and RE-UPLOAD - this document was uploaded with R2 configuration'
        problematicDocs.push(analysis)
      }
      // Check for missing storage path
      else if (!doc.storage_path) {
        analysis.issue = 'Missing storage path'
        analysis.action = 'DELETE - upload incomplete, no file in storage'
        problematicDocs.push(analysis)
      }
      // Check for very short path (likely corrupted)
      else if (doc.storage_path.length < 10) {
        analysis.issue = 'Storage path too short (likely corrupted)'
        analysis.action = 'DELETE and RE-UPLOAD - path appears corrupted'
        problematicDocs.push(analysis)
      }
      // Valid Supabase path
      else {
        analysis.action = 'OK - valid Supabase storage path'
        validDocs.push(analysis)
      }
    }

    // 5. Return analysis
    return NextResponse.json({
      success: true,
      summary: {
        total: documents?.length || 0,
        problematic: problematicDocs.length,
        valid: validDocs.length
      },
      problematicDocuments: problematicDocs,
      validDocuments: validDocs,
      recommendation: problematicDocs.length > 0
        ? 'Delete and re-upload the problematic documents listed above. They were uploaded before R2 configuration was removed and have incorrect storage paths.'
        : 'All documents have valid storage paths.'
    })

  } catch (error) {
    console.error('Error checking storage paths:', error)
    return NextResponse.json(
      {
        error: 'Failed to check storage paths',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
