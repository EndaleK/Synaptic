// arXiv Academic Paper Importer
// Uses HTML rendering as primary source, with PDF fallback

import type { WebImportProvider, ExtractedContent, ContentMetadata } from './types'
import { parseStringPromise } from 'xml2js'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

// HTML extraction using Cheerio (works on Vercel - no JSDOM ESM issues)
async function extractFromHTML(arxivId: string): Promise<{ text: string; error?: string; method?: string }> {
  try {
    // arXiv provides HTML versions at https://arxiv.org/html/{id}
    const htmlUrl = `https://arxiv.org/html/${arxivId}`
    console.log(`[arXiv] Trying HTML extraction from: ${htmlUrl}`)

    const response = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'SynapticBot/1.0 (+https://synaptic.study/bot)'
      }
    })

    console.log(`[arXiv] HTML fetch response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      console.log(`[arXiv] HTML not available: ${response.status}`)
      return { text: '', error: `HTML not available (${response.status})` }
    }

    const html = await response.text()
    console.log(`[arXiv] HTML fetched: ${html.length} bytes`)

    // Use Cheerio to parse HTML (lightweight, Vercel-compatible)
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script, style, nav, header, footer, .ltx_page_header, .ltx_page_footer, .ltx_bibliography').remove()

    // Try to find the main article content
    let articleHtml = ''

    // arXiv HTML uses ltx_document class for main content
    const ltxDocument = $('.ltx_document')
    if (ltxDocument.length > 0) {
      articleHtml = ltxDocument.html() || ''
      console.log(`[arXiv] Found .ltx_document: ${articleHtml.length} chars`)
    }

    // Fallback to article tag
    if (!articleHtml || articleHtml.length < 500) {
      const article = $('article')
      if (article.length > 0) {
        articleHtml = article.html() || ''
        console.log(`[arXiv] Found <article>: ${articleHtml.length} chars`)
      }
    }

    // Fallback to main tag
    if (!articleHtml || articleHtml.length < 500) {
      const main = $('main')
      if (main.length > 0) {
        articleHtml = main.html() || ''
        console.log(`[arXiv] Found <main>: ${articleHtml.length} chars`)
      }
    }

    // Final fallback to body
    if (!articleHtml || articleHtml.length < 500) {
      articleHtml = $('body').html() || ''
      console.log(`[arXiv] Using <body>: ${articleHtml.length} chars`)
    }

    if (!articleHtml || articleHtml.length < 500) {
      return { text: '', error: `HTML extraction returned insufficient content (${articleHtml?.length || 0} chars)` }
    }

    // Convert to markdown for better formatting
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    })

    const markdown = turndown.turndown(articleHtml)

    console.log(`[arXiv] ✅ HTML extraction successful: ${markdown.length} chars`)
    return { text: markdown, method: 'html-cheerio' }
  } catch (error) {
    console.error('[arXiv] HTML extraction failed:', error)
    return { text: '', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// PDF extraction using pdf-parse (fallback for older papers)
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
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`
      const abstract = metadata.description || ''

      // Build header content
      let content = `# ${metadata.title}\n\n` +
        `**Authors:** ${Array.isArray(metadata.author) ? metadata.author.join(', ') : metadata.author}\n\n` +
        `**arXiv ID:** ${arxivId}\n\n` +
        `**Published:** ${metadata.publishedDate}\n\n` +
        `**PDF URL:** ${pdfUrl}\n\n`

      // TIER 1: Try HTML extraction first (works on Vercel, best formatting)
      const htmlResult = await extractFromHTML(arxivId)
      if (!htmlResult.error && htmlResult.text && htmlResult.text.length > 500) {
        console.log(`[arXiv] ✅ Successfully extracted ${htmlResult.text.length} characters using HTML`)
        content += `## Abstract\n\n${abstract}\n\n` +
          `---\n\n` +
          `## Full Paper Content\n\n${htmlResult.text}`

        return {
          content,
          metadata: {
            ...metadata,
            additionalData: {
              ...metadata.additionalData,
              extractionMethod: 'html'
            }
          },
          format: 'markdown'
        }
      }

      // TIER 2: Try PDF extraction with pdf-parse (fallback for older papers)
      console.log('[arXiv] HTML not available, trying PDF extraction...')
      const pdfResponse = await fetch(pdfUrl, {
        headers: {
          'User-Agent': 'SynapticBot/1.0 (+https://synaptic.study/bot)'
        }
      })

      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`)
      }

      const arrayBuffer = await pdfResponse.arrayBuffer()
      const pdfBuffer = Buffer.from(arrayBuffer)
      const fileSizeMB = pdfBuffer.length / (1024 * 1024)
      console.log(`[arXiv] Downloaded PDF: ${fileSizeMB.toFixed(2)} MB`)

      let pdfText = ''
      let extractionMethod = 'none'

      const pdfParseResult = await parsePDFWithPdfParse(pdfBuffer)
      if (!pdfParseResult.error && pdfParseResult.text && pdfParseResult.text.length > 100) {
        pdfText = pdfParseResult.text
        extractionMethod = pdfParseResult.method || 'pdf-parse'
      } else {
        // TIER 3: Try PyMuPDF (only works locally, not on Vercel)
        console.log('[arXiv] pdf-parse failed, trying PyMuPDF...')
        const pymupdfResult = await parsePDFWithPyMuPDF(pdfBuffer)
        if (!pymupdfResult.error && pymupdfResult.text && pymupdfResult.text.length > 100) {
          pdfText = pymupdfResult.text
          extractionMethod = pymupdfResult.method || 'pymupdf'
        }
      }

      if (pdfText && pdfText.length > 100) {
        console.log(`[arXiv] ✅ Successfully extracted ${pdfText.length} characters using ${extractionMethod}`)
        content += `## Abstract\n\n${abstract}\n\n` +
          `---\n\n` +
          `## Full Paper Content\n\n${pdfText}`
      } else {
        // Final fallback to abstract only
        console.warn('[arXiv] ⚠️ All extraction methods failed, returning abstract only')
        content += `## Abstract\n\n${abstract}\n\n` +
          `---\n\n` +
          `*Note: Could not extract full paper content. This may be a scanned PDF or complex layout.*\n` +
          `*You can still chat with the abstract and download the PDF manually from the link above.*`
      }

      return {
        content,
        metadata: {
          ...metadata,
          additionalData: {
            ...metadata.additionalData,
            extractionMethod: extractionMethod
          }
        },
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
