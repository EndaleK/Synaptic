/**
 * Test Script: Async PDF Processing
 *
 * Simulates a PDF upload and triggers the Inngest background job
 * to test the multi-tier processing pipeline
 */

import { inngest } from '../lib/inngest/client'

async function testAsyncProcessing() {
  console.log('🧪 Testing Async PDF Processing...\n')

  // Simulate document metadata (would come from actual upload)
  const testDocument = {
    documentId: 'test-' + Date.now(),
    userId: 'test-user-123',
    fileName: 'test-document.pdf',
    fileType: 'application/pdf',
    fileSize: 1024 * 1024 * 2, // 2MB
    storagePath: 'test-user-123/test-document.pdf'
  }

  console.log('📄 Test Document Metadata:')
  console.log(JSON.stringify(testDocument, null, 2))
  console.log('\n🚀 Sending event to Inngest...\n')

  try {
    // Send the document/process event to Inngest
    const result = await inngest.send({
      name: 'document/process',
      data: testDocument
    })

    console.log('✅ Event sent successfully!')
    console.log('Event IDs:', result.ids)
    console.log('\n📊 Monitor the Inngest Dev Server UI at http://localhost:8288')
    console.log('   to see the job execution in real-time.\n')

    return result
  } catch (error) {
    console.error('❌ Failed to send event:', error)
    throw error
  }
}

// Run the test
testAsyncProcessing()
  .then(() => {
    console.log('✨ Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })
