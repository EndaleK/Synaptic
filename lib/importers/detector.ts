// URL Content Type Detector

import type { ContentMetadata } from './types'

export interface DetectedSource {
  type: 'arxiv' | 'youtube' | 'medium' | 'pdf-url' | 'google-docs' | 'web' | 'unsupported'
  confidence: 'high' | 'medium' | 'low'
  preview?: Partial<ContentMetadata>
}

/**
 * Detects the type of content from a URL
 */
export function detectContentType(url: string): DetectedSource {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()
    const pathname = parsedUrl.pathname.toLowerCase()

    // arXiv
    if (hostname.includes('arxiv.org')) {
      const arxivId = pathname.match(/(\d{4}\.\d{4,5})/)?.[1]
      return {
        type: 'arxiv',
        confidence: 'high',
        preview: {
          sourceType: 'arxiv',
          title: arxivId ? `arXiv Paper ${arxivId}` : 'arXiv Paper',
          url
        }
      }
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const videoId = hostname.includes('youtu.be')
        ? pathname.split('/')[1]
        : new URLSearchParams(parsedUrl.search).get('v')

      return {
        type: 'youtube',
        confidence: videoId ? 'high' : 'medium',
        preview: {
          sourceType: 'youtube',
          title: videoId ? `YouTube Video ${videoId}` : 'YouTube Video',
          url
        }
      }
    }

    // Medium
    if (hostname.includes('medium.com') || hostname.match(/\.medium\.com$/)) {
      return {
        type: 'medium',
        confidence: 'high',
        preview: {
          sourceType: 'medium',
          title: 'Medium Article',
          url
        }
      }
    }

    // Google Docs
    if (hostname === 'docs.google.com' && pathname.includes('/document/d/')) {
      const docId = pathname.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1]
      return {
        type: 'google-docs',
        confidence: 'high',
        preview: {
          sourceType: 'google-docs',
          title: 'Google Doc',
          url,
          additionalData: { docId }
        }
      }
    }

    // Direct PDF link
    if (pathname.endsWith('.pdf') || parsedUrl.search.includes('.pdf')) {
      return {
        type: 'pdf-url',
        confidence: 'high',
        preview: {
          sourceType: 'pdf-url',
          title: 'PDF Document',
          url
        }
      }
    }

    // Generic web page
    if (hostname && (pathname || parsedUrl.search)) {
      return {
        type: 'web',
        confidence: 'medium',
        preview: {
          sourceType: 'web',
          title: 'Web Page',
          url
        }
      }
    }

    return {
      type: 'unsupported',
      confidence: 'low'
    }
  } catch (error) {
    console.error('URL detection error:', error)
    return {
      type: 'unsupported',
      confidence: 'low'
    }
  }
}

/**
 * Validates if a URL is supported for import
 */
export function isUrlSupported(url: string): boolean {
  const detected = detectContentType(url)
  return detected.type !== 'unsupported'
}

/**
 * Extracts human-readable source name
 */
export function getSourceName(type: DetectedSource['type']): string {
  const names: Record<typeof type, string> = {
    'arxiv': 'arXiv Paper',
    'youtube': 'YouTube Video',
    'medium': 'Medium Article',
    'pdf-url': 'PDF Document',
    'google-docs': 'Google Doc',
    'web': 'Web Page',
    'unsupported': 'Unsupported'
  }
  return names[type]
}
