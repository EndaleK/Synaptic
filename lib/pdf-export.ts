/**
 * PDF Export Utility
 *
 * Generates printable PDF study materials from Synaptic flashcards.
 * Supports multiple layouts for different study needs.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf
} from '@react-pdf/renderer'
import { createElement } from 'react'

interface FlashcardForPDF {
  id: string
  front: string
  back: string
  tags?: string[]
  difficulty?: string
}

type PDFLayout = 'grid' | 'list' | 'printable'

interface PDFExportOptions {
  deckName: string
  layout: PDFLayout
  includeAnswers: boolean
  includeTags: boolean
  cardsPerPage?: number
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  // Grid layout styles (2x3)
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    minHeight: 120,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  gridCardFront: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  gridCardBack: {
    fontSize: 10,
    color: '#374151',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  // List layout styles
  listCard: {
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  listQuestion: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  listQuestionText: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 8,
  },
  listAnswer: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  listAnswerText: {
    fontSize: 11,
    color: '#374151',
  },
  // Printable layout styles (cut-friendly)
  printableContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  printableCard: {
    width: '50%',
    height: 180,
    padding: 16,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  printableText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#111827',
  },
  printableSmallText: {
    fontSize: 8,
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 8,
  },
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  tag: {
    fontSize: 8,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

// Strip HTML tags from content
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

// Truncate text if too long
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// Grid Layout Component
function GridLayout({ cards, options }: { cards: FlashcardForPDF[]; options: PDFExportOptions }) {
  const cardsPerPage = 6 // 2x3 grid
  const pages: FlashcardForPDF[][] = []

  for (let i = 0; i < cards.length; i += cardsPerPage) {
    pages.push(cards.slice(i, i + cardsPerPage))
  }

  return createElement(Document, {},
    pages.map((pageCards, pageIndex) =>
      createElement(Page, { key: pageIndex, size: "A4", style: styles.page },
        // Header on first page
        pageIndex === 0 && createElement(View, { style: styles.header },
          createElement(Text, { style: styles.title }, options.deckName),
          createElement(Text, { style: styles.subtitle },
            `${cards.length} flashcards | Exported from Synaptic`
          )
        ),
        // Cards grid
        createElement(View, { style: styles.gridContainer },
          pageCards.map((card, cardIndex) =>
            createElement(View, { key: card.id, style: styles.gridCard },
              createElement(Text, { style: styles.gridCardFront },
                truncate(stripHtml(card.front), 150)
              ),
              options.includeAnswers && createElement(Text, { style: styles.gridCardBack },
                truncate(stripHtml(card.back), 200)
              ),
              options.includeTags && card.tags && card.tags.length > 0 &&
                createElement(View, { style: styles.tagsContainer },
                  card.tags.slice(0, 3).map((tag, i) =>
                    createElement(Text, { key: i, style: styles.tag }, tag)
                  )
                )
            )
          )
        ),
        // Footer
        createElement(View, { style: styles.footer },
          createElement(Text, {}, 'synaptic.study'),
          createElement(Text, { style: styles.pageNumber },
            `Page ${pageIndex + 1} of ${pages.length}`
          )
        )
      )
    )
  )
}

// List Layout Component
function ListLayout({ cards, options }: { cards: FlashcardForPDF[]; options: PDFExportOptions }) {
  const cardsPerPage = 8
  const pages: FlashcardForPDF[][] = []

  for (let i = 0; i < cards.length; i += cardsPerPage) {
    pages.push(cards.slice(i, i + cardsPerPage))
  }

  return createElement(Document, {},
    pages.map((pageCards, pageIndex) =>
      createElement(Page, { key: pageIndex, size: "A4", style: styles.page },
        // Header on first page
        pageIndex === 0 && createElement(View, { style: styles.header },
          createElement(Text, { style: styles.title }, options.deckName),
          createElement(Text, { style: styles.subtitle },
            `${cards.length} flashcards | Exported from Synaptic`
          )
        ),
        // Cards list
        pageCards.map((card, cardIndex) =>
          createElement(View, { key: card.id, style: styles.listCard },
            createElement(Text, { style: styles.listQuestion }, 'Q:'),
            createElement(Text, { style: styles.listQuestionText },
              stripHtml(card.front)
            ),
            options.includeAnswers && [
              createElement(Text, { key: 'a-label', style: styles.listAnswer }, 'A:'),
              createElement(Text, { key: 'a-text', style: styles.listAnswerText },
                stripHtml(card.back)
              )
            ],
            options.includeTags && card.tags && card.tags.length > 0 &&
              createElement(View, { style: styles.tagsContainer },
                card.tags.map((tag, i) =>
                  createElement(Text, { key: i, style: styles.tag }, tag)
                )
              )
          )
        ),
        // Footer
        createElement(View, { style: styles.footer },
          createElement(Text, {}, 'synaptic.study'),
          createElement(Text, { style: styles.pageNumber },
            `Page ${pageIndex + 1} of ${pages.length}`
          )
        )
      )
    )
  )
}

// Printable Layout Component (for cutting physical cards)
function PrintableLayout({ cards, options }: { cards: FlashcardForPDF[]; options: PDFExportOptions }) {
  // Create pairs: front pages followed by back pages
  const cardsPerPage = 6 // 2x3 grid for cutting
  const pageGroups: FlashcardForPDF[][] = []

  for (let i = 0; i < cards.length; i += cardsPerPage) {
    pageGroups.push(cards.slice(i, i + cardsPerPage))
  }

  const allPages: { type: 'front' | 'back'; cards: FlashcardForPDF[]; groupIndex: number }[] = []

  pageGroups.forEach((group, index) => {
    allPages.push({ type: 'front', cards: group, groupIndex: index })
    if (options.includeAnswers) {
      allPages.push({ type: 'back', cards: group, groupIndex: index })
    }
  })

  return createElement(Document, {},
    // Title page
    createElement(Page, { size: "A4", style: styles.page },
      createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
        createElement(Text, { style: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 } },
          options.deckName
        ),
        createElement(Text, { style: { fontSize: 14, color: '#6b7280', marginBottom: 8 } },
          `${cards.length} Printable Flashcards`
        ),
        createElement(Text, { style: { fontSize: 10, color: '#9ca3af', marginBottom: 32 } },
          'Cut along the dashed lines'
        ),
        createElement(Text, { style: { fontSize: 10, color: '#9ca3af' } },
          'Exported from Synaptic'
        )
      )
    ),
    // Card pages
    ...allPages.map((page, pageIndex) =>
      createElement(Page, { key: pageIndex, size: "A4", style: styles.page },
        createElement(View, { style: styles.printableContainer },
          page.cards.map((card, cardIndex) =>
            createElement(View, { key: card.id, style: styles.printableCard },
              createElement(Text, { style: styles.printableText },
                truncate(stripHtml(page.type === 'front' ? card.front : card.back), 200)
              ),
              page.type === 'front' &&
                createElement(Text, { style: styles.printableSmallText },
                  `Card ${page.groupIndex * 6 + cardIndex + 1}`
                )
            )
          )
        ),
        // Footer
        createElement(View, { style: styles.footer },
          createElement(Text, {}, page.type === 'front' ? 'FRONT SIDE' : 'BACK SIDE'),
          createElement(Text, { style: styles.pageNumber },
            `Page ${pageIndex + 2}`
          )
        )
      )
    )
  )
}

/**
 * Generate PDF export from flashcards
 */
export async function generatePDFExport(
  flashcards: FlashcardForPDF[],
  options: PDFExportOptions
): Promise<{ filename: string; data: Blob }> {
  const { deckName, layout = 'grid' } = options

  // Select layout component
  let document: React.ReactElement
  switch (layout) {
    case 'list':
      document = ListLayout({ cards: flashcards, options })
      break
    case 'printable':
      document = PrintableLayout({ cards: flashcards, options })
      break
    case 'grid':
    default:
      document = GridLayout({ cards: flashcards, options })
      break
  }

  // Generate PDF blob
  const blob = await pdf(document).toBlob()

  // Generate filename
  const sanitizedName = deckName
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50)
  const filename = `${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`

  return { filename, data: blob }
}

export type { FlashcardForPDF, PDFLayout, PDFExportOptions }
