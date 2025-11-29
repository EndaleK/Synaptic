/**
 * Migration Script: ChromaDB → Pinecone
 *
 * This script migrates all vector embeddings from ChromaDB to Pinecone
 * - Reads all collections from ChromaDB
 * - Transfers vectors with metadata to Pinecone namespaces
 * - Preserves document structure and chunk organization
 *
 * Usage: npm run migrate:pinecone
 */

import { ChromaClient } from 'chromadb'
import { Pinecone } from '@pinecone-database/pinecone'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function migrateEmbeddings() {
  console.log('🚀 Starting migration from ChromaDB to Pinecone...\n')

  // Validate environment variables
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is not set in .env.local')
  }
  if (!process.env.CHROMA_URL) {
    console.warn('⚠️  CHROMA_URL not set, using default: http://localhost:8000')
  }

  // Initialize ChromaDB client
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000'
  console.log(`📦 Connecting to ChromaDB at ${chromaUrl}...`)
  const chroma = new ChromaClient({
    path: chromaUrl,
  })

  // Initialize Pinecone
  console.log(`📦 Connecting to Pinecone...`)
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  })
  const indexName = process.env.PINECONE_INDEX_NAME || 'synaptic-embeddings'
  const index = pinecone.index(indexName)

  try {
    // Get Pinecone index stats before migration
    console.log('\n📊 Pinecone Index Stats (Before Migration):')
    const statsBefore = await index.describeIndexStats()
    console.log(`  Total vectors: ${statsBefore.totalRecordCount || 0}`)
    console.log(`  Namespaces: ${Object.keys(statsBefore.namespaces || {}).length}`)

    // Get all collections from ChromaDB
    console.log('\n🔍 Discovering ChromaDB collections...')
    const collections = await chroma.listCollections()
    console.log(`  Found ${collections.length} collections\n`)

    if (collections.length === 0) {
      console.log('✅ No collections to migrate. ChromaDB is empty.')
      return
    }

    let totalVectorsMigrated = 0
    let totalCollectionsMigrated = 0

    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      console.log(`\n📁 Migrating collection: ${collectionName}`)

      try {
        const chromaCollection = await chroma.getCollection({
          name: collectionName,
        })

        // Get all items from the collection
        const results = await chromaCollection.get()

        if (!results.ids || results.ids.length === 0) {
          console.log(`  ⏭️  No documents found, skipping...`)
          continue
        }

        console.log(`  Found ${results.ids.length} vectors to migrate`)

        // Extract document ID from collection name (format: doc_<documentId>)
        const documentId = collectionName.replace(/^doc_/, '').replace(/_/g, '-')
        const namespace = collectionName // Use collection name as namespace

        // Prepare vectors for Pinecone
        const vectors = results.ids.map((id, idx) => ({
          id: String(id),
          values: results.embeddings![idx],
          metadata: {
            text: results.documents?.[idx] || '',
            chunkText: results.documents?.[idx] || '',
            documentId: documentId,
            collection: collectionName,
            ...(results.metadatas?.[idx] || {}),
          },
        }))

        // Upsert in batches of 100 (Pinecone recommended batch size)
        const batchSize = 100
        const ns = index.namespace(namespace)

        for (let i = 0; i < vectors.length; i += batchSize) {
          const batch = vectors.slice(i, i + batchSize)
          await ns.upsert(batch)

          const progress = Math.min(i + batchSize, vectors.length)
          console.log(`  ⬆️  Migrated ${progress}/${vectors.length} vectors`)
        }

        totalVectorsMigrated += vectors.length
        totalCollectionsMigrated++
        console.log(`  ✅ Successfully migrated ${collectionName}`)
      } catch (error) {
        console.error(`  ❌ Error migrating ${collectionName}:`, error)
        // Continue with next collection
      }
    }

    // Verify migration
    console.log('\n📊 Pinecone Index Stats (After Migration):')
    const statsAfter = await index.describeIndexStats()
    console.log(`  Total vectors: ${statsAfter.totalRecordCount || 0}`)
    console.log(`  Namespaces: ${Object.keys(statsAfter.namespaces || {}).length}`)

    console.log('\n' + '='.repeat(50))
    console.log('✅ Migration completed successfully!')
    console.log('='.repeat(50))
    console.log(`📊 Summary:`)
    console.log(`  Collections migrated: ${totalCollectionsMigrated}/${collections.length}`)
    console.log(`  Total vectors migrated: ${totalVectorsMigrated}`)
    console.log(`  Vectors added to Pinecone: ${(statsAfter.totalRecordCount || 0) - (statsBefore.totalRecordCount || 0)}`)
    console.log('='.repeat(50))
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateEmbeddings()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error)
    process.exit(1)
  })
