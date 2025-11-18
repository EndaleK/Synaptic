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

/**
 * Process a large PDF by splitting into chunks and processing separately
 * @param pdfBuffer PDF file as Buffer
 * @param fileName Original filename
 * @param maxChunkSize Maximum size per chunk in MB (default: 15MB to stay under Gemini's 20MB limit)
 */
export async function processLargePDFInChunks(
  pdfBuffer: Buffer,
  fileName: string,
  maxChunkSize: number = 15
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

    const chunks: string[] = []
    let chunkNumber = 0

    // Process PDF in chunks
    for (let startPage = 0; startPage < totalPages; startPage += pagesPerChunk) {
      chunkNumber++
      const endPage = Math.min(startPage + pagesPerChunk, totalPages)

      console.log(`[Chunked Processing] Processing chunk ${chunkNumber}: pages ${startPage + 1}-${endPage}`)

      try {
        // Create a new PDF with just this page range
        const chunkPdf = await PDFDocument.create()
        const copiedPages = await chunkPdf.copyPages(pdfDoc, Array.from(
          { length: endPage - startPage },
          (_, i) => startPage + i
        ))

        copiedPages.forEach(page => chunkPdf.addPage(page))

        // Save chunk to buffer
        const chunkBuffer = Buffer.from(await chunkPdf.save())
        const chunkSizeMB = chunkBuffer.length / (1024 * 1024)

        console.log(`[Chunked Processing] Chunk ${chunkNumber} size: ${chunkSizeMB.toFixed(2)}MB`)

        // Extract text from this chunk using Gemini
        const chunkResult = await extractPDFWithGemini(
          chunkBuffer,
          `${fileName}_chunk_${chunkNumber}`
        )

        if (chunkResult.error || !chunkResult.text) {
          console.warn(`[Chunked Processing] Chunk ${chunkNumber} extraction failed: ${chunkResult.error}`)
          // Continue with other chunks even if one fails
          chunks.push(`[Chunk ${chunkNumber} extraction failed: ${chunkResult.error}]\n\n`)
        } else {
          console.log(`[Chunked Processing] Chunk ${chunkNumber} extracted ${chunkResult.text.length} characters`)
          chunks.push(chunkResult.text)
        }

      } catch (chunkError) {
        console.error(`[Chunked Processing] Error processing chunk ${chunkNumber}:`, chunkError)
        chunks.push(`[Chunk ${chunkNumber} processing error]\n\n`)
      }
    }

    // Combine all chunks
    const combinedText = chunks.join('\n\n--- Page Break ---\n\n')

    console.log(`[Chunked Processing] Completed! Total: ${combinedText.length} characters from ${chunkNumber} chunks`)

    return {
      text: combinedText,
      pageCount: totalPages,
      chunks: chunkNumber,
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
