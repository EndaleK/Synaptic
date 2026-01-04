/**
 * Gemini PDF Text Extractor
 *
 * Uses Google Gemini Vision API for PDF text extraction with built-in OCR
 * Supports very large documents (2M token context = ~1.5M words = ~6,000 pages)
 *
 * Benefits over PyMuPDF:
 * - Built-in OCR for scanned PDFs
 * - Better handling of complex layouts
 * - Can process entire document in one API call
 *
 * Cost: ~$0.35 per 1M input tokens (Gemini 2.0 Flash)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from './logger'

interface GeminiExtractionResult {
  text: string
  pageCount?: number
  method: 'gemini-vision'
  error?: string
}

/**
 * Extract text from PDF using Gemini Vision API
 * @param fileBuffer PDF file as Buffer or Uint8Array
 * @param fileName Original file name for logging
 * @returns Extracted text and metadata
 */
export async function extractPDFWithGemini(
  fileBuffer: Buffer | Uint8Array,
  fileName: string
): Promise<GeminiExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    logger.warn('[Gemini] API key not configured, skipping Gemini extraction')
    return {
      text: '',
      method: 'gemini-vision',
      error: 'GEMINI_API_KEY not configured',
    }
  }

  try {
    logger.info('[Gemini] Starting PDF extraction', {
      fileName,
      fileSize: fileBuffer.length,
    })

    const genAI = new GoogleGenerativeAI(apiKey)

    // Use stable Gemini 2.0 Flash for PDF extraction (cost-effective, 1M context)
    // Note: Using stable release instead of -exp for reliability
    const pdfModel = process.env.GEMINI_PDF_MODEL || 'gemini-2.0-flash'
    logger.info('[Gemini] PDF extraction using model', { model: pdfModel })
    const model = genAI.getGenerativeModel({ model: pdfModel })

    // Convert buffer to base64
    const base64Data = Buffer.from(fileBuffer).toString('base64')

    const prompt = `Extract ALL text content from this PDF document.

Instructions:
- Extract text from every page in order
- Preserve paragraph breaks and structure
- Include headings, body text, lists, tables, and captions
- If text is unclear or image-based, use OCR to extract it
- Do NOT add any commentary or explanations
- Do NOT skip any content
- Output ONLY the extracted text

Begin extraction:`

    const startTime = Date.now()
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      },
      { text: prompt },
    ])
    const duration = Date.now() - startTime
    logger.info('[Gemini] API call completed', { fileName, durationMs: duration })

    const response = await result.response
    const extractedText = response.text()

    if (!extractedText || extractedText.length < 100) {
      logger.warn('[Gemini] Insufficient text extracted', {
        fileName,
        textLength: extractedText?.length || 0,
      })
      return {
        text: extractedText || '',
        method: 'gemini-vision',
        error: 'Insufficient text extracted (< 100 characters)',
      }
    }

    // Clean the extracted text
    const cleanedText = extractedText
      .replace(/\x00/g, '')  // Remove null bytes (PostgreSQL TEXT columns cannot store \u0000)
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Estimate page count based on text length
    // Average PDF page contains ~2000-3000 characters of text
    // Use 2500 as a reasonable middle ground
    const estimatedPageCount = Math.max(1, Math.ceil(cleanedText.length / 2500))

    logger.info('[Gemini] PDF extraction successful', {
      fileName,
      textLength: cleanedText.length,
      estimatedPages: estimatedPageCount,
      method: 'gemini-vision',
    })

    return {
      text: cleanedText,
      pageCount: estimatedPageCount,
      method: 'gemini-vision',
    }
  } catch (error) {
    logger.error('[Gemini] PDF extraction failed', error, {
      fileName,
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    return {
      text: '',
      method: 'gemini-vision',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
