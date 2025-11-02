import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { essayId, format } = await request.json()

    if (!essayId || !format) {
      return NextResponse.json(
        { error: 'Essay ID and format are required' },
        { status: 400 }
      )
    }

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json(
        { error: 'Format must be pdf or docx' },
        { status: 400 }
      )
    }

    // Get essay from database
    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { data: essay, error } = await supabase
      .from('essays')
      .select('*')
      .eq('id', essayId)
      .eq('user_id', profile.id)
      .single()

    if (error || !essay) {
      return NextResponse.json(
        { error: 'Essay not found' },
        { status: 404 }
      )
    }

    if (format === 'pdf') {
      // Generate PDF using jsPDF
      const doc = new jsPDF()

      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(essay.title, 20, 20)

      // Metadata
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Type: ${essay.writing_type}`, 20, 30)
      doc.text(`Citation Style: ${essay.citation_style || 'N/A'}`, 20, 35)
      doc.text(`Word Count: ${essay.word_count}`, 20, 40)
      doc.text(`Date: ${new Date(essay.created_at).toLocaleDateString()}`, 20, 45)

      // Content
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')

      // Strip HTML tags from content (simple version)
      const plainText = essay.content.replace(/<[^>]*>/g, '')

      // Split text into lines that fit on page
      const splitText = doc.splitTextToSize(plainText, 170)
      doc.text(splitText, 20, 55)

      // Citations section
      if (essay.cited_sources && essay.cited_sources.length > 0) {
        const citationsY = 55 + (splitText.length * 5) + 20
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('References', 20, citationsY)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        let currentY = citationsY + 10

        essay.cited_sources.forEach((citation: any, index: number) => {
          const citationText = `${index + 1}. ${citation.author}. ${citation.title}. ${citation.publication_date || 'n.d.'}`
          const splitCitation = doc.splitTextToSize(citationText, 170)
          doc.text(splitCitation, 20, currentY)
          currentY += splitCitation.length * 5 + 3
        })
      }

      const pdfBuffer = doc.output('arraybuffer')

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${essay.title}.pdf"`
        }
      })
    } else {
      // Generate DOCX using docx library
      const paragraphs = []

      // Title
      paragraphs.push(
        new Paragraph({
          text: essay.title,
          heading: HeadingLevel.HEADING_1
        })
      )

      // Metadata
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Type: ${essay.writing_type} | `, bold: true }),
            new TextRun({ text: `Citation Style: ${essay.citation_style || 'N/A'} | `, bold: true }),
            new TextRun({ text: `Word Count: ${essay.word_count}`, bold: true })
          ]
        })
      )

      paragraphs.push(new Paragraph({ text: '' })) // Empty line

      // Content (strip HTML - simplified)
      const plainText = essay.content.replace(/<[^>]*>/g, '')
      const contentParagraphs = plainText.split('\n').filter(p => p.trim())

      contentParagraphs.forEach(text => {
        paragraphs.push(new Paragraph({ text }))
      })

      // Citations
      if (essay.cited_sources && essay.cited_sources.length > 0) {
        paragraphs.push(new Paragraph({ text: '' })) // Empty line
        paragraphs.push(
          new Paragraph({
            text: 'References',
            heading: HeadingLevel.HEADING_2
          })
        )

        essay.cited_sources.forEach((citation: any, index: number) => {
          paragraphs.push(
            new Paragraph({
              text: `${index + 1}. ${citation.author}. ${citation.title}. ${citation.publication_date || 'n.d.'}`
            })
          )
        })
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      })

      const docxBuffer = await Packer.toBuffer(doc)

      return new NextResponse(docxBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${essay.title}.docx"`
        }
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export essay' },
      { status: 500 }
    )
  }
}
