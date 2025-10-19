// arXiv Academic Paper Importer

import type { WebImportProvider, ExtractedContent, ContentMetadata } from './types'
import { parseStringPromise } from 'xml2js'

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
      const pdfResponse = await fetch(pdfUrl)

      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`)
      }

      const pdfBuffer = await pdfResponse.arrayBuffer()

      // For now, we'll return the abstract as content
      // In a production environment, you'd parse the PDF here
      // using the existing PDF parser from lib/server-pdf-parser.ts
      const abstract = metadata.description || ''
      const content = `# ${metadata.title}\n\n` +
        `**Authors:** ${Array.isArray(metadata.author) ? metadata.author.join(', ') : metadata.author}\n\n` +
        `**arXiv ID:** ${arxivId}\n\n` +
        `**Published:** ${metadata.publishedDate}\n\n` +
        `## Abstract\n\n${abstract}\n\n` +
        `---\n\n` +
        `*Note: Full PDF content extraction will be available in the next version.*\n` +
        `*For now, you can chat with the abstract and metadata.*\n\n` +
        `**PDF URL:** ${pdfUrl}`

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
