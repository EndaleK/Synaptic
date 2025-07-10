interface DocumentMetadata {
  title: string
  type: string
  size: number
  pages?: number
  createdAt: Date
  extractedAt: Date
}

interface DocumentSection {
  title: string
  content: string
  startIndex: number
  length: number
  level: number
}

export interface DocumentJSON {
  metadata: DocumentMetadata
  sections: DocumentSection[]
  fullText: string
  summary: string
}

export function convertTextToDocumentJSON(
  text: string, 
  fileName: string, 
  fileType: string, 
  fileSize: number
): DocumentJSON {
  console.log(`Converting ${fileName} to JSON structure`)
  
  const metadata: DocumentMetadata = {
    title: extractDocumentTitle(text, fileName),
    type: fileType,
    size: fileSize,
    createdAt: new Date(),
    extractedAt: new Date()
  }
  
  const sections = extractSections(text)
  const summary = generateSummary(text)
  
  return {
    metadata,
    sections,
    fullText: text,
    summary
  }
}

function extractDocumentTitle(text: string, fileName: string): string {
  // Try to extract title from first lines of text
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  if (lines.length > 0) {
    const firstLine = lines[0].trim()
    // If first line looks like a title (short, capitalized, no periods)
    if (firstLine.length < 100 && firstLine.length > 5 && !firstLine.endsWith('.')) {
      return firstLine
    }
  }
  
  // Fallback to filename without extension
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
}

function extractSections(text: string): DocumentSection[] {
  const sections: DocumentSection[] = []
  const lines = text.split('\n')
  let currentSection = ""
  let currentTitle = "Introduction"
  let startIndex = 0
  let sectionCount = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check if line looks like a heading (various patterns)
    const isHeading = isLikelyHeading(line, i, lines)
    
    if (isHeading && currentSection.length > 100) {
      // Save previous section
      sections.push({
        title: currentTitle,
        content: currentSection.trim(),
        startIndex,
        length: currentSection.length,
        level: 1
      })
      
      // Start new section
      currentTitle = line || `Section ${sectionCount + 1}`
      currentSection = ""
      startIndex = text.indexOf(currentSection, startIndex + currentSection.length)
      sectionCount++
    } else {
      currentSection += line + "\n"
    }
  }
  
  // Add final section
  if (currentSection.trim().length > 0) {
    sections.push({
      title: currentTitle,
      content: currentSection.trim(),
      startIndex,
      length: currentSection.length,
      level: 1
    })
  }
  
  // If no sections found, create one main section
  if (sections.length === 0) {
    sections.push({
      title: "Main Content",
      content: text,
      startIndex: 0,
      length: text.length,
      level: 1
    })
  }
  
  console.log(`Extracted ${sections.length} sections`)
  return sections
}

function isLikelyHeading(line: string, index: number, allLines: string[]): boolean {
  if (line.length === 0 || line.length > 100) return false
  
  // Check for common heading patterns
  const headingPatterns = [
    /^\d+\.\s/, // "1. Title"
    /^Chapter \d+/i, // "Chapter 1"
    /^Section \d+/i, // "Section 1"
    /^[A-Z][A-Z\s]+$/, // "ALL CAPS TITLE"
    /^\d+\.\d+/, // "1.1 Subtitle"
  ]
  
  if (headingPatterns.some(pattern => pattern.test(line))) {
    return true
  }
  
  // Check if next line is empty (common after headings)
  if (index + 1 < allLines.length && allLines[index + 1].trim() === "") {
    return true
  }
  
  return false
}

function generateSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const maxSentences = Math.min(3, sentences.length)
  
  return sentences.slice(0, maxSentences)
    .map(s => s.trim())
    .join('. ') + '.'
}