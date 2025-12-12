/**
 * Content Filter for Flashcard Generation
 *
 * Filters out non-educational content (TOC, indexes, copyright, author bios, etc.)
 * BEFORE sending text to AI for flashcard generation.
 *
 * This improves flashcard quality by:
 * 1. Reducing wasted tokens on metadata
 * 2. Focusing AI attention on actual learning content
 * 3. Preventing low-quality cards like "Who published this book?"
 */

export interface FilterOptions {
  removeTOC?: boolean           // default: true
  removeIndex?: boolean         // default: true
  removeCopyright?: boolean     // default: true
  removeAuthorBio?: boolean     // default: true
  removeAcknowledgments?: boolean // default: true
  removeBibliography?: boolean  // default: true
  removeHeaders?: boolean       // default: true - repeated headers/footers
  removeGlossary?: boolean      // default: false - may contain useful definitions
}

export interface FilterStats {
  tocRemoved: boolean
  indexRemoved: boolean
  copyrightRemoved: boolean
  authorBioRemoved: boolean
  acknowledgementsRemoved: boolean
  bibliographyRemoved: boolean
  headersRemoved: number
  sectionsRemoved: string[]
  originalLength: number
  filteredLength: number
  reductionPercent: number
}

export interface FilterResult {
  cleanText: string
  removedSections: string[]
  stats: FilterStats
}

// ============================================================================
// Detection Patterns
// ============================================================================

// Table of Contents patterns
const TOC_PATTERNS = [
  /^table of contents\s*$/im,
  /^contents\s*$/im,
  /^toc\s*$/im,
]

// Detect TOC-style entries: "Chapter 1.....5" or "Introduction...3"
const TOC_ENTRY_PATTERN = /^.{1,80}[.\s]{3,}\d+\s*$/gm

// Index patterns
const INDEX_SECTION_PATTERNS = [
  /^index\s*$/im,
  /^subject index\s*$/im,
  /^author index\s*$/im,
  /^name index\s*$/im,
]

// Index entries: "Acetaminophen, 45, 67-69" or "Biology: 12, 45-50, 89"
const INDEX_ENTRY_PATTERN = /^[A-Z][a-zA-Z\s,\-']+[,:]?\s*\d+(?:[-–]\d+)?(?:,\s*\d+(?:[-–]\d+)?)*\s*$/gm

// Copyright patterns
const COPYRIGHT_PATTERNS = [
  /©\s*\d{4}/gi,
  /copyright\s*(?:©)?\s*\d{4}/gi,
  /all rights reserved/gi,
  /ISBN[:\s-]*[\d-X]+/gi,
  /published by[^.]+\./gi,
  /printed in[^.]+\./gi,
  /first (?:edition|printing)[^.]+\./gi,
  /library of congress[^.]+\./gi,
  /reproduction[^.]+prohibited[^.]+\./gi,
  /no part of this[^.]+reproduced[^.]+\./gi,
]

// Author bio patterns
const AUTHOR_BIO_PATTERNS = [
  /^about the authors?\s*$/im,
  /^author(?:'s)? (?:biography|bio)\s*$/im,
  /^contributors?\s*$/im,
  /^(?:dr\.|prof\.|professor)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:is|has been|was|teaches|received|earned)\s+/gim,
  /(?:is|was) (?:a |an )?(?:professor|author|researcher|lecturer|expert|specialist|consultant) (?:of|at|in)\s/gi,
  /received (?:his|her|their) (?:Ph\.?D\.?|doctorate|degree) (?:from|in|at)/gi,
]

// Acknowledgments patterns
const ACKNOWLEDGMENTS_PATTERNS = [
  /^acknowledgm?ents?\s*$/im,
  /^dedication\s*$/im,
  /^special thanks\s*$/im,
  /^foreword\s*$/im,
  /^preface\s*$/im,
  /I (?:would like to|want to|wish to) (?:thank|acknowledge|express)/gi,
  /(?:special|sincere|heartfelt) thanks to/gi,
  /dedicated to/gi,
]

// Bibliography/References patterns
const BIBLIOGRAPHY_PATTERNS = [
  /^bibliography\s*$/im,
  /^references\s*$/im,
  /^works cited\s*$/im,
  /^further reading\s*$/im,
  /^suggested readings?\s*$/im,
  /^source(?:s)?\s*$/im,
]

// Reference entries (APA, MLA, Chicago style)
const REFERENCE_ENTRY_PATTERN = /^[A-Z][a-zA-Z,.\s-]+\(\d{4}\)[^.]+\.$/gm

// Repeated header/footer patterns (page numbers, document title repeated)
const HEADER_FOOTER_PATTERNS = [
  /^\s*\d+\s*$/gm,  // Standalone page numbers
  /^page\s+\d+\s*$/gim,
  /^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm,  // - 42 -
]

// Glossary patterns (optional, may want to keep)
const GLOSSARY_PATTERNS = [
  /^glossary\s*$/im,
  /^key terms?\s*$/im,
  /^definitions?\s*$/im,
  /^vocabulary\s*$/im,
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect section boundaries in text
 */
function findSectionBoundaries(text: string, sectionPatterns: RegExp[]): { start: number, end: number, name: string }[] {
  const boundaries: { start: number, end: number, name: string }[] = []
  const lines = text.split('\n')

  for (const pattern of sectionPatterns) {
    let currentIndex = 0

    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        // Found section start
        const startIndex = currentIndex
        const sectionName = lines[i].trim()

        // Look for next major section header (typically uppercase or specific patterns)
        let endIndex = text.length
        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j].trim()
          // End section at next chapter, major heading, or significantly long content section
          if (
            /^chapter\s+\d+/i.test(line) ||
            /^part\s+[IVX\d]+/i.test(line) ||
            /^section\s+\d+/i.test(line) ||
            (line.length > 0 && line === line.toUpperCase() && line.length > 3 && line.length < 50)
          ) {
            endIndex = currentIndex + lines.slice(i, j).join('\n').length
            break
          }
        }

        boundaries.push({ start: startIndex, end: endIndex, name: sectionName })
      }
      currentIndex += lines[i].length + 1 // +1 for newline
    }
  }

  return boundaries
}

/**
 * Remove content matching patterns
 */
function removeByPatterns(text: string, patterns: RegExp[]): string {
  let result = text
  for (const pattern of patterns) {
    // Create a new RegExp with global flag to ensure all matches are replaced
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
    result = result.replace(globalPattern, '')
  }
  return result
}

/**
 * Remove consecutive lines that match TOC entry patterns
 */
function removeTOCEntries(text: string): { text: string, removed: boolean } {
  const lines = text.split('\n')
  const filteredLines: string[] = []
  let inTOC = false
  let consecutiveTOCLines = 0
  let tocRemoved = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isTOCHeader = TOC_PATTERNS.some(p => p.test(line))
    const isTOCEntry = TOC_ENTRY_PATTERN.test(line)

    if (isTOCHeader) {
      inTOC = true
      consecutiveTOCLines = 0
      tocRemoved = true
      continue // Skip TOC header
    }

    if (inTOC && isTOCEntry) {
      consecutiveTOCLines++
      tocRemoved = true
      continue // Skip TOC entry
    }

    // Exit TOC mode after several non-TOC lines
    if (inTOC && !isTOCEntry) {
      if (line.trim().length > 100) {
        // Long content line - probably main content
        inTOC = false
      } else if (consecutiveTOCLines > 0 && line.trim().length > 0) {
        // Short non-TOC line after TOC entries - check next few lines
        const nextFewLines = lines.slice(i + 1, i + 4)
        const hasTOCEntries = nextFewLines.some(l => TOC_ENTRY_PATTERN.test(l))
        if (!hasTOCEntries) {
          inTOC = false
        }
      }
    }

    if (!inTOC) {
      filteredLines.push(line)
    }
  }

  return { text: filteredLines.join('\n'), removed: tocRemoved }
}

/**
 * Remove index entries (alphabetical listings with page numbers)
 */
function removeIndexEntries(text: string): { text: string, removed: boolean } {
  const lines = text.split('\n')
  const filteredLines: string[] = []
  let inIndex = false
  let consecutiveIndexLines = 0
  let indexRemoved = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isIndexHeader = INDEX_SECTION_PATTERNS.some(p => p.test(line))
    const isIndexEntry = INDEX_ENTRY_PATTERN.test(line)

    if (isIndexHeader) {
      inIndex = true
      consecutiveIndexLines = 0
      indexRemoved = true
      continue
    }

    if (inIndex && isIndexEntry) {
      consecutiveIndexLines++
      indexRemoved = true
      continue
    }

    // Exit index mode after non-index content
    if (inIndex && !isIndexEntry && line.trim().length > 60) {
      inIndex = false
    }

    if (!inIndex) {
      filteredLines.push(line)
    }
  }

  return { text: filteredLines.join('\n'), removed: indexRemoved }
}

/**
 * Remove bibliography/references section
 */
function removeBibliography(text: string): { text: string, removed: boolean } {
  const lines = text.split('\n')
  const filteredLines: string[] = []
  let inBibliography = false
  let bibRemoved = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isBibHeader = BIBLIOGRAPHY_PATTERNS.some(p => p.test(line))
    const isRefEntry = REFERENCE_ENTRY_PATTERN.test(line)

    if (isBibHeader) {
      inBibliography = true
      bibRemoved = true
      continue
    }

    if (inBibliography) {
      // Check if we've moved to a new chapter/section
      if (/^chapter\s+\d+/i.test(line) || /^part\s+[IVX\d]+/i.test(line)) {
        inBibliography = false
      } else if (isRefEntry || line.trim().length < 100) {
        continue // Skip reference entries and short lines in bibliography
      } else {
        inBibliography = false
      }
    }

    if (!inBibliography) {
      filteredLines.push(line)
    }
  }

  return { text: filteredLines.join('\n'), removed: bibRemoved }
}

/**
 * Remove repeated headers/footers and standalone page numbers
 */
function removeHeadersFooters(text: string): { text: string, count: number } {
  let result = text
  let count = 0

  for (const pattern of HEADER_FOOTER_PATTERNS) {
    const matches = result.match(pattern)
    if (matches) {
      count += matches.length
    }
    result = result.replace(pattern, '')
  }

  return { text: result, count }
}

/**
 * Clean up excessive whitespace after filtering
 */
function cleanWhitespace(text: string): string {
  return text
    .replace(/\n{4,}/g, '\n\n\n') // Max 3 consecutive newlines
    .replace(/[ \t]{2,}/g, ' ')    // Max 1 space
    .replace(/^\s+$/gm, '')        // Remove whitespace-only lines
    .trim()
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Filter editorial content from text before flashcard generation
 *
 * @param text - Raw extracted text from document
 * @param options - Configuration for what to filter
 * @returns Cleaned text and statistics about what was removed
 */
export function filterEditorialContent(
  text: string,
  options: FilterOptions = {}
): FilterResult {
  // Default options
  const opts: Required<FilterOptions> = {
    removeTOC: options.removeTOC ?? true,
    removeIndex: options.removeIndex ?? true,
    removeCopyright: options.removeCopyright ?? true,
    removeAuthorBio: options.removeAuthorBio ?? true,
    removeAcknowledgments: options.removeAcknowledgments ?? true,
    removeBibliography: options.removeBibliography ?? true,
    removeHeaders: options.removeHeaders ?? true,
    removeGlossary: options.removeGlossary ?? false,
  }

  const originalLength = text.length
  const removedSections: string[] = []
  let result = text

  // Track what was removed
  let tocRemoved = false
  let indexRemoved = false
  let copyrightRemoved = false
  let authorBioRemoved = false
  let acknowledgementsRemoved = false
  let bibliographyRemoved = false
  let headersRemoved = 0

  // Remove Table of Contents
  if (opts.removeTOC) {
    const tocResult = removeTOCEntries(result)
    result = tocResult.text
    tocRemoved = tocResult.removed
    if (tocRemoved) removedSections.push('Table of Contents')
  }

  // Remove Index
  if (opts.removeIndex) {
    const indexResult = removeIndexEntries(result)
    result = indexResult.text
    indexRemoved = indexResult.removed
    if (indexRemoved) removedSections.push('Index')
  }

  // Remove Copyright/Publisher info
  if (opts.removeCopyright) {
    const beforeLength = result.length
    result = removeByPatterns(result, COPYRIGHT_PATTERNS)
    copyrightRemoved = result.length < beforeLength
    if (copyrightRemoved) removedSections.push('Copyright/Publisher info')
  }

  // Remove Author Bios
  if (opts.removeAuthorBio) {
    const beforeLength = result.length
    result = removeByPatterns(result, AUTHOR_BIO_PATTERNS)
    authorBioRemoved = result.length < beforeLength
    if (authorBioRemoved) removedSections.push('Author biography')
  }

  // Remove Acknowledgments
  if (opts.removeAcknowledgments) {
    const beforeLength = result.length
    result = removeByPatterns(result, ACKNOWLEDGMENTS_PATTERNS)
    acknowledgementsRemoved = result.length < beforeLength
    if (acknowledgementsRemoved) removedSections.push('Acknowledgments/Dedication')
  }

  // Remove Bibliography/References
  if (opts.removeBibliography) {
    const bibResult = removeBibliography(result)
    result = bibResult.text
    bibliographyRemoved = bibResult.removed
    if (bibliographyRemoved) removedSections.push('Bibliography/References')
  }

  // Remove Headers/Footers/Page Numbers
  if (opts.removeHeaders) {
    const headerResult = removeHeadersFooters(result)
    result = headerResult.text
    headersRemoved = headerResult.count
    if (headersRemoved > 0) removedSections.push(`Page numbers/headers (${headersRemoved})`)
  }

  // Remove Glossary (optional)
  if (opts.removeGlossary) {
    const beforeLength = result.length
    result = removeByPatterns(result, GLOSSARY_PATTERNS)
    if (result.length < beforeLength) removedSections.push('Glossary')
  }

  // Clean up whitespace
  result = cleanWhitespace(result)

  const filteredLength = result.length
  const reductionPercent = originalLength > 0
    ? Math.round((1 - filteredLength / originalLength) * 100)
    : 0

  return {
    cleanText: result,
    removedSections,
    stats: {
      tocRemoved,
      indexRemoved,
      copyrightRemoved,
      authorBioRemoved,
      acknowledgementsRemoved,
      bibliographyRemoved,
      headersRemoved,
      sectionsRemoved: removedSections,
      originalLength,
      filteredLength,
      reductionPercent,
    }
  }
}

/**
 * Quick check if text likely contains significant editorial content
 * Use this to decide whether to apply filtering
 */
export function hasSignificantEditorialContent(text: string): boolean {
  // Check for TOC patterns
  const hasTOC = TOC_PATTERNS.some(p => p.test(text)) ||
    (text.match(TOC_ENTRY_PATTERN)?.length ?? 0) > 5

  // Check for index patterns
  const hasIndex = INDEX_SECTION_PATTERNS.some(p => p.test(text)) ||
    (text.match(INDEX_ENTRY_PATTERN)?.length ?? 0) > 10

  // Check for copyright
  const hasCopyright = COPYRIGHT_PATTERNS.some(p => p.test(text))

  // Check for bibliography
  const hasBibliography = BIBLIOGRAPHY_PATTERNS.some(p => p.test(text))

  return hasTOC || hasIndex || hasCopyright || hasBibliography
}
