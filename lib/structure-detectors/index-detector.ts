/**
 * Back-of-Book Index Detector
 *
 * Detects and parses the alphabetical index typically found at the end of textbooks
 * Handles various index formats:
 * - Simple: "Mitochondria, 12, 45, 78"
 * - With sub-entries: "Cell\n  Structure, 10\n  Function, 25"
 * - With cross-references: "DNA, see Genetics"
 */

import type { BookIndex, IndexEntry } from '../types'

/**
 * Detect if text contains a back-of-book index
 */
export function detectIndex(text: string): boolean {
  // Index is usually in the last 10-20% of the document
  const searchStart = Math.floor(text.length * 0.8)
  const searchText = text.substring(searchStart).toLowerCase()

  // Look for index keywords
  const indexKeywords = ['index', 'subject index', 'index of terms']
  const hasIndexKeyword = indexKeywords.some(keyword => searchText.includes(keyword))

  if (!hasIndexKeyword) return false

  // Count lines that look like index entries
  // Pattern: "Term, page, page" or "Term .... page"
  const lines = text.substring(searchStart).split('\n')
  const indexLikeLines = lines.filter(line => {
    const trimmed = line.trim()
    if (trimmed.length < 3) return false

    // Index entries typically:
    // 1. Start with a term (alphabetical)
    // 2. Have comma-separated page numbers
    // 3. Or have page number after dots/dashes
    const patterns = [
      /^[A-Z][a-zA-Z\s\-]+,\s*\d+/,  // "Term, 10" or "Term, 10, 20"
      /^[A-Z][a-zA-Z\s\-]+\s+\d+/,   // "Term 10"
      /^[A-Z][a-zA-Z\s\-]+\s*[\.…\-]{2,}\s*\d+/,  // "Term .... 10"
      /^\s{2,}[a-z][a-zA-Z\s]+,\s*\d+/,  // "  sub-entry, 10" (indented)
    ]

    return patterns.some(pattern => pattern.test(trimmed))
  })

  // If we have "Index" keyword and at least 20 index-like lines, it's probably an index
  return indexLikeLines.length >= 20
}

/**
 * Parse a single index line
 */
function parseIndexLine(line: string, lineNumber: number): {
  term: string
  pages: number[]
  isSubEntry: boolean
  seeAlso?: string
} | null {
  const trimmed = line.trim()
  if (trimmed.length < 2) return null

  // Check for cross-reference: "DNA, see Genetics"
  const seeMatch = trimmed.match(/^([^,]+),\s*see\s+(.+)$/i)
  if (seeMatch) {
    return {
      term: seeMatch[1].trim(),
      pages: [],
      isSubEntry: false,
      seeAlso: seeMatch[2].trim()
    }
  }

  // Check for "see also" reference
  const seeAlsoMatch = trimmed.match(/^([^,]+),\s*see also\s+(.+)$/i)
  if (seeAlsoMatch) {
    return {
      term: seeAlsoMatch[1].trim(),
      pages: [],
      isSubEntry: false,
      seeAlso: seeAlsoMatch[2].trim()
    }
  }

  // Detect sub-entries (indented with spaces or tabs)
  const isSubEntry = /^\s{2,}/.test(line)

  // Pattern 1: "Term, 10, 20, 30" (comma-separated pages)
  let match = trimmed.match(/^([^,\d]+),\s*([\d,\s\-]+)$/)
  if (match) {
    const term = match[1].trim()
    const pagesStr = match[2]

    // Extract all page numbers (handle ranges like "10-15")
    const pages: number[] = []
    const pageTokens = pagesStr.split(',').map(s => s.trim())

    for (const token of pageTokens) {
      if (token.includes('-')) {
        // Handle page range: "10-15"
        const [start, end] = token.split('-').map(s => parseInt(s.trim()))
        if (!isNaN(start) && !isNaN(end)) {
          pages.push(start) // Just add start of range to keep it simple
        }
      } else {
        const page = parseInt(token)
        if (!isNaN(page)) {
          pages.push(page)
        }
      }
    }

    if (pages.length > 0) {
      return { term, pages, isSubEntry }
    }
  }

  // Pattern 2: "Term .... 10" (dots before page number)
  match = trimmed.match(/^([^\.]+)\s*[\.…\-]{2,}\s*(\d+)$/)
  if (match) {
    const term = match[1].trim()
    const page = parseInt(match[2])
    if (!isNaN(page)) {
      return { term, pages: [page], isSubEntry }
    }
  }

  // Pattern 3: "Term 10, 20, 30" (space before first page number)
  match = trimmed.match(/^([^\d]+)\s+([\d,\s\-]+)$/)
  if (match) {
    const term = match[1].trim()
    const pagesStr = match[2]

    const pages: number[] = []
    const pageTokens = pagesStr.split(',').map(s => s.trim())

    for (const token of pageTokens) {
      const page = parseInt(token)
      if (!isNaN(page)) {
        pages.push(page)
      }
    }

    if (pages.length > 0 && term.length > 1) {
      return { term, pages, isSubEntry }
    }
  }

  return null
}

/**
 * Extract index from document text
 */
export function extractIndex(text: string): BookIndex {
  if (!detectIndex(text)) {
    return {
      detected: false,
      entries: []
    }
  }

  console.log('Index detected, parsing...')

  // Find the index section (usually in last 20% of document)
  const searchStart = Math.floor(text.length * 0.8)
  const indexText = text.substring(searchStart)
  const lines = indexText.split('\n')

  let indexStartIndex = -1
  let indexEndIndex = lines.length

  // Find index start
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].toLowerCase()
    if (line.includes('index') && !line.includes('table of')) {
      indexStartIndex = i + 1 // Start after "Index" heading
      break
    }
  }

  if (indexStartIndex === -1) {
    indexStartIndex = 0
  }

  // Parse index entries
  const entries: IndexEntry[] = []
  let currentMainEntry: IndexEntry | null = null

  for (let i = indexStartIndex; i < indexEndIndex; i++) {
    const parsed = parseIndexLine(lines[i], i)
    if (!parsed) continue

    if (parsed.isSubEntry && currentMainEntry) {
      // Add as sub-entry to current main entry
      if (!currentMainEntry.subEntries) {
        currentMainEntry.subEntries = []
      }
      currentMainEntry.subEntries.push(parsed.term)
      // Also add pages to main entry
      currentMainEntry.pages.push(...parsed.pages)
    } else {
      // New main entry
      const entry: IndexEntry = {
        term: parsed.term,
        pages: parsed.pages,
        mainEntry: !parsed.isSubEntry,
        seeAlso: parsed.seeAlso ? [parsed.seeAlso] : undefined
      }
      entries.push(entry)
      currentMainEntry = entry
    }
  }

  // Deduplicate pages in each entry
  entries.forEach(entry => {
    entry.pages = [...new Set(entry.pages)].sort((a, b) => a - b)
  })

  console.log(`Parsed ${entries.length} index entries`)

  if (entries.length < 10) {
    return { detected: false, entries: [] }
  }

  // Group by alphabetical sections
  const alphabeticalSections: { letter: string; entries: IndexEntry[] }[] = []
  let currentLetter = ''
  let currentSection: IndexEntry[] = []

  for (const entry of entries) {
    const firstLetter = entry.term[0].toUpperCase()
    if (firstLetter !== currentLetter) {
      if (currentSection.length > 0) {
        alphabeticalSections.push({ letter: currentLetter, entries: currentSection })
      }
      currentLetter = firstLetter
      currentSection = [entry]
    } else {
      currentSection.push(entry)
    }
  }

  if (currentSection.length > 0) {
    alphabeticalSections.push({ letter: currentLetter, entries: currentSection })
  }

  // Estimate start and end pages
  const allPages = entries.flatMap(e => e.pages)
  const startPage = allPages.length > 0 ? Math.min(...allPages) : undefined
  const endPage = allPages.length > 0 ? Math.max(...allPages) : undefined

  return {
    detected: true,
    entries,
    alphabeticalSections,
    startPage,
    endPage
  }
}

/**
 * Search index for specific terms
 */
export function searchIndex(index: BookIndex, searchTerm: string): IndexEntry[] {
  if (!index.detected) return []

  const lowerSearch = searchTerm.toLowerCase()

  return index.entries.filter(entry => {
    const matchesTerm = entry.term.toLowerCase().includes(lowerSearch)
    const matchesSubEntry = entry.subEntries?.some(sub =>
      sub.toLowerCase().includes(lowerSearch)
    )
    return matchesTerm || matchesSubEntry
  })
}

/**
 * Get related terms from index (via see/see also references)
 */
export function getRelatedTerms(index: BookIndex, term: string): string[] {
  if (!index.detected) return []

  const entry = index.entries.find(e =>
    e.term.toLowerCase() === term.toLowerCase()
  )

  if (!entry || !entry.seeAlso) return []

  return entry.seeAlso
}
