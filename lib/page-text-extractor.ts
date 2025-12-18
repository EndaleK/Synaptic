/**
 * Page-Based Text Extraction Utility
 *
 * Extracts text from a document based on page ranges.
 * Uses character position estimation based on page count.
 */

/**
 * Extract text from a document by page range
 * Uses character position estimation based on total page count
 *
 * @param fullText - The complete document text
 * @param startPage - Starting page number (1-indexed)
 * @param endPage - Ending page number (1-indexed, inclusive)
 * @param totalPages - Total number of pages in the document
 * @returns Extracted text for the specified page range
 */
export function extractTextByPageRange(
  fullText: string,
  startPage: number,
  endPage: number,
  totalPages: number
): string {
  if (!fullText || fullText.length === 0) {
    return ''
  }

  // Validate page numbers
  const validStartPage = Math.max(1, Math.min(startPage, totalPages))
  const validEndPage = Math.max(validStartPage, Math.min(endPage, totalPages))

  // If requesting entire document, return as-is
  if (validStartPage === 1 && validEndPage >= totalPages) {
    return fullText
  }

  // Calculate characters per page
  const charsPerPage = Math.ceil(fullText.length / totalPages)

  // Calculate character positions (0-indexed)
  const startChar = (validStartPage - 1) * charsPerPage
  const endChar = Math.min(validEndPage * charsPerPage, fullText.length)

  // Extract the text
  let extractedText = fullText.substring(startChar, endChar)

  // Try to find cleaner boundaries (avoid cutting mid-sentence/word)
  // Look for sentence start within first 200 characters
  if (startChar > 0) {
    const sentenceStartMatch = extractedText.match(/^[^.!?]*[.!?]\s+/)
    if (sentenceStartMatch && sentenceStartMatch.index !== undefined) {
      // Skip partial sentence at the beginning
      const skipChars = sentenceStartMatch[0].length
      if (skipChars < 500) { // Don't skip too much
        extractedText = extractedText.substring(skipChars)
      }
    }
  }

  // Try to end at a sentence boundary
  if (endChar < fullText.length) {
    const lastSentenceEnd = extractedText.search(/[.!?]\s+[A-Z][^.!?]*$/)
    if (lastSentenceEnd !== -1 && lastSentenceEnd > extractedText.length - 500) {
      // Find the actual end of the sentence
      const endMatch = extractedText.substring(lastSentenceEnd).match(/[.!?]/)
      if (endMatch && endMatch.index !== undefined) {
        extractedText = extractedText.substring(0, lastSentenceEnd + endMatch.index + 1)
      }
    }
  }

  console.log(`📖 Extracted pages ${validStartPage}-${validEndPage} of ${totalPages}: ${extractedText.length} chars`)

  return extractedText.trim()
}

/**
 * Extract text for multiple non-contiguous page ranges
 * Useful for selecting multiple sections
 *
 * @param fullText - The complete document text
 * @param pageRanges - Array of page ranges to extract
 * @param totalPages - Total number of pages in the document
 * @returns Combined extracted text with section separators
 */
export function extractTextByMultipleRanges(
  fullText: string,
  pageRanges: Array<{ start: number; end: number; label?: string }>,
  totalPages: number
): string {
  if (!fullText || fullText.length === 0 || pageRanges.length === 0) {
    return ''
  }

  const extractedSections: string[] = []

  for (const range of pageRanges) {
    const sectionText = extractTextByPageRange(fullText, range.start, range.end, totalPages)
    if (sectionText.length > 0) {
      const header = range.label
        ? `\n\n=== ${range.label} (Pages ${range.start}-${range.end}) ===\n\n`
        : `\n\n=== Pages ${range.start}-${range.end} ===\n\n`
      extractedSections.push(header + sectionText)
    }
  }

  const combinedText = extractedSections.join('\n')
  console.log(`📖 Extracted ${pageRanges.length} sections: ${combinedText.length} total chars`)

  return combinedText.trim()
}
