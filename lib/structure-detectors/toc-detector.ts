/**
 * Table of Contents Detector
 *
 * Detects and parses table of contents from document text
 * Handles various TOC formats:
 * - Chapter 1: Introduction ........... 1
 * - 1. Introduction ............. 1
 * - Introduction (page 1)
 * - I. Introduction [Roman numerals]
 */

import type { TableOfContents, TOCSection, PageRange } from '../types'

interface TOCLine {
  text: string
  page: number
  level: number
  lineNumber: number
}

/**
 * Detect if text contains a table of contents
 */
export function detectTOC(text: string): boolean {
  const lowerText = text.toLowerCase()

  // Look for TOC indicators in first 20% of document
  const searchLength = Math.min(text.length, text.length * 0.2)
  const searchText = text.substring(0, searchLength).toLowerCase()

  // TOC keywords
  const tocKeywords = [
    'table of contents',
    'contents',
    'table des matieres', // French
    'inhalt', // German
    'indice', // Spanish/Italian
  ]

  const hasTOCKeyword = tocKeywords.some(keyword => searchText.includes(keyword))

  if (!hasTOCKeyword) return false

  // Count lines that look like TOC entries (text followed by page number)
  // Pattern: some text ... page number
  const tocLikeLines = text.split('\n').filter(line => {
    // Skip very short lines
    if (line.trim().length < 10) return false

    // Look for patterns like:
    // "Chapter 1 .... 5"
    // "Introduction ... 10"
    // "1.1 Background ......... 15"
    const patterns = [
      /^.*?\.{2,}\s*\d+\s*$/,  // Dots: "Text .... 10"
      /^.*?-{2,}\s*\d+\s*$/,   // Dashes: "Text ---- 10"
      /^.*?\s{3,}\d+\s*$/,     // Spaces: "Text     10"
      /^.*?\(\s*\d+\s*\)\s*$/, // Parentheses: "Text (10)"
      /^[\d\.]+\s+[A-Z].*?\s+\d+$/,  // "1.1 Title 10"
      /^[IVX]+\.\s+[A-Z].*?\s+\d+$/,  // Roman: "I. Title 10"
    ]

    return patterns.some(pattern => pattern.test(line.trim()))
  })

  // If we have TOC keyword and at least 5 TOC-like lines, it's probably a TOC
  return tocLikeLines.length >= 5
}

/**
 * Parse a TOC line to extract title, level, and page number
 */
function parseTOCLine(line: string, lineNumber: number): TOCLine | null {
  const trimmed = line.trim()
  if (trimmed.length < 3) return null

  // Pattern 1: "Chapter 1: Title ........ 10"
  let match = trimmed.match(/^(chapter\s+\d+\s*:?\s*)(.+?)\s*[\.…\-\s]{2,}\s*(\d+)\s*$/i)
  if (match) {
    return {
      text: match[2].trim(),
      page: parseInt(match[3]),
      level: 1, // Chapters are level 1
      lineNumber
    }
  }

  // Pattern 2: "1.1.1 Title ........ 10" (numbered sections)
  match = trimmed.match(/^([\d\.]+)\s+(.+?)\s*[\.…\-\s]{2,}\s*(\d+)\s*$/)
  if (match) {
    const number = match[1]
    const dots = number.split('.').filter(n => n.length > 0).length
    return {
      text: `${number} ${match[2].trim()}`,
      page: parseInt(match[3]),
      level: Math.min(dots, 6), // Max 6 levels
      lineNumber
    }
  }

  // Pattern 3: "Title ........ 10" (unnumbered)
  match = trimmed.match(/^(.+?)\s*[\.…\-\s]{3,}\s*(\d+)\s*$/)
  if (match) {
    const title = match[1].trim()
    // Guess level based on capitalization and length
    const isAllCaps = title === title.toUpperCase()
    const startsWithCapital = /^[A-Z]/.test(title)

    return {
      text: title,
      page: parseInt(match[2]),
      level: isAllCaps ? 1 : (startsWithCapital ? 2 : 3),
      lineNumber
    }
  }

  // Pattern 4: "Title (10)" or "Title [10]"
  match = trimmed.match(/^(.+?)\s*[\(\[]\s*(\d+)\s*[\)\]]\s*$/)
  if (match) {
    return {
      text: match[1].trim(),
      page: parseInt(match[2]),
      level: 2,
      lineNumber
    }
  }

  // Pattern 5: Roman numerals "I. Title .... 10"
  match = trimmed.match(/^([IVX]+)\.\s+(.+?)\s*[\.…\-\s]{2,}\s*(\d+)\s*$/i)
  if (match) {
    return {
      text: `${match[1]}. ${match[2].trim()}`,
      page: parseInt(match[3]),
      level: 1,
      lineNumber
    }
  }

  return null
}

/**
 * Build hierarchical structure from flat TOC lines
 */
function buildHierarchy(tocLines: TOCLine[]): TOCSection[] {
  const sections: TOCSection[] = []
  const stack: TOCSection[] = []

  for (let i = 0; i < tocLines.length; i++) {
    const line = tocLines[i]
    const nextLine = tocLines[i + 1]

    // Calculate page range (from current page to next section's page - 1)
    const pageRange: PageRange = {
      start: line.page,
      end: nextLine ? nextLine.page - 1 : line.page + 10 // Default to +10 if no next
    }

    const section: TOCSection = {
      id: `section-${line.lineNumber}`,
      title: line.text,
      level: line.level,
      pageRange,
      sections: []
    }

    // Pop stack until we find parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= line.level) {
      stack.pop()
    }

    // If stack is empty, it's a top-level section
    if (stack.length === 0) {
      sections.push(section)
    } else {
      // Add as child to parent
      const parent = stack[stack.length - 1]
      if (!parent.sections) parent.sections = []
      parent.sections.push(section)
      section.parent = parent.id
    }

    // Push to stack
    stack.push(section)
  }

  return sections
}

/**
 * Extract TOC from document text
 */
export function extractTOC(text: string): TableOfContents {
  if (!detectTOC(text)) {
    return {
      detected: false,
      chapters: []
    }
  }

  console.log('TOC detected, parsing...')

  // Find the TOC section
  const lines = text.split('\n')
  let tocStartIndex = -1
  let tocEndIndex = -1

  // Find TOC start
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    const line = lines[i].toLowerCase()
    if (line.includes('table of contents') || line.includes('contents')) {
      tocStartIndex = i
      break
    }
  }

  if (tocStartIndex === -1) {
    return { detected: false, chapters: [] }
  }

  // Find TOC end (usually before first chapter or after substantial gap)
  let consecutiveEmpty = 0
  for (let i = tocStartIndex + 1; i < Math.min(lines.length, tocStartIndex + 200); i++) {
    if (lines[i].trim().length === 0) {
      consecutiveEmpty++
      if (consecutiveEmpty > 3) {
        // Check if next non-empty line looks like TOC entry
        let foundTOCLike = false
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (parseTOCLine(lines[j], j)) {
            foundTOCLike = true
            break
          }
        }
        if (!foundTOCLike) {
          tocEndIndex = i
          break
        }
      }
    } else {
      consecutiveEmpty = 0
    }
  }

  if (tocEndIndex === -1) {
    tocEndIndex = Math.min(tocStartIndex + 200, lines.length)
  }

  // Parse TOC lines
  const tocLines: TOCLine[] = []
  for (let i = tocStartIndex; i < tocEndIndex; i++) {
    const parsed = parseTOCLine(lines[i], i)
    if (parsed) {
      tocLines.push(parsed)
    }
  }

  console.log(`Parsed ${tocLines.length} TOC entries`)

  if (tocLines.length < 3) {
    return { detected: false, chapters: [] }
  }

  // Build hierarchical structure
  const chapters = buildHierarchy(tocLines)

  // Calculate total pages from last entry
  const totalPages = tocLines.length > 0
    ? Math.max(...tocLines.map(l => l.page))
    : undefined

  return {
    detected: true,
    chapters,
    totalPages,
    detectionMethod: 'text-parsing'
  }
}

/**
 * Merge TOC from multiple sources (bookmarks + text parsing)
 */
export function mergeTOCSources(
  textTOC: TableOfContents,
  bookmarkTOC: TOCSection[]
): TableOfContents {
  // Prefer text-parsed TOC if it has more detail
  if (textTOC.detected && textTOC.chapters.length > bookmarkTOC.length) {
    return {
      ...textTOC,
      detectionMethod: 'text-parsing'
    }
  }

  // Otherwise use bookmarks if available
  if (bookmarkTOC.length > 0) {
    return {
      detected: true,
      chapters: bookmarkTOC,
      detectionMethod: 'pdf-bookmarks'
    }
  }

  return textTOC
}
