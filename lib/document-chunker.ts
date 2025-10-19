/**
 * Intelligent Document Chunking Utility
 *
 * Splits large documents into optimal chunks for AI processing.
 * Uses smart boundary detection to preserve context and meaning.
 */

export interface ChunkOptions {
  maxChunkSize?: number // Max characters per chunk (default: 40000)
  overlapSize?: number // Overlap between chunks for context (default: 2000)
  preserveStructure?: boolean // Try to split at natural boundaries (default: true)
  targetChunks?: number // Desired number of chunks (optional - AI determines if not set)
}

export interface DocumentChunk {
  index: number // 0-based chunk index
  text: string // The chunk text content
  startChar: number // Start position in original document
  endChar: number // End position in original document
  metadata: {
    wordCount: number
    hasOverlap: boolean
    boundary: 'sentence' | 'paragraph' | 'section' | 'character' // Type of boundary used
  }
}

export interface ChunkingResult {
  chunks: DocumentChunk[]
  totalChunks: number
  originalLength: number
  avgChunkSize: number
  strategy: string // Description of chunking strategy used
}

/**
 * Intelligently chunk a document based on its size and structure
 */
export function chunkDocument(
  text: string,
  options: ChunkOptions = {}
): ChunkingResult {
  const {
    maxChunkSize = 40000,
    overlapSize = 2000,
    preserveStructure = true,
    targetChunks
  } = options

  const originalLength = text.length

  // If document is small enough, return as single chunk
  if (originalLength <= maxChunkSize) {
    return {
      chunks: [{
        index: 0,
        text,
        startChar: 0,
        endChar: originalLength,
        metadata: {
          wordCount: text.split(/\s+/).length,
          hasOverlap: false,
          boundary: 'character'
        }
      }],
      totalChunks: 1,
      originalLength,
      avgChunkSize: originalLength,
      strategy: 'single-chunk (document fits in one chunk)'
    }
  }

  // Determine optimal chunking strategy
  let strategy: string
  let chunks: DocumentChunk[]

  if (targetChunks && targetChunks > 0) {
    // User specified desired number of chunks
    const targetSize = Math.ceil(originalLength / targetChunks)
    chunks = createChunks(text, targetSize, overlapSize, preserveStructure)
    strategy = `fixed-count (${targetChunks} chunks requested)`
  } else {
    // AI-determined optimal chunking
    const optimalChunkCount = determineOptimalChunkCount(text, maxChunkSize)
    const targetSize = Math.ceil(originalLength / optimalChunkCount)
    chunks = createChunks(text, targetSize, overlapSize, preserveStructure)
    strategy = `auto-optimized (${optimalChunkCount} chunks for optimal processing)`
  }

  const avgChunkSize = chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length

  return {
    chunks,
    totalChunks: chunks.length,
    originalLength,
    avgChunkSize: Math.round(avgChunkSize),
    strategy
  }
}

/**
 * Determine optimal number of chunks based on document size and content
 */
function determineOptimalChunkCount(text: string, maxChunkSize: number): number {
  const textLength = text.length

  // Calculate base chunk count
  const baseChunkCount = Math.ceil(textLength / maxChunkSize)

  // Analyze document structure to refine chunk count
  const paragraphCount = (text.match(/\n\n+/g) || []).length + 1
  const sectionCount = (text.match(/\n#{1,6}\s/g) || []).length + 1 // Markdown headers
  const chapterCount = (text.match(/\b(chapter|section|part)\s+\d+/gi) || []).length + 1

  // Prefer natural divisions if they exist
  if (chapterCount > 1 && chapterCount <= baseChunkCount * 1.5) {
    return chapterCount
  }

  if (sectionCount > 1 && sectionCount <= baseChunkCount * 1.5) {
    return Math.min(sectionCount, baseChunkCount + 2)
  }

  // Default to base calculation with slight optimization
  // Round up to nearest multiple of 2 for even distribution
  return Math.ceil(baseChunkCount / 2) * 2
}

/**
 * Create chunks with smart boundary detection
 */
function createChunks(
  text: string,
  targetSize: number,
  overlapSize: number,
  preserveStructure: boolean
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  let currentPos = 0
  let chunkIndex = 0

  while (currentPos < text.length) {
    const endPos = Math.min(currentPos + targetSize, text.length)
    let chunkEnd = endPos
    let boundary: 'sentence' | 'paragraph' | 'section' | 'character' = 'character'

    // Find optimal boundary if preserveStructure is enabled
    if (preserveStructure && endPos < text.length) {
      const searchStart = Math.max(currentPos, endPos - 500) // Look back up to 500 chars
      const searchText = text.substring(searchStart, endPos + 500)

      // Try to find paragraph break (double newline)
      const paragraphBreak = searchText.indexOf('\n\n')
      if (paragraphBreak !== -1 && paragraphBreak > searchText.length * 0.3) {
        chunkEnd = searchStart + paragraphBreak + 2
        boundary = 'paragraph'
      } else {
        // Try to find sentence break
        const sentencePattern = /[.!?]\s+/g
        let lastSentenceEnd = -1
        let match

        while ((match = sentencePattern.exec(searchText)) !== null) {
          if (match.index > searchText.length * 0.5) {
            lastSentenceEnd = match.index + match[0].length
          }
        }

        if (lastSentenceEnd !== -1) {
          chunkEnd = searchStart + lastSentenceEnd
          boundary = 'sentence'
        }
      }
    }

    // Extract chunk text
    const chunkText = text.substring(currentPos, chunkEnd).trim()
    const hasOverlap = chunkIndex > 0

    chunks.push({
      index: chunkIndex,
      text: chunkText,
      startChar: currentPos,
      endChar: chunkEnd,
      metadata: {
        wordCount: chunkText.split(/\s+/).length,
        hasOverlap,
        boundary
      }
    })

    // Move to next chunk with overlap
    currentPos = chunkEnd - (chunkEnd < text.length ? overlapSize : 0)

    // Ensure we make progress even if boundary detection fails
    if (currentPos >= chunkEnd) {
      currentPos = chunkEnd
    }

    chunkIndex++

    // Safety check to prevent infinite loops
    if (chunkIndex > 100) {
      console.warn('Chunking safety limit reached (100 chunks)')
      break
    }
  }

  return chunks
}

/**
 * Merge results from multiple chunks
 * (Used after processing chunks independently)
 */
export function mergeChunkResults<T>(
  chunkResults: T[][],
  deduplicateFn?: (items: T[]) => T[]
): T[] {
  const merged = chunkResults.flat()

  if (deduplicateFn) {
    return deduplicateFn(merged)
  }

  return merged
}

/**
 * Calculate estimated processing time based on chunk count
 */
export function estimateProcessingTime(chunkCount: number, avgTimePerChunk: number = 10): number {
  // avgTimePerChunk in seconds (default 10s per chunk)
  return chunkCount * avgTimePerChunk
}

/**
 * Get chunk summary for logging/UI display
 */
export function getChunkingSummary(result: ChunkingResult): string {
  return `Chunked ${result.originalLength} chars into ${result.totalChunks} chunks (avg ${result.avgChunkSize} chars/chunk) using ${result.strategy}`
}
