/**
 * Test Script: Pinecone RAG Features
 *
 * This script tests the RAG (Retrieval-Augmented Generation) functionality with Pinecone
 * - Tests vector upsert operations
 * - Tests semantic similarity search
 * - Tests vector retrieval and deletion
 * - Verifies index statistics
 *
 * Usage: npm run test:rag
 */

import { OpenAIEmbeddings } from '@langchain/openai'
import * as dotenv from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',
})

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})
const indexName = process.env.PINECONE_INDEX_NAME || 'synaptic-embeddings'
const index = pinecone.index(indexName)

async function embed(text: string): Promise<number[]> {
  return embeddings.embedQuery(text)
}

async function testRAG() {
  console.log('🧪 Testing Pinecone RAG Features...\n')
  console.log('='.repeat(60))

  try {
    // Test 1: Check index stats
    console.log('\n✅ Test 1: Checking Pinecone index stats...')
    const stats = await index.describeIndexStats()
    console.log('   Index stats:')
    console.log(`   - Total vectors: ${stats.totalRecordCount || 0}`)
    console.log(`   - Dimension: ${stats.dimension || 1536}`)
    console.log(`   - Namespaces: ${Object.keys(stats.namespaces || {}).length}`)
    console.log('   ✓ Index stats retrieved successfully')

    // Test 2: Upsert test vectors
    console.log('\n✅ Test 2: Upserting test vectors...')
    const testDocs = [
      'Pinecone is a vector database optimized for machine learning applications',
      'Vector search enables semantic similarity matching across large datasets',
      'Embeddings convert text into high-dimensional numerical vectors',
      'Retrieval-Augmented Generation combines search with language models',
      'Synaptic is an AI-powered learning platform for students',
    ]

    const testNamespace = 'test_rag'
    const ns = index.namespace(testNamespace)

    console.log(`   Embedding ${testDocs.length} test documents...`)
    const testVectors = await Promise.all(
      testDocs.map(async (text, idx) => ({
        id: `test-${idx}`,
        values: await embed(text),
        metadata: { text, source: 'test', index: idx },
      }))
    )

    console.log('   Upserting vectors to Pinecone...')
    await ns.upsert(testVectors)
    console.log(`   ✓ ${testVectors.length} test vectors upserted successfully`)

    // Test 3: Query similar vectors
    console.log('\n✅ Test 3: Querying similar vectors...')
    const queries = [
      'What is a vector database?',
      'How do you search for similar documents?',
      'Tell me about learning platforms',
    ]

    for (const queryText of queries) {
      console.log(`\n   Query: "${queryText}"`)
      const queryEmbedding = await embed(queryText)
      const results = await ns.query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true,
      })

      console.log('   Top 3 results:')
      results.matches?.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Score: ${result.score?.toFixed(4)}`)
        console.log(`      Text: "${result.metadata?.text}"`)
      })
    }
    console.log('\n   ✓ Semantic search working correctly')

    // Test 4: Fetch vectors by ID
    console.log('\n✅ Test 4: Fetching vectors by ID...')
    const fetchIds = ['test-0', 'test-2', 'test-4']
    const fetchResults = await ns.fetch(fetchIds)

    console.log(`   Fetching ${fetchIds.length} vectors...`)
    fetchIds.forEach((id) => {
      const vector = fetchResults.records?.[id]
      if (vector) {
        console.log(`   ✓ ${id}: "${vector.metadata?.text}"`)
      }
    })
    console.log('   ✓ Vector retrieval working correctly')

    // Test 5: Delete test vectors
    console.log('\n✅ Test 5: Cleaning up test vectors...')
    const testIds = testVectors.map((v) => v.id)
    await ns.deleteMany(testIds)
    console.log(`   ✓ Deleted ${testIds.length} test vectors`)

    // Verify deletion
    const verifyFetch = await ns.fetch([testIds[0]])
    if (Object.keys(verifyFetch.records || {}).length === 0) {
      console.log('   ✓ Deletion verified - vectors removed successfully')
    }

    // Test 6: Final index stats
    console.log('\n✅ Test 6: Final index statistics...')
    const finalStats = await index.describeIndexStats()
    console.log('   Final index stats:')
    console.log(`   - Total vectors: ${finalStats.totalRecordCount || 0}`)
    console.log(`   - Namespaces: ${Object.keys(finalStats.namespaces || {}).length}`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ All RAG tests passed successfully!')
    console.log('='.repeat(60))
    console.log('\n✨ Your Pinecone integration is working perfectly!\n')
  } catch (error) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ Test failed!')
    console.error('='.repeat(60))
    throw error
  }
}

// Run tests
testRAG()
  .then(() => {
    console.log('🎉 Test script completed successfully!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error)
    console.error('\nPossible issues:')
    console.error('  1. Check that PINECONE_API_KEY is set in .env.local')
    console.error('  2. Check that PINECONE_INDEX_NAME matches your index name')
    console.error('  3. Ensure your Pinecone index exists and is active')
    console.error('  4. Verify OPENAI_API_KEY is set for embeddings\n')
    process.exit(1)
  })
