/**
 * Toronto Notes Topic Detector
 *
 * Detects if a document is Toronto Notes and extracts topics using
 * medical specialty abbreviations from the index.
 */

export interface TorontoNotesTopic {
  id: string
  title: string
  abbreviation: string
  estimatedPages?: {
    start: number
    end: number
  }
}

export interface TorontoNotesDetectionResult {
  isTorontoNotes: boolean
  confidence: number
  topics: TorontoNotesTopic[]
  metadata?: {
    detectionMethod: 'abbreviation-pattern'
    abbreviationsFound: string[]
  }
}

/**
 * Toronto Notes Medical Specialty Abbreviation Mappings
 * Based on the index structure of Toronto Notes medical textbook
 */
const TORONTO_NOTES_ABBREVIATIONS: Record<string, string> = {
  'ELOM': 'Ethical, Legal, Organizational, and Informatics',
  'A': 'Anesthesia',
  'C': 'Cardiology',
  'CP': 'Clinical Pharmacology and Toxicology',
  'D': 'Dermatology',
  'ER': 'Emergency Medicine',
  'E': 'Endocrinology',
  'FM': 'Family Medicine',
  'G': 'Gastroenterology',
  'GS': 'General Surgery',
  'GM': 'Geriatric Medicine',
  'GY': 'Gynecology',
  'H': 'Hematology',
  'ID': 'Infectious Diseases',
  'MG': 'Medical Genetics',
  'MI': 'Medical Imaging',
  'NP': 'Nephrology',
  'N': 'Neurology',
  'NS': 'Neurosurgery',
  'OB': 'Obstetrics',
  'OP': 'Ophthalmology',
  'OR': 'Orthopedic Surgery',
  'OT': 'Otolaryngology',
  'P': 'Psychiatry',
  'PM': 'Pain Medicine and Palliative Care',
  'PL': 'Plastic Surgery',
  'PS': 'Pediatric Surgery',
  'PH': 'Public Health and Preventive Medicine',
  'R': 'Respirology',
  'RH': 'Rheumatology',
  'U': 'Urology',
  'VS': 'Vascular Surgery',
}

/**
 * Minimum number of abbreviations that must be present to confidently
 * identify a document as Toronto Notes
 */
const MIN_ABBREVIATIONS_FOR_DETECTION = 5

/**
 * Detect if a document is Toronto Notes based on abbreviation patterns
 */
export function detectTorontoNotes(
  text: string,
  fileName?: string
): TorontoNotesDetectionResult {
  // Quick filename check
  const isTorontoNotesFilename = fileName?.toLowerCase().includes('toronto notes') ||
                                  fileName?.toLowerCase().includes('torontonotes')

  // Extract first 50K characters for pattern detection (sufficient for TOC/index)
  const sampleText = text.substring(0, 50000)

  // Find which abbreviations are present
  const foundAbbreviations: string[] = []
  const abbreviationPositions: Array<{ abbr: string; position: number }> = []

  for (const [abbr, fullName] of Object.entries(TORONTO_NOTES_ABBREVIATIONS)) {
    // Look for abbreviation patterns in the text
    // Pattern: "abbr." or "abbr:" or "abbr " at the start of a line or after whitespace
    const pattern = new RegExp(
      `(?:^|\\s)(${abbr})[.:\\s]`,
      'gim'
    )

    const match = pattern.exec(sampleText)
    if (match) {
      foundAbbreviations.push(abbr)
      abbreviationPositions.push({
        abbr,
        position: match.index
      })
    }
  }

  // Calculate confidence score
  const abbreviationScore = Math.min(foundAbbreviations.length / Object.keys(TORONTO_NOTES_ABBREVIATIONS).length, 1)
  const filenameScore = isTorontoNotesFilename ? 0.3 : 0
  const confidence = Math.min(abbreviationScore * 0.7 + filenameScore, 1)

  // Determine if it's Toronto Notes
  const isTorontoNotes =
    foundAbbreviations.length >= MIN_ABBREVIATIONS_FOR_DETECTION ||
    (foundAbbreviations.length >= 3 && isTorontoNotesFilename)

  // Generate topics if detected as Toronto Notes
  const topics: TorontoNotesTopic[] = isTorontoNotes
    ? generateTopicsFromAbbreviations(text, foundAbbreviations, abbreviationPositions)
    : []

  return {
    isTorontoNotes,
    confidence,
    topics,
    metadata: isTorontoNotes ? {
      detectionMethod: 'abbreviation-pattern',
      abbreviationsFound: foundAbbreviations,
    } : undefined,
  }
}

/**
 * Generate structured topics from found abbreviations
 */
function generateTopicsFromAbbreviations(
  text: string,
  foundAbbreviations: string[],
  abbreviationPositions: Array<{ abbr: string; position: number }>
): TorontoNotesTopic[] {
  const topics: TorontoNotesTopic[] = []

  // Sort positions to estimate page ranges
  const sortedPositions = [...abbreviationPositions].sort((a, b) => a.position - b.position)

  // Estimate total pages (rough estimate: 2000 chars per page)
  const CHARS_PER_PAGE = 2000
  const totalPages = Math.ceil(text.length / CHARS_PER_PAGE)

  sortedPositions.forEach((item, index) => {
    const abbr = item.abbr
    const fullName = TORONTO_NOTES_ABBREVIATIONS[abbr]

    // Estimate page range
    const startPage = Math.max(1, Math.ceil(item.position / CHARS_PER_PAGE))
    const nextPosition = sortedPositions[index + 1]?.position || text.length
    const endPage = Math.min(totalPages, Math.ceil(nextPosition / CHARS_PER_PAGE))

    topics.push({
      id: `toronto-notes-${abbr.toLowerCase()}`,
      title: fullName,
      abbreviation: abbr,
      estimatedPages: {
        start: startPage,
        end: endPage,
      },
    })
  })

  return topics
}

/**
 * Get a specific topic's page range
 */
export function getTopicPageRange(
  abbreviation: string,
  text: string
): { start: number; end: number } | null {
  const result = detectTorontoNotes(text)

  if (!result.isTorontoNotes) {
    return null
  }

  const topic = result.topics.find(
    t => t.abbreviation.toLowerCase() === abbreviation.toLowerCase()
  )

  return topic?.estimatedPages || null
}

/**
 * Get all available topics for a Toronto Notes document
 */
export function getAllTorontoNotesTopics(text: string): TorontoNotesTopic[] {
  const result = detectTorontoNotes(text)
  return result.isTorontoNotes ? result.topics : []
}

/**
 * Check if a specific abbreviation is valid
 */
export function isValidTorontoNotesAbbreviation(abbr: string): boolean {
  return abbr.toUpperCase() in TORONTO_NOTES_ABBREVIATIONS
}

/**
 * Get full name for an abbreviation
 */
export function getAbbreviationFullName(abbr: string): string | null {
  return TORONTO_NOTES_ABBREVIATIONS[abbr.toUpperCase()] || null
}
