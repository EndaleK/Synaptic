/**
 * Chunked PDF Processing for Very Large Files (>25MB)
 *
 * Strategy: Split PDF into page ranges, process each chunk with Gemini, combine results
 * This bypasses Gemini's ~20MB file size limit while maintaining serverless compatibility
 */

import { extractPDFWithGemini } from './gemini-pdf-extractor'
import { PDFDocument } from 'pdf-lib'

interface ChunkedExtractionResult {
  text: string
  pageCount: number
  chunks: number
  method: 'chunked-gemini'
  error?: string
}

// Progress callback for reporting extraction progress
export type ChunkedProgressCallback = (progress: {
  currentChunk: number
  totalChunks: number
  percentComplete: number
  message: string
}) => Promise<void>

/**
 * Process a large PDF by splitting into chunks and processing separately
 * @param pdfBuffer PDF file as Buffer
 * @param fileName Original filename
 * @param maxChunkSize Maximum size per chunk in MB (default: 15MB to stay under Gemini's 20MB limit)
 */
export async function processLargePDFInChunks(
  pdfBuffer: Buffer,
  fileName: string,
  maxChunkSize: number = 15,
  onProgress?: ChunkedProgressCallback
): Promise<ChunkedExtractionResult> {
  try {
    const fileSizeMB = pdfBuffer.length / (1024 * 1024)
    console.log(`[Chunked Processing] Starting chunked extraction for ${fileName} (${fileSizeMB.toFixed(2)}MB)`)

    // Load the PDF (ignore encryption if present)
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
    const totalPages = pdfDoc.getPageCount()

    console.log(`[Chunked Processing] PDF has ${totalPages} pages`)

    // Calculate chunk size (pages per chunk)
    // Estimate: ~100KB per page average, so for 15MB chunks = ~150 pages
    const avgPageSize = pdfBuffer.length / totalPages
    const pagesPerChunk = Math.max(
      10, // Minimum 10 pages per chunk
      Math.floor((maxChunkSize * 1024 * 1024) / avgPageSize)
    )

    console.log(`[Chunked Processing] Processing ~${pagesPerChunk} pages per chunk`)

    // Calculate total chunks upfront for progress reporting
    const totalChunks = Math.ceil(totalPages / pagesPerChunk)

    // Prepare all chunks first (fast, just splitting PDF)
    console.log(`[Chunked Processing] Preparing ${totalChunks} chunks...`)
    const chunkBuffers: { chunkNumber: number; buffer: Buffer; startPage: number; endPage: number }[] = []

    for (let startPage = 0; startPage < totalPages; startPage += pagesPerChunk) {
      const chunkNumber = Math.floor(startPage / pagesPerChunk) + 1
      const endPage = Math.min(startPage + pagesPerChunk, totalPages)

      const chunkPdf = await PDFDocument.create()
      const copiedPages = await chunkPdf.copyPages(pdfDoc, Array.from(
        { length: endPage - startPage },
        (_, i) => startPage + i
      ))
      copiedPages.forEach(page => chunkPdf.addPage(page))
      const chunkBuffer = Buffer.from(await chunkPdf.save())

      chunkBuffers.push({ chunkNumber, buffer: chunkBuffer, startPage, endPage })
      console.log(`[Chunked Processing] Prepared chunk ${chunkNumber}: ${(chunkBuffer.length / 1024 / 1024).toFixed(2)}MB`)
    }

    // Process chunks in parallel batches of 3 for speed (Gemini can handle concurrent requests)
    const CONCURRENT_CHUNKS = 3
    const chunks: string[] = new Array(totalChunks).fill('')
    let processedChunks = 0

    for (let i = 0; i < chunkBuffers.length; i += CONCURRENT_CHUNKS) {
      const batch = chunkBuffers.slice(i, i + CONCURRENT_CHUNKS)

      // Report progress before batch
      if (onProgress) {
        const percentComplete = Math.round(30 + (processedChunks / totalChunks) * 30)
        await onProgress({
          currentChunk: processedChunks + 1,
          totalChunks,
          percentComplete,
          message: `Extracting text: chunks ${processedChunks + 1}-${Math.min(processedChunks + batch.length, totalChunks)} of ${totalChunks}...`
        })
      }

      console.log(`[Chunked Processing] Processing batch: chunks ${batch[0].chunkNumber}-${batch[batch.length - 1].chunkNumber} in parallel`)

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async ({ chunkNumber, buffer, startPage, endPage }) => {
          try {
            const result = await extractPDFWithGemini(buffer, `${fileName}_chunk_${chunkNumber}`)
            if (result.error || !result.text) {
              console.warn(`[Chunked Processing] Chunk ${chunkNumber} failed: ${result.error}`)
              return { chunkNumber, text: `[Chunk ${chunkNumber} extraction failed]\n\n` }
            }
            console.log(`[Chunked Processing] Chunk ${chunkNumber} extracted ${result.text.length} chars`)
            return { chunkNumber, text: result.text }
          } catch (err) {
            console.error(`[Chunked Processing] Chunk ${chunkNumber} error:`, err)
            return { chunkNumber, text: `[Chunk ${chunkNumber} error]\n\n` }
          }
        })
      )

      // Store results in order
      for (const { chunkNumber, text } of batchResults) {
        chunks[chunkNumber - 1] = text
        processedChunks++
      }
    }

    // Combine all chunks
    const combinedText = chunks.join('\n\n--- Page Break ---\n\n')

    console.log(`[Chunked Processing] Completed! Total: ${combinedText.length} characters from ${totalChunks} chunks`)

    return {
      text: combinedText,
      pageCount: totalPages,
      chunks: totalChunks,
      method: 'chunked-gemini'
    }

  } catch (error) {
    console.error('[Chunked Processing] Fatal error:', error)
    return {
      text: '',
      pageCount: 0,
      chunks: 0,
      method: 'chunked-gemini',
      error: error instanceof Error ? error.message : 'Unknown error during chunked processing'
    }
  }
}
