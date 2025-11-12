#!/usr/bin/env tsx
/**
 * Check document processing status
 * Usage: npx tsx scripts/check-document-status.ts <document-id>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function checkDocumentStatus(documentId?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (documentId) {
    // Check specific document
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, file_size, processing_status, error_message, rag_indexed_at, rag_chunk_count, metadata, created_at')
      .eq('id', documentId)
      .single()

    if (error) {
      console.error('❌ Error fetching document:', error)
      process.exit(1)
    }

    if (data) {
      console.log('\n📄 Document Status:')
      console.log('  ID:', data.id)
      console.log('  File:', data.file_name)
      console.log('  Size:', (data.file_size / 1024 / 1024).toFixed(2), 'MB')
      console.log('  Status:', data.processing_status)
      console.log('  RAG Indexed:', data.rag_indexed_at ? '✅ Yes' : '❌ No')
      console.log('  RAG Chunks:', data.rag_chunk_count || 0)
      console.log('  Created:', data.created_at)
      if (data.error_message) {
        console.log('  Error:', data.error_message)
      }
      if (data.metadata) {
        console.log('  Metadata:', JSON.stringify(data.metadata, null, 2))
      }
    }
  } else {
    // Check all recent documents
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, file_size, processing_status, rag_indexed_at, rag_chunk_count, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error fetching documents:', error)
      process.exit(1)
    }

    if (data) {
      console.log('\n📄 Recent Documents:')
      data.forEach((doc, i) => {
        console.log(`\n${i + 1}. ${doc.file_name}`)
        console.log('   ID:', doc.id)
        console.log('   Size:', (doc.file_size / 1024 / 1024).toFixed(2), 'MB')
        console.log('   Status:', doc.processing_status)
        console.log('   RAG:', doc.rag_indexed_at ? `✅ ${doc.rag_chunk_count} chunks` : '❌ Not indexed')
        console.log('   Created:', doc.created_at)
      })
    }
  }
}

const documentId = process.argv[2]
checkDocumentStatus(documentId).catch(console.error)
