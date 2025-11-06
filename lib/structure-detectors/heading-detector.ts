/**
 * Heading-Based Structure Detector
 *
 * Builds document structure from detected headings (font analysis)
 * Fallback when no TOC or bookmarks are available
 */

import type { DetectedHeadings, HeadingHierarchy, TOCSection, PageRange } from '../types'

/**
 * Convert headings hierarchy to TOC-like structure
 */
export function headingsToTOCStructure(headings: HeadingHierarchy[]): TOCSection[] {
  if (headings.length === 0) return []

  const sections: TOCSection[] = []
  const stack: TOCSection[] = []

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]
    const nextHeading = headings[i + 1]

    // Calculate page range (from current page to next same/higher level heading)
    let endPage = heading.page + 10 // Default to +10 pages

    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= heading.level) {
        endPage = headings[j].page - 1
        break
      }
    }

    // If this is the last heading at this level, extend to next heading or +10
    if (nextHeading) {
      endPage = nextHeading.page - 1
    }

    const section: TOCSection = {
      id: `heading-${heading.page}-${i}`,
      title: heading.text,
      level: heading.level,
      pageRange: {
        start: heading.page,
        end: Math.max(heading.page, endPage)
      },
      sections: []
    }

    // Pop stack until we find appropriate parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
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

    stack.push(section)
  }

  return sections
}

/**
 * Filter headings to improve quality
 * Remove false positives like page headers, footers, etc.
 */
export function filterHeadings(headings: HeadingHierarchy[]): HeadingHierarchy[] {
  if (headings.length === 0) return []

  // Count occurrences of each heading text
  const textCounts = new Map<string, number>()
  headings.forEach(h => {
    const count = textCounts.get(h.text) || 0
    textCounts.set(h.text, count + 1)
  })

  // Filter out:
  // 1. Headings that appear too many times (likely headers/footers)
  // 2. Very short headings (< 3 chars)
  // 3. Headings that are just numbers
  const filtered = headings.filter(h => {
    const count = textCounts.get(h.text) || 0
    const tooFrequent = count > 5 // If appears more than 5 times, likely header/footer
    const tooShort = h.text.length < 3
    const justNumber = /^\d+$/.test(h.text)

    return !tooFrequent && !tooShort && !justNumber
  })

  return filtered
}

/**
 * Normalize heading levels to ensure consistent hierarchy
 * Sometimes PDFs have inconsistent font sizes
 */
export function normalizeHeadingLevels(headings: HeadingHierarchy[]): HeadingHierarchy[] {
  if (headings.length === 0) return []

  // Find unique font sizes, sort descending
  const fontSizes = [...new Set(headings.map(h => h.fontSize || 12))].sort((a, b) => b - a)

  // Map font sizes to levels (largest = level 1)
  const sizeToLevel = new Map<number, number>()
  fontSizes.forEach((size, index) => {
    sizeToLevel.set(size, Math.min(index + 1, 6)) // Max 6 levels
  })

  // Reassign levels based on font size
  return headings.map(h => ({
    ...h,
    level: sizeToLevel.get(h.fontSize || 12) || h.level
  }))
}

/**
 * Detect chapter boundaries from headings
 * Useful for estimating page ranges
 */
export function detectChapters(headings: HeadingHierarchy[]): {
  chapterHeadings: HeadingHierarchy[]
  chapterBoundaries: PageRange[]
} {
  // Chapter headings are usually:
  // - Level 1 headings
  // - Start with "Chapter" or a number
  // - All caps
  const chapterHeadings = headings.filter(h => {
    const isLevel1 = h.level === 1
    const startsWithChapter = /^chapter\s+\d+/i.test(h.text)
    const startsWithNumber = /^\d+\.?\s/.test(h.text)
    const isAllCaps = h.text === h.text.toUpperCase() && h.text.length > 3

    return isLevel1 || startsWithChapter || (startsWithNumber && isAllCaps)
  })

  // Build chapter boundaries
  const boundaries: PageRange[] = []
  for (let i = 0; i < chapterHeadings.length; i++) {
    const start = chapterHeadings[i].page
    const end = chapterHeadings[i + 1]?.page - 1 || start + 20

    boundaries.push({ start, end })
  }

  return {
    chapterHeadings,
    chapterBoundaries: boundaries
  }
}

/**
 * Build DetectedHeadings structure with confidence score
 */
export function buildDetectedHeadings(
  rawHeadings: HeadingHierarchy[]
): DetectedHeadings {
  if (rawHeadings.length === 0) {
    return {
      detected: false,
      hierarchy: [],
      detectionConfidence: 0
    }
  }

  // Filter and normalize headings
  const filtered = filterHeadings(rawHeadings)
  const normalized = normalizeHeadingLevels(filtered)

  // Calculate confidence based on:
  // 1. Number of headings found
  // 2. Variety of levels (good hierarchy has 2-4 levels)
  // 3. Font size consistency
  const uniqueLevels = new Set(normalized.map(h => h.level)).size
  const hasGoodHierarchy = uniqueLevels >= 2 && uniqueLevels <= 4
  const hasEnoughHeadings = normalized.length >= 10

  let confidence = 0
  if (hasEnoughHeadings) confidence += 0.4
  if (hasGoodHierarchy) confidence += 0.3
  if (normalized.length >= 20) confidence += 0.2
  if (uniqueLevels >= 3) confidence += 0.1

  return {
    detected: normalized.length >= 5,
    hierarchy: normalized,
    detectionConfidence: confidence
  }
}

/**
 * Merge heading-based structure with other sources
 * Use headings to fill gaps in TOC or bookmarks
 */
export function mergeWithHeadings(
  existingSections: TOCSection[],
  headings: HeadingHierarchy[]
): TOCSection[] {
  // If we have good existing structure, just return it
  if (existingSections.length > 20) {
    return existingSections
  }

  // Otherwise, convert headings to sections and merge
  const headingSections = headingsToTOCStructure(headings)

  // Simple merge: use headings if we have few existing sections
  if (existingSections.length < 5) {
    return headingSections
  }

  // Otherwise, return existing
  return existingSections
}
