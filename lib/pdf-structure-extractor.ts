/**
 * PDF Structure Extractor
 *
 * Extracts structural metadata from PDF files using PDF.js:
 * - PDF bookmarks/outline
 * - Page labels (Roman numerals, custom numbering)
 * - Font information for heading detection
 * - Page count and metadata
 */

import type { PDFBookmark, PDFBookmarks, HeadingHierarchy } from './types'

interface PDFPageInfo {
  pageNumber: number
  text: string
  fonts: Map<string, {fontSize: number, fontFamily: string, isBold: boolean}>
}

/**
 * Extract PDF bookmarks/outline from document
 */
export async function extractPDFBookmarks(
  pdfDocument: any // PDF.js PDFDocumentProxy
): Promise<PDFBookmarks> {
  try {
    const outline = await pdfDocument.getOutline()

    if (!outline || outline.length === 0) {
      return {
        detected: false,
        outline: []
      }
    }

    // Convert PDF.js outline format to our format
    const processOutlineItems = async (items: any[], level: number = 1): Promise<PDFBookmark[]> => {
      const bookmarks: PDFBookmark[] = []

      for (const item of items) {
        const bookmark: PDFBookmark = {
          title: item.title || '',
          dest: item.dest || '',
          items: [],
          level
        }

        // Try to resolve destination to page number
        if (item.dest) {
          try {
            if (typeof item.dest === 'string') {
              const dest = await pdfDocument.getDestination(item.dest)
              if (dest && dest[0]) {
                const pageIndex = await pdfDocument.getPageIndex(dest[0])
                bookmark.dest = pageIndex + 1 // Convert to 1-based page number
              }
            } else if (Array.isArray(item.dest) && item.dest[0]) {
              const pageIndex = await pdfDocument.getPageIndex(item.dest[0])
              bookmark.dest = pageIndex + 1
            }
          } catch (error) {
            console.warn('Could not resolve bookmark destination:', error)
          }
        }

        // Recursively process child bookmarks
        if (item.items && item.items.length > 0) {
          bookmark.items = await processOutlineItems(item.items, level + 1)
        }

        bookmarks.push(bookmark)
      }

      return bookmarks
    }

    const processedOutline = await processOutlineItems(outline)

    return {
      detected: true,
      outline: processedOutline
    }

  } catch (error) {
    console.error('Error extracting PDF bookmarks:', error)
    return {
      detected: false,
      outline: []
    }
  }
}

/**
 * Extract page labels from PDF metadata
 * Page labels can be Roman numerals (i, ii, iii), custom prefixes, etc.
 */
export async function extractPageLabels(
  pdfDocument: any
): Promise<Map<number, string>> {
  try {
    const pageLabels = new Map<number, string>()
    const numPages = pdfDocument.numPages

    for (let i = 1; i <= numPages; i++) {
      try {
        const label = await pdfDocument.getPageLabel(i - 1) // 0-based index
        if (label) {
          pageLabels.set(i, label)
        }
      } catch (error) {
        // Some PDFs don't have page labels, that's OK
        continue
      }
    }

    return pageLabels

  } catch (error) {
    console.error('Error extracting page labels:', error)
    return new Map()
  }
}

/**
 * Extract font information from PDF pages for heading detection
 * This helps identify headings by analyzing font sizes and styles
 */
export async function extractFontInformation(
  pdfDocument: any,
  maxPagesToSample: number = 50 // Sample first 50 pages to avoid performance issues
): Promise<HeadingHierarchy[]> {
  try {
    const numPages = Math.min(pdfDocument.numPages, maxPagesToSample)
    const headings: HeadingHierarchy[] = []
    const fontSizeFrequency = new Map<number, number>()

    // First pass: Analyze font sizes to determine body text size
    for (let pageNum = 1; pageNum <= Math.min(numPages, 10); pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()

      for (const item of textContent.items) {
        if (item.str.trim().length > 0 && item.height) {
          const fontSize = Math.round(item.height * 10) / 10
          fontSizeFrequency.set(fontSize, (fontSizeFrequency.get(fontSize) || 0) + 1)
        }
      }
    }

    // Determine body text size (most frequent)
    let bodyTextSize = 12 // Default
    let maxFrequency = 0
    fontSizeFrequency.forEach((freq, size) => {
      if (freq > maxFrequency) {
        maxFrequency = freq
        bodyTextSize = size
      }
    })

    console.log(`Detected body text size: ${bodyTextSize}pt from ${fontSizeFrequency.size} font sizes`)

    // Second pass: Extract headings (text larger than body)
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()

      let lineBuffer = ''
      let lineFontSize = 0
      let lineFontWeight = 'normal'

      for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i]
        const nextItem = textContent.items[i + 1]

        if (!item.str || item.str.trim().length === 0) continue

        const fontSize = Math.round(item.height * 10) / 10
        const fontWeight = item.fontName?.toLowerCase().includes('bold') ? 'bold' : 'normal'

        // Accumulate text on the same line
        lineBuffer += item.str
        lineFontSize = Math.max(lineFontSize, fontSize)
        if (fontWeight === 'bold') lineFontWeight = 'bold'

        // Check if this is end of line (next item has different y-position or is null)
        const isEndOfLine = !nextItem || Math.abs((nextItem.transform?.[5] || 0) - (item.transform?.[5] || 0)) > 2

        if (isEndOfLine && lineBuffer.trim().length > 0) {
          // Check if this line is a potential heading
          const isSizeLarger = lineFontSize > bodyTextSize + 0.5 // At least 0.5pt larger
          const isBold = lineFontWeight === 'bold'
          const isShortEnough = lineBuffer.trim().length < 150 // Headings are usually short
          const startsWithNumber = /^\d+\.?\s/.test(lineBuffer.trim()) // "1. " or "1.1 "
          const isAllCaps = lineBuffer.trim() === lineBuffer.trim().toUpperCase() && lineBuffer.trim().length > 2

          if ((isSizeLarger || isBold || isAllCaps || startsWithNumber) && isShortEnough) {
            // Determine heading level based on font size difference
            let level = 1
            const sizeDiff = lineFontSize - bodyTextSize
            if (sizeDiff >= 6) level = 1
            else if (sizeDiff >= 4) level = 2
            else if (sizeDiff >= 2) level = 3
            else if (isBold) level = 3
            else if (isAllCaps) level = 2
            else level = 4

            headings.push({
              text: lineBuffer.trim(),
              level,
              page: pageNum,
              fontSize: lineFontSize,
              fontWeight: lineFontWeight
            })
          }

          // Reset line buffer
          lineBuffer = ''
          lineFontSize = 0
          lineFontWeight = 'normal'
        }
      }
    }

    // Filter out likely false positives (very short text, page numbers, etc.)
    const filteredHeadings = headings.filter(h => {
      const text = h.text.trim()
      return (
        text.length >= 3 && // At least 3 characters
        !/^page \d+$/i.test(text) && // Not "Page 1"
        !/^\d+$/.test(text) && // Not just a number
        !/^figure \d+/i.test(text) && // Not "Figure 1"
        !/^table \d+/i.test(text) // Not "Table 1"
      )
    })

    console.log(`Extracted ${filteredHeadings.length} potential headings from ${numPages} pages`)

    return filteredHeadings

  } catch (error) {
    console.error('Error extracting font information:', error)
    return []
  }
}

/**
 * Extract document metadata (title, author, subject, etc.)
 */
export async function extractPDFMetadata(pdfDocument: any): Promise<any> {
  try {
    const metadata = await pdfDocument.getMetadata()
    return {
      title: metadata.info?.Title || null,
      author: metadata.info?.Author || null,
      subject: metadata.info?.Subject || null,
      keywords: metadata.info?.Keywords || null,
      creator: metadata.info?.Creator || null,
      producer: metadata.info?.Producer || null,
      creationDate: metadata.info?.CreationDate || null,
      modificationDate: metadata.info?.ModDate || null
    }
  } catch (error) {
    console.error('Error extracting PDF metadata:', error)
    return {}
  }
}

/**
 * Main function to extract all PDF structure information
 */
export async function extractPDFStructure(pdfDocument: any) {
  console.log('Starting PDF structure extraction...')

  const [bookmarks, pageLabels, headings, metadata] = await Promise.all([
    extractPDFBookmarks(pdfDocument),
    extractPageLabels(pdfDocument),
    extractFontInformation(pdfDocument),
    extractPDFMetadata(pdfDocument)
  ])

  return {
    bookmarks,
    pageLabels,
    headings,
    metadata,
    totalPages: pdfDocument.numPages
  }
}
