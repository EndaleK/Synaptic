// arXiv Academic Paper Importer

import type { WebImportProvider, ExtractedContent, ContentMetadata } from './types'
import { parseStringPromise } from 'xml2js'

// Import PDF parsing functions (multi-tier fallback)
async function parsePDFWithPdfParse(buffer: Buffer): Promise<{ text: string; error?: string; method?: string }> {
  try {
    const pdfParseModule = require('pdf-parse')
    const pdfParse = pdfParseModule.default || pdfParseModule

    console.log(`[arXiv] Starting pdf-parse extraction (buffer size: ${buffer.length} bytes)...`)
    const data = await pdfParse(buffer, { max: 0 })

    if (data.text && data.text.length > 100) {
      console.log(`[arXiv] ✅ pdf-parse extraction successful: ${data.text.length} chars`)
      return { text: data.text, method: 'pdf-parse' }
    }

    return { text: '', error: 'pdf-parse returned insufficient content' }
  } catch (error) {
    console.error('[arXiv] pdf-parse failed:', error)
    return { text: '', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function parsePDFWithPyMuPDF(buffer: Buffer): Promise<{ text: string; error?: string; method?: string }> {
  try {
    const { execFile } = require('child_process')
    const { promisify } = require('util')
    const fs = require('fs')
    const path = require('path')
    const os = require('os')

    const execFileAsync = promisify(execFile)

    // Write buffer to temp file
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `arxiv-${Date.now()}.pdf`)
    await fs.promises.writeFile(tempFile, buffer)

    console.log(`[arXiv] 🐍 Attempting PyMuPDF extraction...`)

    const scriptPath = path.join(process.cwd(), 'scripts', 'extract-pdf-pymupdf.py')
    const { stdout, stderr } = await execFileAsync('python3', [scriptPath, tempFile], {
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024
    })

    // Clean up temp file
    await fs.promises.unlink(tempFile).catch(() => {})

    if (stderr && !stderr.includes('UserWarning')) {
      console.error('[arXiv] PyMuPDF stderr:', stderr)
    }

    if (stdout && stdout.length > 100) {
      console.log(`[arXiv] ✅ PyMuPDF extraction successful: ${stdout.length} chars`)
      return { text: stdout, method: 'pymupdf' }
    }

    return { text: '', error: 'PyMuPDF returned insufficient content' }
  } catch (error) {
    console.error('[arXiv] PyMuPDF failed:', error)
    return { text: '', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export class ArxivImporter implements WebImportProvider {
  name = 'ArxivImporter'

  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return parsedUrl.hostname.includes('arxiv.org')
    } catch {
      return false
    }
  }

  /**
   * Extract arXiv ID from various URL formats
   */
  private extractArxivId(url: string): string | null {
    // Supports formats:
    // https://arxiv.org/abs/2103.15691
    // https://arxiv.org/pdf/2103.15691.pdf
    // https://arxiv.org/abs/2103.15691v2
    const match = url.match(/(\d{4}\.\d{4,5})(v\d+)?/)
    return match ? match[1] : null
  }

  async getMetadata(url: string): Promise<ContentMetadata> {
    const arxivId = this.extractArxivId(url)
    if (!arxivId) {
      throw new Error('Invalid arXiv URL - could not extract paper ID')
    }

    try {
      // Use arXiv API to fetch metadata
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`
      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.statusText}`)
      }

      const xmlData = await response.text()
      const parsed = await parseStringPromise(xmlData)

      const entry = parsed.feed?.entry?.[0]
      if (!entry) {
        throw new Error('Paper not found in arXiv database')
      }

      // Extract metadata
      const title = entry.title?.[0]?.trim() || `arXiv:${arxivId}`
      const authors = entry.author?.map((a: any) => a.name?.[0]) || []
      const abstract = entry.summary?.[0]?.trim() || ''
      const publishedDate = entry.published?.[0] || ''
      const categories = entry.category?.map((c: any) => c.$.term) || []

      // Calculate estimated reading time (250 words per minute)
      const wordCount = abstract.split(/\s+/).length
      const readingTime = Math.ceil(wordCount / 250)

      return {
        title,
        author: authors,
        publishedDate,
        url,
        sourceType: 'arxiv',
        description: abstract.substring(0, 300) + (abstract.length > 300 ? '...' : ''),
        tags: categories,
        wordCount,
        readingTime,
        additionalData: {
          arxivId,
          pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
          absUrl: `https://arxiv.org/abs/${arxivId}`,
          categories
        }
      }
    } catch (error) {
      console.error('arXiv metadata fetch error:', error)
      throw new Error(`Failed to fetch paper metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async extract(url: string): Promise<ExtractedContent> {
    const metadata = await this.getMetadata(url)
    const arxivId = this.extractArxivId(url)

    if (!arxivId) {
      throw new Error('Invalid arXiv URL')
    }

    try {
      // Download PDF from arXiv
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`
      console.log(`[arXiv] Downloading PDF: ${pdfUrl}`)
      const pdfResponse = await fetch(pdfUrl)

      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`)
      }

      const arrayBuffer = await pdfResponse.arrayBuffer()
      const pdfBuffer = Buffer.from(arrayBuffer)
      const fileSizeMB = pdfBuffer.length / (1024 * 1024)
      console.log(`[arXiv] Downloaded PDF: ${fileSizeMB.toFixed(2)} MB`)

      // Extract text from PDF using multi-tier fallback
      // Tier 1: Try pdf-parse (fast, handles most PDFs)
      let pdfText = ''
      let extractionMethod = 'none'

      const pdfParseResult = await parsePDFWithPdfParse(pdfBuffer)
      if (!pdfParseResult.error && pdfParseResult.text && pdfParseResult.text.length > 100) {
        pdfText = pdfParseResult.text
        extractionMethod = pdfParseResult.method || 'pdf-parse'
      } else {
        // Tier 2: Try PyMuPDF (robust, handles complex PDFs)
        console.log('[arXiv] pdf-parse failed, trying PyMuPDF...')
        const pymupdfResult = await parsePDFWithPyMuPDF(pdfBuffer)
        if (!pymupdfResult.error && pymupdfResult.text && pymupdfResult.text.length > 100) {
          pdfText = pymupdfResult.text
          extractionMethod = pymupdfResult.method || 'pymupdf'
        }
      }

      // Build content with metadata + full PDF text
      const abstract = metadata.description || ''
      let content = `# ${metadata.title}\n\n` +
        `**Authors:** ${Array.isArray(metadata.author) ? metadata.author.join(', ') : metadata.author}\n\n` +
        `**arXiv ID:** ${arxivId}\n\n` +
        `**Published:** ${metadata.publishedDate}\n\n` +
        `**PDF URL:** ${pdfUrl}\n\n`

      if (pdfText && pdfText.length > 100) {
        // Successfully extracted PDF text
        console.log(`[arXiv] ✅ Successfully extracted ${pdfText.length} characters using ${extractionMethod}`)
        content += `## Abstract\n\n${abstract}\n\n` +
          `---\n\n` +
          `## Full Paper Content\n\n${pdfText}`
      } else {
        // Fallback to abstract only
        console.warn('[arXiv] ⚠️ PDF extraction failed, returning abstract only')
        content += `## Abstract\n\n${abstract}\n\n` +
          `---\n\n` +
          `*Note: Could not extract full PDF content. This may be a scanned PDF or complex layout.*\n` +
          `*You can still chat with the abstract and download the PDF manually.*`
      }

      return {
        content,
        metadata,
        format: 'markdown'
      }
    } catch (error) {
      console.error('arXiv content extraction error:', error)
      throw new Error(`Failed to extract paper content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const arxivImporter = new ArxivImporter()
