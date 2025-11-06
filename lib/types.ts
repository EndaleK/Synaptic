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
// BOOK STRUCTURE TYPES
// ============================================================================

export interface PageRange {
  start: number
  end: number
}

export interface TOCSection {
  id: string
  title: string
  level: number  // 1 = chapter, 2 = section, 3 = subsection, etc.
  pageRange: PageRange
  sections?: TOCSection[]  // Nested subsections
  parent?: string  // Parent section ID
}

export interface TableOfContents {
  detected: boolean
  chapters: TOCSection[]
  totalPages?: number
  detectionMethod?: 'pdf-bookmarks' | 'text-parsing' | 'heading-analysis'
}

export interface IndexEntry {
  term: string
  pages: number[]
  subEntries?: string[]
  mainEntry?: boolean  // True if this is a main concept vs. a sub-reference
  seeAlso?: string[]  // Cross-references to other index terms
}

export interface BookIndex {
  detected: boolean
  entries: IndexEntry[]
  startPage?: number  // Where the index begins
  endPage?: number    // Where the index ends
  alphabeticalSections?: { letter: string; entries: IndexEntry[] }[]
}

export interface PDFBookmark {
  title: string
  dest: number | string  // Page number or destination name
  items: PDFBookmark[]  // Nested bookmarks
  level?: number
}

export interface PDFBookmarks {
  detected: boolean
  outline: PDFBookmark[]
}

export interface CrossReference {
  from: {
    page: number
    text: string  // "See Chapter 3" or "Refer to Section 2.1"
    context?: string  // Surrounding text for context
  }
  to: {
    chapter?: string
    section?: string
    page?: number
    sectionId?: string  // Maps to TOC section ID if available
  }
  type: 'see' | 'see-also' | 'refer-to' | 'discussed-in' | 'compare-with'
}

export interface CrossReferences {
  references: CrossReference[]
  totalFound: number
}

export interface HeadingHierarchy {
  text: string
  level: number  // 1 = h1, 2 = h2, etc.
  page: number
  fontSize?: number  // Font size in points (for heading detection)
  fontWeight?: string  // Font weight (bold, normal, etc.)
  pageRange?: PageRange  // Estimated range until next same-level heading
}

export interface DetectedHeadings {
  detected: boolean
  hierarchy: HeadingHierarchy[]
  detectionConfidence?: number  // 0-1, how confident we are in the hierarchy
}

export interface BookStructure {
  toc?: TableOfContents
  index?: BookIndex
  bookmarks?: PDFBookmarks
  crossRefs?: CrossReferences
  headings?: DetectedHeadings
}

// ============================================================================
// AI SUGGESTIONS TYPES
// ============================================================================

export type ContentType = 'flashcards' | 'podcasts' | 'mindmaps'

export interface ContentSuggestion {
  sectionId: string  // References a TOC section ID
  title: string
  confidence: number  // 0-1, how suitable this section is
  reason: string  // Human-readable explanation
  pageRange: PageRange
  estimatedOutput?: {
    cards?: number  // For flashcards
    duration?: string  // For podcasts (e.g., "12 minutes")
    nodes?: number  // For mind maps
  }
  metadata?: {
    conceptDensity?: number  // 0-1
    narrativeFlow?: number  // 0-1
    complexityScore?: number  // 0-100
  }
}

export interface AISuggestions {
  flashcards: ContentSuggestion[]
  podcasts: ContentSuggestion[]
  mindmaps: ContentSuggestion[]
  generatedAt: string  // ISO timestamp
}

// ============================================================================
// STRUCTURE ANALYSIS TYPES
// ============================================================================

export type StructureType = 'toc' | 'index' | 'bookmarks' | 'headings' | 'ai-topics'

export interface StructureAnalysis {
  recommended: StructureType
  scores: {
    toc?: number  // 0-100
    index?: number
    bookmarks?: number
    headings?: number
  }
  reasoning: string  // AI explanation for why this structure is recommended
  detectedMethods: StructureType[]  // Which methods successfully extracted structure
  fallbackUsed: boolean  // True if we fell back to AI topic detection
  analyzedAt: string  // ISO timestamp
}

// ============================================================================
// CONTENT SELECTION TYPES
// ============================================================================

export type SelectionType = 'full' | 'pages' | 'topic' | 'structure' | 'suggestion'

export interface ContentSelection {
  type: SelectionType
  range?: PageRange  // For 'pages' type
  topicId?: string  // For 'topic' type (legacy AI topics)
  sectionIds?: string[]  // For 'structure' type (TOC/Index sections)
  suggestionId?: string  // For 'suggestion' type (AI-recommended section)
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