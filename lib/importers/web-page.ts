// Generic Web Page Importer (using Mozilla Readability)

import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'
import type { WebImportProvider, ExtractedContent, ContentMetadata } from './types'

// Dynamic import for JSDOM to avoid ESM/CommonJS issues during build
async function getJSDOM() {
  const { JSDOM } = await import('jsdom')
  return JSDOM
}

export class WebPageImporter implements WebImportProvider {
  name = 'WebPageImporter'
  private turndownService: TurndownService

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    })
  }

  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      // Can handle any HTTP/HTTPS URL that's not handled by specialized importers
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch {
      return false
    }
  }

  async getMetadata(url: string): Promise<ContentMetadata> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SynapticBot/1.0 (+https://synaptic.com/bot)'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      const JSDOM = await getJSDOM()
      const dom = new JSDOM(html, { url })
      const document = dom.window.document

      // Extract metadata
      const title =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
        document.querySelector('title')?.textContent ||
        'Untitled Page'

      const description =
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        document.querySelector('meta[name="description"]')?.getAttribute('content') ||
        ''

      const author =
        document.querySelector('meta[name="author"]')?.getAttribute('content') ||
        document.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
        undefined

      const publishedDate =
        document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
        undefined

      // Extract keywords/tags
      const keywordsContent = document.querySelector('meta[name="keywords"]')?.getAttribute('content')
      const tags = keywordsContent ? keywordsContent.split(',').map(t => t.trim()) : []

      // Estimate reading time based on word count
      const bodyText = document.body?.textContent || ''
      const wordCount = bodyText.trim().split(/\s+/).length
      const readingTime = Math.ceil(wordCount / 250) // 250 words per minute

      return {
        title: title.trim(),
        author,
        publishedDate,
        url,
        sourceType: 'web',
        description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
        tags,
        wordCount,
        readingTime,
        additionalData: {
          domain: new URL(url).hostname
        }
      }
    } catch (error) {
      console.error('Web page metadata fetch error:', error)
      throw new Error(`Failed to fetch page metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async extract(url: string): Promise<ExtractedContent> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SynapticBot/1.0 (+https://synaptic.com/bot)'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      const JSDOM = await getJSDOM()
      const dom = new JSDOM(html, { url })
      const document = dom.window.document

      // Use Readability to extract main content
      const reader = new Readability(document, {
        charThreshold: 100 // Minimum characters for valid article
      })

      const article = reader.parse()

      if (!article) {
        throw new Error('Could not extract readable content from page')
      }

      // Convert HTML to Markdown
      const markdown = this.turndownService.turndown(article.content)

      // Get metadata
      const metadata = await this.getMetadata(url)

      // Construct final content with metadata header
      const content = `# ${article.title || metadata.title}\n\n` +
        (metadata.author ? `**Author:** ${metadata.author}\n\n` : '') +
        (metadata.publishedDate ? `**Published:** ${new Date(metadata.publishedDate).toLocaleDateString()}\n\n` : '') +
        `**Source:** [${new URL(url).hostname}](${url})\n\n` +
        `---\n\n` +
        markdown

      return {
        content,
        metadata: {
          ...metadata,
          title: article.title || metadata.title,
          description: article.excerpt || metadata.description
        },
        format: 'markdown'
      }
    } catch (error) {
      console.error('Web page extraction error:', error)
      throw new Error(`Failed to extract page content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const webPageImporter = new WebPageImporter()
