/**
 * Cross-Reference Detector
 *
 * Detects in-text cross-references to other sections, chapters, or pages
 * Patterns:
 * - "See Chapter 5"
 * - "Refer to Section 3.2"
 * - "As discussed in Chapter 2"
 * - "See page 45"
 * - "Compare with Section 1.3"
 */

import type { CrossReference, CrossReferences } from '../types'

/**
 * Extract cross-references from document text
 */
export function extractCrossReferences(
  text: string,
  maxReferences: number = 500
): CrossReferences {
  const references: CrossReference[] = []

  // Split into lines with line numbers
  const lines = text.split('\n')

  // Patterns for different cross-reference types
  const patterns = [
    // "See Chapter X"
    {
      regex: /\b(see|refer to|refer back to)\s+chapter\s+(\d+)/gi,
      type: 'see' as const,
      extract: (match: RegExpExecArray) => ({
        chapter: match[2],
        section: undefined,
        page: undefined
      })
    },
    // "See Section X.Y"
    {
      regex: /\b(see|refer to)\s+section\s+([\d\.]+)/gi,
      type: 'see' as const,
      extract: (match: RegExpExecArray) => ({
        chapter: undefined,
        section: match[2],
        page: undefined
      })
    },
    // "See page X"
    {
      regex: /\b(see|refer to)\s+page\s+(\d+)/gi,
      type: 'see' as const,
      extract: (match: RegExpExecArray) => ({
        chapter: undefined,
        section: undefined,
        page: parseInt(match[2])
      })
    },
    // "As discussed in Chapter X"
    {
      regex: /\b(as discussed in|discussed in|mentioned in)\s+chapter\s+(\d+)/gi,
      type: 'discussed-in' as const,
      extract: (match: RegExpExecArray) => ({
        chapter: match[2],
        section: undefined,
        page: undefined
      })
    },
    // "See also Chapter X"
    {
      regex: /\bsee also\s+chapter\s+(\d+)/gi,
      type: 'see-also' as const,
      extract: (match: RegExpExecArray) => ({
        chapter: match[1],
        section: undefined,
        page: undefined
      })
    },
    // "Compare with Section X.Y"
    {
      regex: /\b(compare with|compare to|cf\.)\s+section\s+([\d\.]+)/gi,
      type: 'compare-with' as const,
      extract: (match: RegExpExecArray) => ({
        chapter: undefined,
        section: match[2],
        page: undefined
      })
    },
    // "(Chapter X)"
    {
      regex: /\(chapter\s+(\d+)\)/gi,
      type: 'refer-to' as const,
      extract: (match: RegExpExecArray) => ({
        chapter: match[1],
        section: undefined,
        page: undefined
      })
    },
  ]

  // Estimate page numbers (rough approximation: 3500 chars per page)
  const charsPerPage = 3500

  let totalFound = 0

  for (let i = 0; i < lines.length && totalFound < maxReferences; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const estimatedPage = Math.floor((text.indexOf(line) || 0) / charsPerPage) + 1

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0 // Reset regex
      let match: RegExpExecArray | null

      while ((match = pattern.regex.exec(line)) !== null && totalFound < maxReferences) {
        const extractedData = pattern.extract(match)

        // Get context (surrounding text)
        const contextStart = Math.max(0, match.index - 50)
        const contextEnd = Math.min(line.length, match.index + match[0].length + 50)
        const context = line.substring(contextStart, contextEnd).trim()

        references.push({
          from: {
            page: estimatedPage,
            text: match[0],
            context
          },
          to: extractedData,
          type: pattern.type
        })

        totalFound++
      }
    }
  }

  console.log(`Extracted ${references.length} cross-references`)

  return {
    references,
    totalFound: references.length
  }
}

/**
 * Build a cross-reference graph showing which sections reference each other
 */
export function buildCrossReferenceGraph(
  crossRefs: CrossReferences
): Map<string, string[]> {
  const graph = new Map<string, string[]>()

  for (const ref of crossRefs.references) {
    const fromKey = `page-${ref.from.page}`
    const toKey = ref.to.chapter ? `chapter-${ref.to.chapter}` :
                  ref.to.section ? `section-${ref.to.section}` :
                  ref.to.page ? `page-${ref.to.page}` : 'unknown'

    if (!graph.has(fromKey)) {
      graph.set(fromKey, [])
    }
    graph.get(fromKey)!.push(toKey)
  }

  return graph
}

/**
 * Find all references to a specific chapter or section
 */
export function findReferencesTo(
  crossRefs: CrossReferences,
  target: { chapter?: string; section?: string; page?: number }
): CrossReference[] {
  return crossRefs.references.filter(ref => {
    if (target.chapter && ref.to.chapter === target.chapter) return true
    if (target.section && ref.to.section === target.section) return true
    if (target.page && ref.to.page === target.page) return true
    return false
  })
}
