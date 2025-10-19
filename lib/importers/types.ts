// Web Content Importer Types

export interface ContentMetadata {
  title: string
  author?: string | string[]
  publishedDate?: string
  url: string
  sourceType: 'arxiv' | 'youtube' | 'web' | 'medium' | 'pdf-url' | 'unknown'
  description?: string
  tags?: string[]
  wordCount?: number
  readingTime?: number
  additionalData?: Record<string, any>
}

export interface ExtractedContent {
  content: string
  metadata: ContentMetadata
  format: 'text' | 'markdown' | 'html'
}

export interface WebImportProvider {
  name: string
  canHandle(url: string): boolean
  extract(url: string): Promise<ExtractedContent>
  getMetadata(url: string): Promise<ContentMetadata>
}

export interface ImportResult {
  success: boolean
  content?: ExtractedContent
  error?: string
}
