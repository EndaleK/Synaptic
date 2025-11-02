/**
 * Document to HTML Converter
 * Converts uploaded documents (DOCX, PDF, TXT) to HTML while preserving formatting
 * Integrates with TipTap editor for rich text editing
 */

import mammoth from 'mammoth'

export interface ConversionResult {
  html: string
  plainText: string
  wordCount: number
  success: boolean
  error?: string
}

/**
 * Convert DOCX file to HTML with formatting preservation
 */
export async function convertDocxToHtml(file: File): Promise<ConversionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()

    // Use mammoth to convert DOCX to HTML
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          // Map DOCX styles to HTML elements
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => h2:fresh",
          // Preserve bold and italic
          "b => strong",
          "i => em",
          // Lists
          "u => u"
        ]
      }
    )

    const html = result.value
    const plainText = stripHtml(html)
    const wordCount = countWords(plainText)

    return {
      html,
      plainText,
      wordCount,
      success: true
    }
  } catch (error) {
    console.error('DOCX conversion error:', error)
    return {
      html: '',
      plainText: '',
      wordCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert DOCX'
    }
  }
}

/**
 * Convert plain text to basic HTML
 */
export function convertTextToHtml(text: string): ConversionResult {
  try {
    // Convert plain text to HTML paragraphs
    const paragraphs = text
      .split(/\n\n+/) // Split by double newlines (paragraph breaks)
      .filter(p => p.trim())
      .map(p => {
        // Replace single newlines with <br>
        const content = p.replace(/\n/g, '<br>')
        return `<p>${content}</p>`
      })
      .join('\n')

    const html = paragraphs || '<p></p>'
    const wordCount = countWords(text)

    return {
      html,
      plainText: text,
      wordCount,
      success: true
    }
  } catch (error) {
    console.error('Text conversion error:', error)
    return {
      html: '',
      plainText: text,
      wordCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert text'
    }
  }
}

/**
 * Convert any supported document format to HTML
 */
export async function convertDocumentToHtml(file: File): Promise<ConversionResult> {
  const fileType = getFileType(file)

  switch (fileType) {
    case 'docx':
    case 'doc':
      return convertDocxToHtml(file)

    case 'txt':
      const text = await file.text()
      return convertTextToHtml(text)

    case 'pdf':
      // For PDFs, we'll need server-side extraction
      // Return instruction to use server API
      return {
        html: '',
        plainText: '',
        wordCount: 0,
        success: false,
        error: 'PDF files require server-side processing. Please use the upload API endpoint.'
      }

    default:
      return {
        html: '',
        plainText: '',
        wordCount: 0,
        success: false,
        error: `Unsupported file type: ${file.type || 'unknown'}`
      }
  }
}

/**
 * Determine file type from File object
 */
function getFileType(file: File): string {
  const mimeType = file.type
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') return 'docx'
  if (mimeType === 'application/msword' || extension === 'doc') return 'doc'
  if (mimeType === 'text/plain' || extension === 'txt') return 'txt'

  return 'unknown'
}

/**
 * Strip HTML tags to get plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length
}

/**
 * Generate unique essay title with timestamp
 * Used when duplicate titles are detected
 */
export function generateUniqueTitle(originalTitle: string): string {
  const now = new Date()
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  return `${originalTitle} (${date} ${time})`
}

/**
 * Extract title from filename
 */
export function extractTitleFromFilename(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(docx|doc|txt|pdf)$/i, '')

  // Clean up common patterns
  return nameWithoutExt
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}
