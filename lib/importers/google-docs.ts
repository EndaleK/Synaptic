// Google Docs Importer
// Supports both public (via export URL) and private (via OAuth) docs

import type { WebImportProvider, ExtractedContent, ContentMetadata } from './types'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import { importGoogleDoc } from '@/lib/google/docs'

export class GoogleDocsImporter implements WebImportProvider {
  name = 'GoogleDocsImporter'

  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return parsedUrl.hostname === 'docs.google.com' && parsedUrl.pathname.includes('/document/d/')
    } catch {
      return false
    }
  }

  /**
   * Extract Google Docs ID from URL
   */
  extractDocId(url: string): string | null {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  async getMetadata(url: string): Promise<ContentMetadata> {
    const docId = this.extractDocId(url)

    // Try to get title from public HTML
    try {
      const htmlUrl = `https://docs.google.com/document/d/${docId}/export?format=html`
      const response = await fetch(htmlUrl, {
        headers: {
          'User-Agent': 'SynapticBot/1.0 (+https://synaptic.study/bot)'
        }
      })

      if (response.ok) {
        const html = await response.text()
        const $ = cheerio.load(html)
        const title = $('title').text().trim() || 'Google Doc'

        return {
          title,
          url,
          sourceType: 'google-docs',
          additionalData: { docId }
        }
      }
    } catch {
      // Fall through to default
    }

    return {
      title: 'Google Doc',
      url,
      sourceType: 'google-docs',
      additionalData: { docId }
    }
  }

  /**
   * Extract content from a public Google Doc (via export URL)
   * Works for docs shared with "Anyone with the link"
   */
  async extract(url: string): Promise<ExtractedContent> {
    const docId = this.extractDocId(url)

    if (!docId) {
      throw new Error('Invalid Google Docs URL - could not extract document ID')
    }

    console.log(`[GoogleDocs] Attempting public extraction for doc: ${docId}`)

    // Try public HTML export first
    const htmlUrl = `https://docs.google.com/document/d/${docId}/export?format=html`

    try {
      const response = await fetch(htmlUrl, {
        headers: {
          'User-Agent': 'SynapticBot/1.0 (+https://synaptic.study/bot)'
        },
        redirect: 'follow'
      })

      console.log(`[GoogleDocs] HTML export response: ${response.status} ${response.statusText}`)

      // 404 or forbidden means the doc is private
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        console.log('[GoogleDocs] Document is private, requires OAuth')
        return {
          content: '',
          metadata: {
            title: 'Google Doc',
            url,
            sourceType: 'google-docs',
            additionalData: {
              docId,
              requiresAuth: true,
              error: 'This document is private. Share it publicly or connect your Google account.'
            }
          },
          format: 'markdown'
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`)
      }

      const html = await response.text()
      console.log(`[GoogleDocs] HTML fetched: ${html.length} bytes`)

      // Parse HTML with Cheerio
      const $ = cheerio.load(html)

      // Extract title
      const title = $('title').text().trim() || 'Google Doc'

      // Remove script and style tags
      $('script, style').remove()

      // Get the body content
      const bodyHtml = $('body').html() || ''

      if (!bodyHtml || bodyHtml.length < 50) {
        throw new Error('Document appears to be empty')
      }

      // Convert to markdown
      const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
      })

      // Add rule to handle Google Docs spans/divs
      turndown.addRule('googleDocsFormatting', {
        filter: (node: HTMLElement) => {
          return (node.nodeName === 'SPAN' || node.nodeName === 'DIV') &&
            node.getAttribute('style') !== null
        },
        replacement: (content: string) => content
      })

      let markdown = turndown.turndown(bodyHtml)

      // Clean up markdown
      markdown = markdown.replace(/\n{3,}/g, '\n\n')
      markdown = markdown.replace(/\u00A0/g, ' ') // Replace non-breaking spaces

      // Estimate reading time
      const wordCount = markdown.split(/\s+/).length
      const readingTime = Math.ceil(wordCount / 250)

      console.log(`[GoogleDocs] Successfully extracted: ${markdown.length} chars, ${wordCount} words`)

      return {
        content: `# ${title}\n\n${markdown}`,
        metadata: {
          title,
          url,
          sourceType: 'google-docs',
          wordCount,
          readingTime,
          additionalData: {
            docId,
            extractionMethod: 'public-html-export'
          }
        },
        format: 'markdown'
      }

    } catch (error) {
      console.error('[GoogleDocs] Public extraction failed:', error)

      // Return a result that indicates auth is needed
      return {
        content: '',
        metadata: {
          title: 'Google Doc',
          url,
          sourceType: 'google-docs',
          additionalData: {
            docId,
            requiresAuth: true,
            error: error instanceof Error ? error.message : 'Failed to extract document'
          }
        },
        format: 'markdown'
      }
    }
  }

  /**
   * Extract content from a private Google Doc using OAuth
   * Requires user's access token from Google OAuth flow
   */
  async extractWithAuth(url: string, accessToken: string): Promise<ExtractedContent> {
    const docId = this.extractDocId(url)

    if (!docId) {
      throw new Error('Invalid Google Docs URL - could not extract document ID')
    }

    console.log(`[GoogleDocs] Attempting OAuth extraction for doc: ${docId}`)

    try {
      // Use existing importGoogleDoc function from lib/google/docs.ts
      const result = await importGoogleDoc(docId, accessToken)

      if (result.error) {
        throw new Error(result.error)
      }

      // Estimate reading time
      const wordCount = result.text.split(/\s+/).length
      const readingTime = Math.ceil(wordCount / 250)

      console.log(`[GoogleDocs] OAuth extraction successful: ${result.text.length} chars, ${wordCount} words`)

      return {
        content: `# ${result.title}\n\n${result.text}`,
        metadata: {
          title: result.title,
          url: result.url,
          sourceType: 'google-docs',
          wordCount,
          readingTime,
          additionalData: {
            docId: result.documentId,
            extractionMethod: 'google-docs-api'
          }
        },
        format: 'markdown'
      }

    } catch (error) {
      console.error('[GoogleDocs] OAuth extraction failed:', error)
      throw new Error(`Failed to import Google Doc: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const googleDocsImporter = new GoogleDocsImporter()
