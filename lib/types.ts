export type MasteryLevel = 'learning' | 'reviewing' | 'mastered'

export interface Flashcard {
  id: string
  front: string
  back: string
  createdAt: Date
  // Spaced repetition fields
  masteryLevel?: MasteryLevel
  confidenceScore?: number  // 0-100
  timesReviewed?: number
  timesCorrect?: number
  lastReviewedAt?: Date
  nextReviewAt?: Date
}

export interface FlashcardSet {
  id: string
  name: string
  flashcards: Flashcard[]
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PAGE RANGE TYPE (used by Smart Topics)
// ============================================================================

export interface PageRange {
  start: number
  end: number
}

// ============================================================================
// CONTENT SELECTION TYPES
// ============================================================================

export type SelectionType = 'full' | 'pages' | 'topic'

export interface ContentSelection {
  type: SelectionType
  range?: PageRange  // For 'pages' type
  topicId?: string  // For 'topic' type (legacy AI topics)
  metadata?: {
    selectionDescription?: string  // Human-readable description
    estimatedPages?: number
    estimatedTokens?: number
  }
}

// ============================================================================
// FLASHCARD SOURCE METADATA
// ============================================================================

export interface FlashcardSourceSection {
  chapter?: string  // "Chapter 1: Introduction"
  section?: string  // "1.2 Cell Structure"
  pageRange?: PageRange
  tocPath?: string[]  // ["Introduction to Biology", "Cell Biology", "Cell Structure"]
  level?: number  // Heading level in TOC
  sectionId?: string  // References TOC section ID
}

// ============================================================================
// DOCUMENT TOPIC DETECTION TYPES
// ============================================================================

export type TopicDetectionMethod = 'toronto-notes-pattern' | 'ai-generic' | 'manual'

export interface TopicMetadata {
  abbreviation?: string  // Toronto Notes abbreviation (e.g., "C" for Cardiology)
  detectionMethod?: TopicDetectionMethod
  confidence?: number  // 0-1, detection confidence score
  specialtyType?: string  // For medical texts: specialty classification
}

export interface DocumentTopic {
  id: string
  title: string
  description?: string
  pageRange: PageRange
  metadata?: TopicMetadata
}

export interface TopicDetectionResult {
  topics: DocumentTopic[]
  detectionMethod: TopicDetectionMethod
  confidence?: number
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// Toronto Notes specific types
export interface TorontoNotesSpecialty {
  abbreviation: string
  fullName: string
  estimatedPages?: PageRange
}

export const TORONTO_NOTES_SPECIALTIES = {
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
} as const

export type TorontoNotesAbbreviation = keyof typeof TORONTO_NOTES_SPECIALTIES