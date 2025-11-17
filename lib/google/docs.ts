/**
 * Google Docs Integration
 *
 * Import documents from Google Docs
 */

import { google } from 'googleapis'
import { getGoogleOAuth2Client } from './config'

export interface GoogleDocsImportResult {
  title: string
  text: string
  documentId: string
  url: string
  error?: string
}

/**
 * Extract text content from Google Docs document
 */
export async function importGoogleDoc(
  documentId: string,
  accessToken: string
): Promise<GoogleDocsImportResult> {
  try {
    const oauth2Client = getGoogleOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const docs = google.docs({ version: 'v1', auth: oauth2Client })

    // Fetch document
    const response = await docs.documents.get({
      documentId,
    })

    const doc = response.data

    if (!doc.body || !doc.title) {
      return {
        title: '',
        text: '',
        documentId,
        url: `https://docs.google.com/document/d/${documentId}`,
        error: 'Document has no content',
      }
    }

    // Extract text from document structure
    const text = extractTextFromDocument(doc)

    return {
      title: doc.title,
      text,
      documentId,
      url: `https://docs.google.com/document/d/${documentId}`,
    }
  } catch (error) {
    console.error('Google Docs import error:', error)
    return {
      title: '',
      text: '',
      documentId,
      url: `https://docs.google.com/document/d/${documentId}`,
      error: error instanceof Error ? error.message : 'Failed to import document',
    }
  }
}

/**
 * Extract plain text from Google Docs document structure
 */
function extractTextFromDocument(doc: any): string {
  if (!doc.body || !doc.body.content) {
    return ''
  }

  const textParts: string[] = []

  function processElement(element: any) {
    if (element.paragraph) {
      const paragraphText = element.paragraph.elements
        ?.map((el: any) => el.textRun?.content || '')
        .join('')

      if (paragraphText && paragraphText.trim()) {
        textParts.push(paragraphText)
      }
    }

    if (element.table) {
      element.table.tableRows?.forEach((row: any) => {
        row.tableCells?.forEach((cell: any) => {
          cell.content?.forEach((content: any) => {
            processElement(content)
          })
        })
      })
    }

    if (element.tableOfContents) {
      element.tableOfContents.content?.forEach((content: any) => {
        processElement(content)
      })
    }
  }

  doc.body.content.forEach((element: any) => {
    processElement(element)
  })

  return textParts.join('\n').trim()
}

/**
 * Extract Google Docs ID from URL
 */
export function extractDocIdFromUrl(url: string): string | null {
  // https://docs.google.com/document/d/DOCUMENT_ID/edit
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * List recent Google Docs (for picker UI)
 */
export async function listRecentGoogleDocs(
  accessToken: string,
  maxResults = 10
) {
  try {
    const oauth2Client = getGoogleOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    const response = await drive.files.list({
      pageSize: maxResults,
      fields: 'files(id, name, modifiedTime, webViewLink, thumbnailLink)',
      q: "mimeType='application/vnd.google-apps.document' and trashed=false",
      orderBy: 'modifiedTime desc',
    })

    return {
      success: true,
      files: response.data.files || [],
    }
  } catch (error) {
    console.error('List Google Docs error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list documents',
      files: [],
    }
  }
}
