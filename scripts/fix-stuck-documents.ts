/**
 * Script to fix documents stuck in "processing" status
 *
 * This updates all documents with "processing" status to "failed"
 * to break the auto-refresh loop
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function fixStuckDocuments() {
  console.log('🔧 Fixing stuck documents...\n')

  // Create Supabase client with service role
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find all documents stuck in "processing"
  const { data: stuckDocs, error: fetchError } = await supabase
    .from('documents')
    .select('id, file_name, processing_status, created_at')
    .eq('processing_status', 'processing')

  if (fetchError) {
    console.error('❌ Error fetching documents:', fetchError)
    process.exit(1)
  }

  if (!stuckDocs || stuckDocs.length === 0) {
    console.log('✅ No stuck documents found!')
    process.exit(0)
  }

  console.log(`📄 Found ${stuckDocs.length} stuck document(s):\n`)
  stuckDocs.forEach((doc) => {
    console.log(`  - ${doc.file_name} (ID: ${doc.id})`)
    console.log(`    Created: ${new Date(doc.created_at).toLocaleString()}`)
  })

  console.log('\n🔄 Updating status to "failed"...\n')

  // Update all to failed
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      processing_status: 'failed',
      error_message: 'Processing timed out or was interrupted. Please re-upload the document.',
      metadata: {
        fixed_by_script: true,
        fixed_at: new Date().toISOString(),
      },
    })
    .eq('processing_status', 'processing')

  if (updateError) {
    console.error('❌ Error updating documents:', updateError)
    process.exit(1)
  }

  console.log(`✅ Successfully updated ${stuckDocs.length} document(s) to "failed" status`)
  console.log('\n💡 The UI should now stop auto-refreshing')
  console.log('   Users can re-upload these documents if needed\n')
}

fixStuckDocuments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
