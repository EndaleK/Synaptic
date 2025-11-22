// Server-side PDF text extraction with multi-tier fallback:
// 1. pdf-parse (fast, Mozilla PDF.js based)
// 2. PyMuPDF (robust, handles complex PDFs)
// 3. Gemini Vision (OCR, handles scanned PDFs and very large files)

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { extractPDFWithGemini } from './gemini-pdf-extractor'
import { processLargePDFInChunks } from './chunked-pdf-processor'

const execAsync = promisify(exec)

interface PageData {
  pageNumber: number
  text: string
  startOffset: number
  endOffset: number
}

interface PDFParseResult {
  text: string
  pageCount?: number
  pages?: PageData[]  // NEW: per-page data with character offsets
  error?: string
  method?: 'pdf-parse' | 'pymupdf' | 'gemini-vision' | 'chunked-gemini'
}

// Helper: Create timeout promise that rejects after specified milliseconds
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`PDF parsing timeout after ${ms / 1000}s. This PDF is too complex or large for fast parsing. Please try a smaller file or contact support.`))
    }, ms)
  })
}

// Perform pdf-parse extraction with better error handling
async function parsePDFWithPdfParse(buffer: Buffer): Promise<PDFParseResult> {
  try {
    // Use require() with default export handling for Node.js runtime
    const pdfParseModule = require('pdf-parse')
    const pdfParse = pdfParseModule.default || pdfParseModule

    console.log(`Starting pdf-parse extraction (buffer size: ${buffer.length} bytes)...`)

    const data = await pdfParse(buffer, {
      // Options for better performance
      max: 0, // Parse all pages (0 = no limit)
      version: 'v2.0.550' // Use specific PDF.js version for consistency
    })

    const extractedText = data.text
    const pageCount = data.numpages

    console.log(`✅ Extracted ${extractedText.length} characters from ${pageCount} pages`)

    // Check if we got any text
    if (!extractedText || extractedText.trim().length === 0) {
      return {
        text: "",
        pageCount,
        error: "No text could be extracted from this PDF. It might be a scanned document or contain only images. Consider using OCR software to convert it to text first."
      }
    }

    // Clean up the extracted text but DO NOT truncate - RAG systems handle large documents
    let cleanedText = extractedText
      .replace(/\x00/g, '')  // Remove null bytes (PostgreSQL TEXT columns cannot store \u0000)
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .trim()

    console.log(`📊 Cleaned text: ${cleanedText.length} characters (will be stored in full for RAG)`)

    return {
      text: cleanedText,
      pageCount,
      error: undefined,
      method: 'pdf-parse'
    }

  } catch (error: unknown) {
    console.error('pdf-parse extraction error:', error)

    // Handle specific error types
    if (error.message?.includes('password') || error.message?.includes('encrypted')) {
      return {
        text: "",
        error: "This PDF appears to be password-protected or encrypted. Please unlock it before uploading."
      }
    }

    if (error.message?.includes('Invalid PDF')) {
      return {
        text: "",
        error: "This file appears to be corrupted or is not a valid PDF. Please check the file and try again."
      }
    }

    return {
      text: "",
      error: `Unable to parse PDF: ${error.message || 'Unknown error'}. You can still use the PDF viewer mode to read the document.`
    }
  }
}

// Fallback: PyMuPDF extraction (more robust for complex PDFs)
export async function parsePDFWithPyMuPDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    console.log('🐍 Attempting PyMuPDF extraction (fallback)...')

    // Save buffer to temp file
    const tempFilePath = path.join('/tmp', `pdf-extract-${Date.now()}.pdf`)
    fs.writeFileSync(tempFilePath, buffer)

    try {
      // Get project root directory
      const projectRoot = process.cwd()
      const venvPython = path.join(projectRoot, 'venv', 'bin', 'python3')
      const scriptPath = path.join(projectRoot, 'scripts', 'extract-pdf-pymupdf.py')

      // Check if venv Python exists, otherwise use system Python
      const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3'

      console.log(`🐍 Running PyMuPDF script: ${pythonCmd} ${scriptPath}`)

      // Call Python script with timeout
      const { stdout, stderr } = await execAsync(
        `${pythonCmd} "${scriptPath}" "${tempFilePath}"`,
        {
          timeout: 480000, // 8 minutes
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large text output
        }
      )

      // Parse JSON response
      const result = JSON.parse(stdout)

      if (result.success && result.text) {
        console.log(`✅ PyMuPDF extracted ${result.text.length} characters from ${result.pageCount} pages${result.pages ? ` (with per-page data: ${result.pages.length} pages)` : ''}`)

        // Clean text but DO NOT truncate - RAG systems (ChromaDB/Gemini) handle large documents
        let cleanedText = result.text
          .replace(/\x00/g, '')  // Remove null bytes (PostgreSQL TEXT columns cannot store \u0000)
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        console.log(`📊 Cleaned text: ${cleanedText.length} characters (will be stored in full for RAG)`)

        return {
          text: cleanedText,
          pageCount: result.pageCount,
          pages: result.pages,  // Pass through page data
          method: 'pymupdf',
          error: undefined
        }
      } else {
        console.error('❌ PyMuPDF extraction failed:', result.error)
        return {
          text: "",
          error: result.error,
          method: 'pymupdf'
        }
      }
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    }
  } catch (error: unknown) {
    console.error('❌ PyMuPDF subprocess error:', error)
    return {
      text: "",
      error: `PyMuPDF extraction failed: ${error.message || 'Unknown error'}`,
      method: 'pymupdf'
    }
  }
}

export async function parseServerPDF(file: File): Promise<PDFParseResult> {
  try {
    const fileSizeMB = file.size / (1024 * 1024)
    console.log(`📄 Server PDF parsing: ${file.name}, size: ${file.size} bytes (${fileSizeMB.toFixed(2)} MB)`)

    // Check file size limit (500MB max for server processing)
    if (file.size > 500 * 1024 * 1024) {
      return {
        text: "",
        error: "PDF file is too large for server processing (max 500MB). Please use the PDF viewer mode to read the document, or try splitting it into smaller sections."
      }
    }

    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Smart routing based on file size:
    // - Small files (<10MB): Try pdf-parse → PyMuPDF → Gemini
    // - Medium files (10-80MB): Try Gemini with chunking (serverless-friendly, has OCR)
    // - Large files (80MB+): PyMuPDF only (requires local Python, most reliable for very large files)
    // - Very large files (100MB+): Requires async processing (Inngest)

    const isSmallFile = file.size < 10 * 1024 * 1024
    const isMediumFile = file.size >= 10 * 1024 * 1024 && file.size < 80 * 1024 * 1024
    const isLargeFile = file.size >= 80 * 1024 * 1024

    // For medium files (10-60MB), try Gemini with chunking for large files
    if (isMediumFile && process.env.GEMINI_API_KEY) {
      // For files >25MB, use chunked processing to bypass Gemini's file size limit
      if (file.size > 25 * 1024 * 1024) {
        console.log(`🤖 Large file detected (${fileSizeMB.toFixed(2)}MB), using chunked Gemini extraction...`)
        const chunkedResult = await processLargePDFInChunks(buffer, file.name)

        if (!chunkedResult.error && chunkedResult.text && chunkedResult.text.length > 1000) {
          console.log(`✅ Chunked Gemini extraction successful: ${chunkedResult.text.length} chars from ${chunkedResult.chunks} chunks`)
          return {
            text: chunkedResult.text,
            pageCount: chunkedResult.pageCount,
            method: 'chunked-gemini' as any
          }
        }

        console.warn(`⚠️ Chunked Gemini extraction failed: ${chunkedResult.error}, trying PyMuPDF fallback...`)
      } else {
        // For files 10-25MB, use direct Gemini extraction
        console.log('🤖 Medium-sized file detected (10-25MB), trying Gemini Vision API...')
        const geminiResult = await extractPDFWithGemini(buffer, file.name)

        // Validate extraction quality (should extract at least 1% of file size as text)
        const minExpectedChars = Math.max(1000, file.size * 0.01 / 10) // ~1% of file size (rough estimate)
        const isGoodExtraction = !geminiResult.error && geminiResult.text && geminiResult.text.length > minExpectedChars

        if (isGoodExtraction) {
          console.log('✅ Gemini extraction successful with good quality')
          return geminiResult
        }

        if (geminiResult.text && geminiResult.text.length > 100) {
          console.warn(`⚠️ Gemini extraction suspicious (only ${geminiResult.text.length} chars from ${fileSizeMB.toFixed(2)}MB file), trying PyMuPDF...`)
        } else {
          console.warn('⚠️ Gemini extraction failed, falling back to PyMuPDF...')
        }
      }
    }

    // For large files (>60MB), skip pdf-parse, go directly to PyMuPDF
    if (isLargeFile) {
      console.log(`📦 Large file detected (${fileSizeMB.toFixed(2)}MB), using PyMuPDF directly (most reliable for large files)...`)
      const pymupdfResult = await parsePDFWithPyMuPDF(buffer)

      if (!pymupdfResult.error && pymupdfResult.text && pymupdfResult.text.length > 100) {
        console.log('✅ PyMuPDF extraction successful for large file')
        return pymupdfResult
      }

      // PyMuPDF failed - try Gemini as fallback if file isn't too large (Gemini tested up to ~60MB)
      if (process.env.GEMINI_API_KEY && file.size < 70 * 1024 * 1024) {
        console.warn(`⚠️ PyMuPDF failed for large file (${fileSizeMB.toFixed(2)}MB), trying Gemini Vision as fallback...`)
        const geminiResult = await extractPDFWithGemini(buffer, file.name)

        if (!geminiResult.error && geminiResult.text && geminiResult.text.length > 100) {
          console.log('✅ Gemini extraction successful (fallback for large file)')
          return geminiResult
        }
      }

      // All methods failed - return error (don't try pdf-parse for large files, it will timeout)
      return {
        text: "",
        error: `Failed to extract text from large PDF (${fileSizeMB.toFixed(2)}MB). ${pymupdfResult.error || 'Unknown error'}. The file may be scanned or contain only images. Consider using OCR software.`
      }
    }

    // Multi-tier extraction strategy for small files (<10MB):
    // 1. Try pdf-parse first (fast, works for most PDFs)
    // 2. If pdf-parse fails, try PyMuPDF (robust, handles complex PDFs)
    // 3. If PyMuPDF fails AND file is small enough (<15MB), try Gemini (OCR, handles scanned PDFs)
    console.log(`⏱️ Starting pdf-parse with ${isSmallFile ? '3' : '8'}-minute timeout...`)

    try {
      const timeout = isSmallFile ? 180000 : 480000 // 3 minutes for small files, 8 for medium
      const result = await Promise.race([
        parsePDFWithPdfParse(buffer),
        createTimeoutPromise(timeout)
      ])

      // Check if pdf-parse succeeded
      if (!result.error && result.text && result.text.length > 100) {
        console.log('✅ pdf-parse completed successfully')
        return { ...result, method: 'pdf-parse' }
      }

      // pdf-parse failed - try PyMuPDF as fallback
      console.warn('⚠️ pdf-parse failed or returned no text, trying PyMuPDF fallback...')
      const pymupdfResult = await parsePDFWithPyMuPDF(buffer)

      if (!pymupdfResult.error && pymupdfResult.text && pymupdfResult.text.length > 100) {
        return pymupdfResult
      }

      // PyMuPDF failed - try Gemini as final fallback (only for small files <15MB due to API limit)
      if (process.env.GEMINI_API_KEY && file.size < 15 * 1024 * 1024) {
        console.warn('⚠️ PyMuPDF failed or returned no text, trying Gemini Vision as final fallback...')
        const geminiResult = await extractPDFWithGemini(buffer, file.name)

        if (!geminiResult.error && geminiResult.text && geminiResult.text.length > 100) {
          console.log('✅ Gemini extraction successful (fallback)')
          return geminiResult
        }
      } else if (file.size >= 15 * 1024 * 1024) {
        console.warn(`⚠️ File too large for Gemini fallback (${fileSizeMB.toFixed(2)}MB > 15MB limit)`)
      }

      // All methods failed - return the original pdf-parse error
      return result

    } catch (parseError) {
      // pdf-parse threw an error - try PyMuPDF as fallback
      console.error('❌ pdf-parse error:', parseError)
      console.log('🔄 Attempting PyMuPDF fallback...')

      try {
        const pymupdfResult = await parsePDFWithPyMuPDF(buffer)

        if (!pymupdfResult.error && pymupdfResult.text && pymupdfResult.text.length > 100) {
          return pymupdfResult
        }

        // PyMuPDF failed - try Gemini as final fallback (only for small files <15MB)
        if (process.env.GEMINI_API_KEY && file.size < 15 * 1024 * 1024) {
          console.warn('⚠️ PyMuPDF failed, trying Gemini Vision as final fallback...')
          const geminiResult = await extractPDFWithGemini(buffer, file.name)

          if (!geminiResult.error && geminiResult.text && geminiResult.text.length > 100) {
            console.log('✅ Gemini extraction successful (final fallback)')
            return geminiResult
          }

          // All three methods failed
          return {
            text: "",
            error: `All extraction methods failed. pdf-parse: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. PyMuPDF: ${pymupdfResult.error}. Gemini: ${geminiResult.error}`
          }
        } else if (file.size >= 15 * 1024 * 1024) {
          console.warn(`⚠️ File too large for Gemini fallback (${fileSizeMB.toFixed(2)}MB > 15MB limit)`)
        }

        // Gemini not available - return PyMuPDF error
        return {
          text: "",
          error: `Both extraction methods failed. pdf-parse: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. PyMuPDF: ${pymupdfResult.error}`
        }
      } catch (pymupdfError) {
        // PyMuPDF threw an error - try Gemini if available (only for small files <15MB)
        if (process.env.GEMINI_API_KEY && file.size < 15 * 1024 * 1024) {
          console.warn('⚠️ PyMuPDF error, trying Gemini Vision as final fallback...')
          const geminiResult = await extractPDFWithGemini(buffer, file.name)

          if (!geminiResult.error && geminiResult.text && geminiResult.text.length > 100) {
            console.log('✅ Gemini extraction successful (final fallback after errors)')
            return geminiResult
          }

          // All three methods failed
          return {
            text: "",
            error: `All extraction methods failed. pdf-parse: ${parseError instanceof Error ? parseError.message : 'Unknown'}. PyMuPDF: ${pymupdfError instanceof Error ? pymupdfError.message : 'Unknown'}. Gemini: ${geminiResult.error}`
          }
        } else if (file.size >= 15 * 1024 * 1024) {
          console.warn(`⚠️ File too large for Gemini fallback (${fileSizeMB.toFixed(2)}MB > 15MB limit)`)
        }

        // Gemini not available or file too large
        return {
          text: "",
          error: `PDF parsing failed. pdf-parse: ${parseError instanceof Error ? parseError.message : 'Unknown'}. PyMuPDF: ${pymupdfError instanceof Error ? pymupdfError.message : 'Unknown'}`
        }
      }
    }

  } catch (error) {
    console.error("❌ Server PDF parsing error:", error)
    return {
      text: "",
      error: `Unable to process PDF on the server: ${error instanceof Error ? error.message : 'Unknown error'}. Please try using the PDF viewer mode to read the document.`
    }
  }
}

// Utility function to detect if a file is a PDF
export function isPDFFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')
}
