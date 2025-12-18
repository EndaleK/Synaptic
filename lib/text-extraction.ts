/**
 * Text Extraction Utility
 *
 * Accurate page-based text extraction from documents
 * Handles multiple storage locations (R2, Supabase, database)
 */

import { createClient } from '@/lib/supabase/server'
import type { PageRange } from '@/lib/types'

interface ExtractionOptions {
  maxLength?: number // Maximum characters to return (default: 48000)
  joinSeparator?: string // How to join multiple pages (default: '\n\n')
}

/**
 * Extract text from specific page ranges
 *
 * Strategy:
 * 1. Try using metadata.pages (from pdf-parse) for precise extraction
 * 2. Fallback to R2 full text if available
 * 3. Fallback to database extracted_text with heuristic splitting
 */
export async function extractTextFromPages(
  documentId: string,
  pageRanges: PageRange[],
  options: ExtractionOptions = {}
): Promise<string> {
  const {
    maxLength = 48000,
    joinSeparator = '\n\n'
  } = options

  const supabase = await createClient()

  // Get document from database
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (docError || !document) {
    throw new Error(`Document not found: ${documentId}`)
  }

  let extractedText = ''

  // Strategy 1: Use metadata.pages for precise extraction
  if (document.metadata?.pages && Array.isArray(document.metadata.pages)) {
    const allPageNumbers = pageRanges.flatMap(range =>
      Array.from(
        { length: range.end - range.start + 1 },
        (_, i) => range.start + i
      )
    )

    const pages = document.metadata.pages.filter(
      (p: any) => allPageNumbers.includes(p.pageNumber)
    )

    if (pages.length > 0) {
      extractedText = pages
        .map((p: any) => p.text || '')
        .join(joinSeparator)

      return extractedText.substring(0, maxLength)
    }
  }

  // Strategy 2: Load from R2 if available
  if (document.metadata?.r2_url || document.metadata?.r2_text_key) {
    try {
      const fullText = await loadTextFromR2(document.metadata.r2_text_key || document.metadata.r2_url)
      if (fullText) {
        extractedText = extractPagesFromFullText(fullText, pageRanges, document.metadata?.page_count || 100)
        return extractedText.substring(0, maxLength)
      }
    } catch (error) {
      console.warn('Failed to load from R2, falling back to database:', error)
    }
  }

  // Strategy 3: Fallback to database text with heuristic splitting
  const fullText = document.extracted_text || ''
  if (fullText) {
    extractedText = extractPagesFromFullText(fullText, pageRanges, document.metadata?.page_count || 100)

    // Smart expansion: if extracted text is too small, expand the page range
    const MIN_CONTENT_LENGTH = 5000 // Minimum 5000 chars for meaningful flashcard generation

    if (extractedText.length < MIN_CONTENT_LENGTH && pageRanges.length > 0) {
      console.log(`⚠️ Extracted text too small (${extractedText.length} chars), expanding page range...`)

      // Expand the range by adding more pages
      const expandedRanges = expandPageRanges(pageRanges, document.metadata?.page_count || 100)
      extractedText = extractPagesFromFullText(fullText, expandedRanges, document.metadata?.page_count || 100)

      console.log(`✅ Expanded to ${expandedRanges[0].end - expandedRanges[0].start + 1} pages, got ${extractedText.length} chars`)
    }

    return extractedText.substring(0, maxLength)
  }

  throw new Error('No text content available for extraction')
}

/**
 * Extract text from multiple sections (from book structure)
 */
export async function extractTextFromSections(
  documentId: string,
  sectionIds: string[],
  options: ExtractionOptions = {}
): Promise<string> {
  const supabase = await createClient()

  // Get document with book structure
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('book_structure, metadata, extracted_text')
    .eq('id', documentId)
    .single()

  if (docError || !document) {
    throw new Error(`Document not found: ${documentId}`)
  }

  const bookStructure = document.book_structure as any

  if (!bookStructure) {
    throw new Error('Document has no book structure')
  }

  // Find sections by ID and collect page ranges
  const pageRanges: PageRange[] = []

  // Helper to recursively find sections
  const findSections = (sections: any[], ids: string[]): void => {
    for (const section of sections) {
      if (ids.includes(section.id)) {
        pageRanges.push(section.pageRange)
      }
      if (section.sections && Array.isArray(section.sections)) {
        findSections(section.sections, ids)
      }
    }
  }

  // Search in all structure types
  if (bookStructure.toc?.chapters) {
    findSections(bookStructure.toc.chapters, sectionIds)
  }
  if (bookStructure.index?.entries) {
    findSections(bookStructure.index.entries, sectionIds)
  }
  if (bookStructure.bookmarks?.bookmarks) {
    findSections(bookStructure.bookmarks.bookmarks, sectionIds)
  }
  if (bookStructure.headings?.headings) {
    findSections(bookStructure.headings.headings, sectionIds)
  }

  if (pageRanges.length === 0) {
    throw new Error(`No sections found with IDs: ${sectionIds.join(', ')}`)
  }

  // Extract text from collected page ranges
  return extractTextFromPages(documentId, pageRanges, options)
}

/**
 * Extract text from a suggestion
 */
export async function extractTextFromSuggestion(
  documentId: string,
  suggestionId: string,
  contentType: 'flashcards' | 'podcasts' | 'mindmaps',
  options: ExtractionOptions = {}
): Promise<string> {
  const supabase = await createClient()

  // Get document with AI suggestions
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('ai_suggestions, book_structure')
    .eq('id', documentId)
    .single()

  if (docError || !document) {
    throw new Error(`Document not found: ${documentId}`)
  }

  const aiSuggestions = document.ai_suggestions as any

  if (!aiSuggestions || !aiSuggestions[contentType]) {
    throw new Error(`No ${contentType} suggestions found for this document`)
  }

  // Find suggestion by ID (use sectionId as the identifier)
  const suggestion = aiSuggestions[contentType].find(
    (s: any) => s.sectionId === suggestionId
  )

  if (!suggestion) {
    throw new Error(`Suggestion not found: ${suggestionId}`)
  }

  // Extract text from suggestion's page range
  return extractTextFromPages(documentId, [suggestion.pageRange], options)
}

/**
 * Expand page ranges when content is insufficient
 * Adds 20 pages to each range to ensure adequate content
 */
function expandPageRanges(pageRanges: PageRange[], totalPages: number): PageRange[] {
  return pageRanges.map(range => {
    const rangeSize = range.end - range.start + 1
    const EXPANSION_PAGES = Math.max(20, rangeSize * 2) // At least 20 pages, or double the current range

    return {
      start: range.start,
      end: Math.min(range.end + EXPANSION_PAGES, totalPages)
    }
  })
}

/**
 * Heuristic page extraction from full text
 * Uses average page length estimation
 */
function extractPagesFromFullText(
  fullText: string,
  pageRanges: PageRange[],
  totalPages: number
): string {
  // Average academic PDF page ≈ 3000-4000 characters
  const avgPageLength = Math.floor(fullText.length / totalPages)

  const extractedChunks: string[] = []

  for (const range of pageRanges) {
    const startChar = (range.start - 1) * avgPageLength
    const endChar = range.end * avgPageLength

    const chunk = fullText.substring(
      Math.max(0, startChar),
      Math.min(endChar, fullText.length)
    )

    if (chunk.trim()) {
      extractedChunks.push(chunk.trim())
    }
  }

  return extractedChunks.join('\n\n')
}

/**
 * Load full text from R2 storage
 */
async function loadTextFromR2(r2Key: string): Promise<string | null> {
  // Skip if R2 is not configured
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.warn('R2 storage not configured, skipping R2 text loading')
    return null
  }

  try {
    const { downloadFromR2AsBuffer, fileExistsInR2 } = await import('@/lib/r2-storage')

    // Handle both URL format and key format
    let key = r2Key
    if (r2Key.startsWith('http')) {
      // Extract key from URL (e.g., https://bucket.r2.cloudflarestorage.com/path/to/file.txt -> path/to/file.txt)
      const url = new URL(r2Key)
      key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
    }

    // Check if file exists first
    const exists = await fileExistsInR2(key)
    if (!exists) {
      console.warn(`R2 text file not found: ${key}`)
      return null
    }

    // Download the text file
    const buffer = await downloadFromR2AsBuffer(key)
    const text = buffer.toString('utf-8')

    console.log(`✅ Loaded ${text.length} characters from R2: ${key}`)
    return text
  } catch (error) {
    console.error('Failed to load text from R2:', error)
    return null
  }
}
