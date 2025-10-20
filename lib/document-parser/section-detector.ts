/**
 * Document Section Detection Utility
 *
 * Parses document text to extract hierarchical sections/headings.
 * Supports:
 * - Markdown headings (#, ##, ###)
 * - arXiv paper sections
 * - Web articles (already converted to Markdown)
 */

export interface DocumentSection {
  id: string
  title: string
  level: number // 1 = top-level, 2 = subsection, etc.
  startIndex: number
  endIndex: number
  content: string
  children?: DocumentSection[]
}

export interface SectionStructure {
  sections: DocumentSection[]
  totalSections: number
  maxDepth: number
}

/**
 * Detects arXiv paper section patterns
 */
const ARXIV_SECTION_PATTERNS = [
  /^abstract$/im,
  /^introduction$/im,
  /^(related work|background)$/im,
  /^(method(ology)?|approach)$/im,
  /^(experiment(s)?|evaluation)$/im,
  /^results?$/im,
  /^discussion$/im,
  /^conclusion$/im,
  /^(reference|bibliography)s?$/im,
  /^acknowledgment(s)?$/im,
  /^appendix$/im
]

/**
 * Extracts sections from markdown-formatted text
 */
export function detectMarkdownSections(text: string): DocumentSection[] {
  const lines = text.split('\n')
  const sections: DocumentSection[] = []
  let sectionCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Match markdown headings: # H1, ## H2, ### H3, etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()

      // Calculate start index in original text
      const startIndex = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)

      // Find the end index (next heading of same or higher level, or end of document)
      let endIndex = text.length
      for (let j = i + 1; j < lines.length; j++) {
        const nextHeading = lines[j].trim().match(/^(#{1,6})\s+/)
        if (nextHeading && nextHeading[1].length <= level) {
          endIndex = lines.slice(0, j).join('\n').length
          break
        }
      }

      // Extract content
      const content = text.substring(startIndex, endIndex).trim()

      sections.push({
        id: `section-${sectionCounter++}`,
        title,
        level,
        startIndex,
        endIndex,
        content,
      })
    }
  }

  return sections
}

/**
 * Detects arXiv paper structure
 */
export function detectArxivSections(text: string): DocumentSection[] {
  const lines = text.split('\n')
  const sections: DocumentSection[] = []
  let sectionCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check if line matches any arXiv section pattern
    const isArxivSection = ARXIV_SECTION_PATTERNS.some(pattern => pattern.test(line))

    if (isArxivSection) {
      const title = line

      // Calculate start index
      const startIndex = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)

      // Find end index (next arXiv section or end of document)
      let endIndex = text.length
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim()
        if (ARXIV_SECTION_PATTERNS.some(pattern => pattern.test(nextLine))) {
          endIndex = lines.slice(0, j).join('\n').length
          break
        }
      }

      const content = text.substring(startIndex, endIndex).trim()

      sections.push({
        id: `section-${sectionCounter++}`,
        title,
        level: 1, // arXiv sections are typically top-level
        startIndex,
        endIndex,
        content,
      })
    }
  }

  return sections
}

/**
 * Builds hierarchical structure from flat sections
 */
function buildHierarchy(sections: DocumentSection[]): DocumentSection[] {
  if (sections.length === 0) return []

  const root: DocumentSection[] = []
  const stack: DocumentSection[] = []

  for (const section of sections) {
    // Remove all sections from stack that are at same or deeper level
    while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      // Top-level section
      root.push(section)
    } else {
      // Child section
      const parent = stack[stack.length - 1]
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(section)
    }

    stack.push(section)
  }

  return root
}

/**
 * Main function to detect document sections
 */
export function detectDocumentSections(text: string, sourceType?: string): SectionStructure {
  let sections: DocumentSection[] = []

  // Try markdown detection first
  const markdownSections = detectMarkdownSections(text)

  if (markdownSections.length > 0) {
    sections = markdownSections
  } else if (sourceType === 'arxiv') {
    // Fallback to arXiv detection for papers without markdown
    sections = detectArxivSections(text)
  }

  // If no sections found, create a single section for the entire document
  if (sections.length === 0) {
    sections = [{
      id: 'section-0',
      title: 'Full Document',
      level: 1,
      startIndex: 0,
      endIndex: text.length,
      content: text,
    }]
  }

  // Build hierarchical structure
  const hierarchicalSections = buildHierarchy(sections)

  // Calculate max depth
  const calculateMaxDepth = (secs: DocumentSection[], currentDepth = 1): number => {
    let maxDepth = currentDepth
    for (const sec of secs) {
      if (sec.children && sec.children.length > 0) {
        maxDepth = Math.max(maxDepth, calculateMaxDepth(sec.children, currentDepth + 1))
      }
    }
    return maxDepth
  }

  return {
    sections: hierarchicalSections,
    totalSections: sections.length,
    maxDepth: calculateMaxDepth(hierarchicalSections),
  }
}

/**
 * Flattens hierarchical sections into a flat array
 */
export function flattenSections(sections: DocumentSection[]): DocumentSection[] {
  const flattened: DocumentSection[] = []

  const traverse = (secs: DocumentSection[]) => {
    for (const section of secs) {
      flattened.push(section)
      if (section.children) {
        traverse(section.children)
      }
    }
  }

  traverse(sections)
  return flattened
}

/**
 * Gets section by ID from hierarchical structure
 */
export function getSectionById(sections: DocumentSection[], id: string): DocumentSection | null {
  for (const section of sections) {
    if (section.id === id) return section
    if (section.children) {
      const found = getSectionById(section.children, id)
      if (found) return found
    }
  }
  return null
}
