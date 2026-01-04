/**
 * Inngest Client Configuration
 *
 * Inngest provides background job processing for long-running tasks
 * like PDF text extraction, RAG indexing, and AI processing.
 *
 * Benefits:
 * - No timeout issues (can run 15+ minutes)
 * - Automatic retries on failure
 * - Built-in observability and monitoring
 * - Scales automatically
 */

import { Inngest } from 'inngest'

// Create Inngest client
export const inngest = new Inngest({
  id: 'synaptic',
  name: 'Synaptic Learning Platform',

  // Event key for secure communication (optional for development)
  // In production, set INNGEST_EVENT_KEY environment variable
  // For local dev with Inngest Dev Server, omit the event key
  ...(process.env.NODE_ENV === 'production' && process.env.INNGEST_EVENT_KEY
    ? { eventKey: process.env.INNGEST_EVENT_KEY }
    : {}),
})

/**
 * Event Types
 *
 * Define all background job event types here for type safety
 */
export type InngestEvents = {
  'document/process': {
    data: {
      documentId: string
      userId: string
      fileName: string
      fileType: string
      fileSize: number
      storagePath: string
    }
  }
  'document/rag-index': {
    data: {
      documentId: string
      userId: string
      text: string
    }
  }
  'document/ocr-request': {
    data: {
      documentId: string
      userId: string
      fileName: string
    }
  }

  // V2 Split Worker Events (for large document indexing)
  'document/index-v2': {
    data: {
      documentId: string
      userId: string
      text: string
    }
  }
  'document/index-priority': {
    data: {
      documentId: string
      userId: string
      chunks: Array<{ text: string; index: number }>
      totalChunks: number
      priorityCount: number
    }
  }
  'document/index-batch': {
    data: {
      documentId: string
      userId: string
      batchIndex: number
      totalBatches: number
      chunks: Array<{ text: string; index: number }>
      startIndex: number
      totalChunks: number
      priorityCount: number
    }
  }
}
