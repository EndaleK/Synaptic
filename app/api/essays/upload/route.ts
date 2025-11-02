import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { parseServerPDF, isPDFFile } from '@/lib/server-pdf-parser'
import { generateUniqueTitle } from '@/lib/document-to-html'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check content type to determine processing method
    const contentType = request.headers.get('content-type') || ''

    let title: string
    let content: string
    let plainText: string
    let wordCount: number

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload (PDF)
      const formData = await request.formData()
      const file = formData.get('file') as File
      const titleFromForm = formData.get('title') as string

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      title = titleFromForm || file.name.replace(/\.(pdf|docx|doc|txt)$/i, '')

      // Process PDF server-side
      if (isPDFFile(file)) {
        const pdfResult = await parseServerPDF(file)

        if (pdfResult.error) {
          return NextResponse.json({ error: pdfResult.error }, { status: 400 })
        }

        plainText = pdfResult.text

        // Convert plain text to basic HTML paragraphs
        const paragraphs = plainText
          .split(/\n\n+/)
          .filter(p => p.trim())
          .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('\n')

        content = paragraphs || '<p></p>'
        wordCount = plainText.trim().split(/\s+/).filter(w => w.length > 0).length
      } else {
        return NextResponse.json(
          { error: 'File upload only supports PDF. Use JSON body for DOCX/DOC/TXT.' },
          { status: 400 }
        )
      }
    } else {
      // Handle JSON body (DOCX/DOC/TXT already converted client-side)
      const body = await request.json()

      title = body.title || 'Untitled Essay'
      content = body.content || '<p></p>'
      plainText = body.plainText || ''
      wordCount = body.wordCount || 0
    }

    // Check for duplicate titles
    const { data: existingEssays } = await supabase
      .from('essays')
      .select('title')
      .eq('user_id', userId)
      .eq('title', title)

    if (existingEssays && existingEssays.length > 0) {
      // Auto-rename with timestamp
      title = generateUniqueTitle(title)
    }

    // Get user profile to link essay
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Save essay to database
    const { data: essay, error: essayError } = await supabase
      .from('essays')
      .insert({
        user_id: profile.id,
        title,
        content,
        word_count: wordCount,
        writing_type: 'academic', // Default, can be changed later
        citation_style: 'APA', // Default
        version_history: [
          {
            version: 1,
            content,
            timestamp: new Date().toISOString(),
            changes: 'Initial upload'
          }
        ]
      })
      .select()
      .single()

    if (essayError) {
      console.error('Error saving essay:', essayError)
      return NextResponse.json({ error: 'Failed to save essay' }, { status: 500 })
    }

    return NextResponse.json({
      essayId: essay.id,
      title: essay.title,
      content: essay.content,
      wordCount: essay.word_count
    })
  } catch (error) {
    console.error('Essay upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload essay' },
      { status: 500 }
    )
  }
}
