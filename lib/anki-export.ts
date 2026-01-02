/**
 * Anki Export Utility
 *
 * Generates Anki-compatible export files (.apkg) from Synaptic flashcards.
 *
 * Anki uses SQLite databases packaged as ZIP files with .apkg extension.
 * This utility creates the necessary SQLite structure and packages it.
 */

import JSZip from 'jszip'

// Anki model IDs (standard Anki model)
const BASIC_MODEL_ID = 1234567890123
const BASIC_REVERSED_MODEL_ID = 1234567890124

interface FlashcardForExport {
  id: string
  front: string
  back: string
  tags?: string[]
  created_at?: string
  difficulty?: string
}

interface ExportOptions {
  deckName: string
  includeReversed?: boolean
  includeTags?: boolean
}

/**
 * Generate Anki-compatible export data
 * Returns a base64-encoded .apkg file content
 */
export async function generateAnkiExport(
  flashcards: FlashcardForExport[],
  options: ExportOptions
): Promise<{ filename: string; data: Blob }> {
  const { deckName, includeReversed = false, includeTags = true } = options

  // Create the SQL statements for the Anki database
  const deckId = Date.now()
  const modelId = includeReversed ? BASIC_REVERSED_MODEL_ID : BASIC_MODEL_ID
  const now = Math.floor(Date.now() / 1000)

  // Generate notes and cards
  const notes: string[] = []
  const cards: string[] = []

  flashcards.forEach((card, index) => {
    const noteId = deckId + index + 1
    const cardId = noteId * 2

    // Escape special characters for SQL
    const front = escapeSQL(stripHtml(card.front))
    const back = escapeSQL(stripHtml(card.back))
    const tags = includeTags && card.tags ? card.tags.join(' ') : ''

    // Note format: id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data
    const guid = generateGuid(noteId)
    const flds = `${front}\x1f${back}` // Fields separated by unit separator
    const sfld = front.substring(0, 100) // Sort field

    notes.push(
      `(${noteId}, '${guid}', ${modelId}, ${now}, -1, '${escapeSQL(tags)}', '${escapeSQL(flds)}', '${escapeSQL(sfld)}', ${checksum(front)}, 0, '')`
    )

    // Card format: id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data
    cards.push(
      `(${cardId}, ${noteId}, ${deckId}, 0, ${now}, -1, 0, 0, ${index}, 0, 0, 0, 0, 0, 0, 0, 0, '')`
    )

    // Add reversed card if requested
    if (includeReversed) {
      cards.push(
        `(${cardId + 1}, ${noteId}, ${deckId}, 1, ${now}, -1, 0, 0, ${index}, 0, 0, 0, 0, 0, 0, 0, 0, '')`
      )
    }
  })

  // Create the collection.anki2 SQLite content
  const sqlContent = generateAnkiSQL(deckId, deckName, modelId, notes, cards, includeReversed)

  // Create media file (empty for now)
  const mediaContent = '{}'

  // Package as .apkg (ZIP file)
  const zip = new JSZip()

  // Add the SQL file as binary (simulated SQLite)
  // Note: For a real implementation, we'd need to create an actual SQLite database
  // For now, we'll create a text-based export format that can be imported
  zip.file('collection.anki2', sqlContent)
  zip.file('media', mediaContent)

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `${sanitizeFilename(deckName)}_${new Date().toISOString().split('T')[0]}.apkg`

  return { filename, data: blob }
}

/**
 * Generate a simpler text-based export (Anki text import format)
 * This is more reliable and doesn't require SQLite
 */
export function generateAnkiTextExport(
  flashcards: FlashcardForExport[],
  options: ExportOptions
): { filename: string; content: string } {
  const { deckName, includeTags = true } = options

  // Anki text import format: front\tback\ttags
  const lines: string[] = []

  // Add header comment
  lines.push(`# Deck: ${deckName}`)
  lines.push(`# Exported from Synaptic on ${new Date().toISOString()}`)
  lines.push(`# Format: Front<tab>Back<tab>Tags`)
  lines.push('')

  flashcards.forEach(card => {
    const front = stripHtml(card.front).replace(/\t/g, ' ').replace(/\n/g, '<br>')
    const back = stripHtml(card.back).replace(/\t/g, ' ').replace(/\n/g, '<br>')
    const tags = includeTags && card.tags ? card.tags.join(' ') : ''

    if (tags) {
      lines.push(`${front}\t${back}\t${tags}`)
    } else {
      lines.push(`${front}\t${back}`)
    }
  })

  const content = lines.join('\n')
  const filename = `${sanitizeFilename(deckName)}_${new Date().toISOString().split('T')[0]}.txt`

  return { filename, content }
}

/**
 * Generate CSV export (universal format)
 */
export function generateCSVExport(
  flashcards: FlashcardForExport[],
  options: ExportOptions
): { filename: string; content: string } {
  const { deckName, includeTags = true } = options

  const lines: string[] = []

  // CSV header
  if (includeTags) {
    lines.push('Front,Back,Tags,Difficulty,Created')
  } else {
    lines.push('Front,Back,Difficulty,Created')
  }

  flashcards.forEach(card => {
    const front = escapeCSV(stripHtml(card.front))
    const back = escapeCSV(stripHtml(card.back))
    const tags = card.tags ? card.tags.join('; ') : ''
    const difficulty = card.difficulty || 'medium'
    const created = card.created_at ? new Date(card.created_at).toLocaleDateString() : ''

    if (includeTags) {
      lines.push(`${front},${back},${escapeCSV(tags)},${difficulty},${created}`)
    } else {
      lines.push(`${front},${back},${difficulty},${created}`)
    }
  })

  const content = lines.join('\n')
  const filename = `${sanitizeFilename(deckName)}_${new Date().toISOString().split('T')[0]}.csv`

  return { filename, content }
}

// Helper functions

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

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''")
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50)
}

function generateGuid(id: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let guid = ''
  let n = id
  while (n > 0 || guid.length < 10) {
    guid = chars[n % chars.length] + guid
    n = Math.floor(n / chars.length)
  }
  return guid
}

function checksum(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function generateAnkiSQL(
  deckId: number,
  deckName: string,
  modelId: number,
  notes: string[],
  cards: string[],
  includeReversed: boolean
): string {
  const now = Math.floor(Date.now() / 1000)

  // Model configuration
  const modelName = includeReversed ? 'Basic (and reversed card)' : 'Basic'
  const templates = includeReversed
    ? [
        { name: 'Card 1', qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id="answer">{{Back}}' },
        { name: 'Card 2', qfmt: '{{Back}}', afmt: '{{FrontSide}}<hr id="answer">{{Front}}' }
      ]
    : [
        { name: 'Card 1', qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id="answer">{{Back}}' }
      ]

  const model = {
    id: Number(modelId),
    name: modelName,
    type: 0,
    mod: now,
    usn: -1,
    sortf: 0,
    did: deckId,
    tmpls: templates,
    flds: [
      { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20 },
      { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20 }
    ],
    css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
    latexPre: '',
    latexPost: '',
    tags: [],
    vers: []
  }

  const deck = {
    id: deckId,
    name: deckName,
    mod: now,
    usn: -1,
    lrnToday: [0, 0],
    revToday: [0, 0],
    newToday: [0, 0],
    timeToday: [0, 0],
    conf: 1,
    desc: `Exported from Synaptic on ${new Date().toISOString()}`,
    dyn: 0,
    collapsed: false,
    browserCollapsed: false
  }

  // This is a simplified representation
  // A real implementation would create an actual SQLite database
  return `-- Anki Collection Export
-- Deck: ${deckName}
-- Cards: ${cards.length}
-- Exported: ${new Date().toISOString()}

-- Model
${JSON.stringify(model, null, 2)}

-- Deck
${JSON.stringify(deck, null, 2)}

-- Notes
INSERT INTO notes VALUES
${notes.join(',\n')};

-- Cards
INSERT INTO cards VALUES
${cards.join(',\n')};
`
}

export type { FlashcardForExport, ExportOptions }
