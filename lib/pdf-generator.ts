import jsPDF from 'jspdf'
import type { StudyGuideContent } from './study-guide-generator'

export interface PDFGenerationOptions {
  studyGuide: StudyGuideContent
  documentTitle: string
  studyDuration?: string
  difficultyLevel?: string
}

/**
 * Generate a professionally formatted PDF from study guide content
 */
export async function generateStudyGuidePDF(options: PDFGenerationOptions): Promise<Blob> {
  const { studyGuide, documentTitle, studyDuration, difficultyLevel } = options

  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let yPosition = margin

  // Helper: Add new page if needed
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Helper: Sanitize text to remove problematic Unicode characters
  const sanitizeText = (text: string): string => {
    return text
      // Normalize Unicode to decomposed form then recompose
      .normalize('NFKC')
      // Replace smart quotes with regular quotes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // Replace em/en dashes with hyphens
      .replace(/[\u2013\u2014]/g, '-')
      // Replace ellipsis
      .replace(/\u2026/g, '...')
      // Replace non-breaking spaces with regular spaces
      .replace(/\u00A0/g, ' ')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Trim whitespace
      .trim()
  }

  // Helper: Add text with word wrap
  const addText = (text: string, fontSize: number, isBold: boolean = false, indentLevel: number = 0) => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')

    // Sanitize the text first
    const cleanText = sanitizeText(text)

    const indent = indentLevel * 5
    const maxWidth = contentWidth - indent

    // Split text manually to avoid jsPDF splitTextToSize issues with Unicode
    const words = cleanText.split(' ')
    let currentLine = ''
    const lines: string[] = []

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = doc.getTextWidth(testLine)

      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })

    if (currentLine) {
      lines.push(currentLine)
    }

    lines.forEach((line: string) => {
      checkPageBreak()
      doc.text(line, margin + indent, yPosition)
      yPosition += fontSize * 0.4 // Line spacing
    })
  }

  // Cover Page
  doc.setFillColor(107, 70, 193) // Purple gradient start
  doc.rect(0, 0, pageWidth, 80, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('Study Guide', pageWidth / 2, 35, { align: 'center' })

  doc.setFontSize(20)
  doc.setFont('helvetica', 'normal')
  doc.text(studyGuide.title, pageWidth / 2, 50, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  yPosition = 100

  // Metadata
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`Generated: ${currentDate}`, margin, yPosition)
  yPosition += 6
  doc.text(`Source Document: ${documentTitle}`, margin, yPosition)
  yPosition += 6
  if (studyDuration) {
    doc.text(`Study Duration: ${studyDuration}`, margin, yPosition)
    yPosition += 6
  }
  if (difficultyLevel) {
    doc.text(`Difficulty Level: ${difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)}`, margin, yPosition)
    yPosition += 6
  }

  yPosition += 10

  // Executive Summary
  checkPageBreak(30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(107, 70, 193)
  doc.text('Executive Summary', margin, yPosition)
  yPosition += 8
  doc.setTextColor(0, 0, 0)

  addText(studyGuide.summary, 11)
  yPosition += 10

  // Learning Objectives
  checkPageBreak(30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(107, 70, 193)
  doc.text('Learning Objectives', margin, yPosition)
  yPosition += 8
  doc.setTextColor(0, 0, 0)

  studyGuide.learningObjectives.forEach((objective, index) => {
    checkPageBreak(15)
    addText(`${index + 1}. ${objective}`, 11, false, 0)
    yPosition += 3
  })
  yPosition += 7

  // Key Concepts
  checkPageBreak(30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(107, 70, 193)
  doc.text('Key Concepts', margin, yPosition)
  yPosition += 8
  doc.setTextColor(0, 0, 0)

  studyGuide.keyConcepts.forEach((concept, index) => {
    checkPageBreak(25)

    // Concept title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${index + 1}. ${concept.title}`, margin, yPosition)
    yPosition += 7

    // Concept content
    addText(concept.content, 11)
    yPosition += 5

    // Subsections
    if (concept.subsections && concept.subsections.length > 0) {
      concept.subsections.forEach((subsection) => {
        checkPageBreak(20)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`• ${subsection.title}`, margin + 5, yPosition)
        yPosition += 6

        addText(subsection.content, 10, false, 2)
        yPosition += 4
      })
    }

    yPosition += 5
  })

  // Practice Questions
  doc.addPage()
  yPosition = margin

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(107, 70, 193)
  doc.text('Practice Questions', margin, yPosition)
  yPosition += 10
  doc.setTextColor(0, 0, 0)

  // Multiple Choice
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Multiple Choice', margin, yPosition)
  yPosition += 8

  studyGuide.practiceQuestions.multipleChoice.forEach((q, index) => {
    checkPageBreak(30)

    addText(`${index + 1}. ${q.question}`, 11, true)
    yPosition += 3

    q.options.forEach((option, optIndex) => {
      const prefix = String.fromCharCode(65 + optIndex) // A, B, C, D
      addText(`   ${prefix}) ${option}`, 10, false, 1)
      yPosition += 3
    })

    yPosition += 2
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(70, 70, 70)
    const correctLetter = String.fromCharCode(65 + q.correctAnswer)
    doc.text(`Answer: ${correctLetter} - ${q.explanation}`, margin + 5, yPosition)
    yPosition += 6
    doc.setTextColor(0, 0, 0)
  })

  yPosition += 5

  // Short Answer
  checkPageBreak(30)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Short Answer Questions', margin, yPosition)
  yPosition += 8

  studyGuide.practiceQuestions.shortAnswer.forEach((q, index) => {
    checkPageBreak(15)
    addText(`${index + 1}. ${q}`, 11)
    yPosition += 8
  })

  yPosition += 5

  // Essay Prompts
  checkPageBreak(30)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Essay Prompts', margin, yPosition)
  yPosition += 8

  studyGuide.practiceQuestions.essay.forEach((q, index) => {
    checkPageBreak(15)
    addText(`${index + 1}. ${q}`, 11)
    yPosition += 8
  })

  // Study Schedule
  doc.addPage()
  yPosition = margin

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(107, 70, 193)
  doc.text('Study Schedule', margin, yPosition)
  yPosition += 8
  doc.setTextColor(0, 0, 0)

  addText(studyGuide.studySchedule.timeline, 11)
  yPosition += 8

  studyGuide.studySchedule.milestones.forEach((milestone) => {
    checkPageBreak(25)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Day ${milestone.day}: ${milestone.topic}`, margin, yPosition)
    yPosition += 6

    milestone.activities.forEach((activity) => {
      checkPageBreak(10)
      addText(`• ${activity}`, 10, false, 1)
      yPosition += 3
    })

    yPosition += 5
  })

  // Recommended Resources
  if (studyGuide.resources.length > 0) {
    checkPageBreak(30)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 70, 193)
    doc.text('Recommended Resources', margin, yPosition)
    yPosition += 8
    doc.setTextColor(0, 0, 0)

    studyGuide.resources.forEach((resource) => {
      checkPageBreak(10)
      addText(`• ${resource}`, 10)
      yPosition += 5
    })
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Generated by Synaptic - Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Generate blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Calculate estimated PDF size before generation
 */
export function estimatePDFSize(studyGuide: StudyGuideContent): number {
  // Rough estimation: ~50KB base + ~1KB per key concept + ~0.5KB per question
  const baseSize = 50000
  const conceptSize = studyGuide.keyConcepts.length * 1000
  const questionSize = (
    studyGuide.practiceQuestions.multipleChoice.length +
    studyGuide.practiceQuestions.shortAnswer.length +
    studyGuide.practiceQuestions.essay.length
  ) * 500

  return baseSize + conceptSize + questionSize
}
