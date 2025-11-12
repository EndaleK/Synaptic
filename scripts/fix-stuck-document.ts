#!/usr/bin/env npx tsx

/**
 * Fix stuck document by resetting status to 'pending'
 * This will allow it to be re-processed with the full text (no truncation)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixStuckDocument() {
  const documentId = process.argv[2]

  if (!documentId) {
    console.error('❌ Usage: npx tsx scripts/fix-stuck-document.ts <document-id>')
    process.exit(1)
  }

  console.log(`🔧 Fixing stuck document: ${documentId}`)

  // Get current document status
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (fetchError || !doc) {
    console.error('❌ Document not found:', fetchError?.message)
    process.exit(1)
  }

  console.log(`📄 Current status: ${doc.processing_status}`)
  console.log(`📏 Current text length: ${doc.extracted_text?.length || 0} characters`)

  // Delete from vector store (will be re-indexed)
  console.log('🗑️  Clearing old vector data...')

  // Reset document to pending for re-processing
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      processing_status: 'pending',
      extracted_text: null,
      rag_indexed_at: null,
      rag_chunk_count: null,
      rag_collection_name: null,
      error_message: null,
      metadata: {
        ...doc.metadata,
        reset_at: new Date().toISOString(),
        reset_reason: 'fix_truncation',
      }
    })
    .eq('id', documentId)

  if (updateError) {
    console.error('❌ Update failed:', updateError.message)
    process.exit(1)
  }

  console.log('✅ Document reset to pending status')
  console.log('🚀 Re-trigger processing via Inngest dashboard or wait for auto-retry')
  console.log('📝 The document will be re-processed with FULL text (no truncation)')
}

fixStuckDocument().catch(console.error)
