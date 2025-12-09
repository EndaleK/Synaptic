/**
 * Chapter/Section Extraction Utility
 *
 * Extracts chapter structure from PDF text using AI pattern matching
 * and heuristics. Used for lazy RAG indexing to let users select
 * specific chapters to index rather than entire textbook.
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface Chapter {
  id: string
  title: string
  pageStart: number
  pageEnd?: number
  level: number // 1 = chapter, 2 = section, 3 = subsection
  selected?: boolean
}

export interface ChapterExtractionResult {
  chapters: Chapter[]
  totalPages: number
  extractionMethod: 'ai' | 'heuristic' | 'fallback'
}

/**
 * Extract chapter structure from PDF text
 * Uses AI for accurate extraction, falls back to heuristics if needed
 */
export async function extractChapters(
  pdfText: string,
  metadata?: {
    fileName?: string
    pageCount?: number
  }
): Promise<ChapterExtractionResult> {
  try {
    // Try AI-based extraction first (most accurate)
    const aiResult = await extractChaptersWithAI(pdfText, metadata)
    if (aiResult.chapters.length > 0) {
      return aiResult
    }

    // Fall back to heuristic extraction
    console.log('⚠️ AI extraction returned no chapters, falling back to heuristics')
    return extractChaptersHeuristic(pdfText, metadata)
  } catch (error) {
    console.error('❌ Chapter extraction failed:', error)

    // Try heuristic extraction as last resort
    try {
      return extractChaptersHeuristic(pdfText, metadata)
    } catch (heuristicError) {
      console.error('❌ Heuristic extraction also failed:', heuristicError)

      // Return fallback: entire document as single chapter
      return {
        chapters: [{
          id: 'full-document',
          title: metadata?.fileName || 'Full Document',
          pageStart: 1,
          pageEnd: metadata?.pageCount,
          level: 1,
          selected: true
        }],
        totalPages: metadata?.pageCount || 1,
        extractionMethod: 'fallback'
      }
    }
  }
}

/**
 * AI-based chapter extraction using GPT-4o-mini
 * Analyzes text structure and identifies chapter boundaries
 */
async function extractChaptersWithAI(
  pdfText: string,
  metadata?: {
    fileName?: string
    pageCount?: number
  }
): Promise<ChapterExtractionResult> {
  // Truncate text to first 100K characters for extraction
  // Medical textbooks like Toronto Notes have extensive TOCs that need more context
  const sampleText = pdfText.substring(0, 100000)

  // Detect if this might be a medical textbook based on filename or content
  const isMedicalTextbook =
    /toronto\s*notes|medical|clinical|medicine|surgery|pediatrics|cardiology|nephrology|neurology|psychiatry|pathology|pharmacology|anatomy/i.test(metadata?.fileName || '') ||
    /diagnosis|treatment|pathophysiology|etiology|clinical\s*presentation/i.test(sampleText.substring(0, 10000))

  const prompt = `Analyze this document excerpt and extract its chapter/section structure.

Document: ${metadata?.fileName || 'Unknown'}
Total Pages: ${metadata?.pageCount || 'Unknown'}
${isMedicalTextbook ? 'Document Type: Medical Textbook (extract ALL medical specialty chapters)' : ''}

Text Sample:
${sampleText}

---

Extract the chapter structure as a JSON array. For each chapter/section:
1. Extract the title (clean, without chapter numbers)
2. Identify the starting page number (if mentioned in text, TOC, or headers)
3. Determine the hierarchy level (1=chapter/specialty, 2=section, 3=subsection)

Return ONLY a JSON array in this format:
[
  {"title": "Introduction", "pageStart": 1, "level": 1},
  {"title": "Background", "pageStart": 5, "level": 2},
  {"title": "Methods", "pageStart": 15, "level": 1}
]

Rules:
- Look for Table of Contents, Index, or chapter headings with page numbers
- For medical textbooks: Include ALL specialties (Cardiology, Nephrology, Surgery, Psychiatry, etc.)
- Page numbers may appear as "page 5", "p. 5", "5", or after a title like "Cardiology...45"
- If page numbers aren't clear, estimate based on content order and document length
- Focus on main chapters (level 1) and major sections (level 2)
- Skip minor subsections unless the document has few main chapters
- Maximum 50 chapters/sections (medical textbooks often have 20-30+ specialties)
- Return empty array [] if no clear structure found`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a document structure analyzer specializing in textbooks and academic materials. Extract chapter/section hierarchies accurately from Tables of Contents, Index pages, and chapter headings. Return only valid JSON arrays.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 4000, // Increased for medical textbooks with many chapters
  })

  const content = response.choices[0].message.content?.trim() || '[]'

  // Parse AI response
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) ||
                      content.match(/(\[[\s\S]*\])/)

    if (!jsonMatch) {
      console.warn('⚠️ No JSON found in AI response')
      return { chapters: [], totalPages: metadata?.pageCount || 1, extractionMethod: 'ai' }
    }

    const chaptersData = JSON.parse(jsonMatch[1])

    // Sort chapters by page number to ensure correct page end calculations
    const sortedData = [...chaptersData]
      .filter((ch: any) => ch.title && ch.pageStart)
      .sort((a: any, b: any) => (parseInt(a.pageStart) || 0) - (parseInt(b.pageStart) || 0))

    // Validate and format chapters
    const chapters: Chapter[] = sortedData
      .map((ch: any, index: number) => ({
        id: `chapter-${index}`,
        title: ch.title.trim(),
        pageStart: parseInt(ch.pageStart) || 1,
        pageEnd: sortedData[index + 1]?.pageStart ? parseInt(sortedData[index + 1].pageStart) - 1 : metadata?.pageCount,
        level: parseInt(ch.level) || 1,
        selected: false
      }))
      .slice(0, 50) // Limit to 50 chapters (increased for medical textbooks)

    console.log(`✅ AI extracted ${chapters.length} chapters`)

    return {
      chapters,
      totalPages: metadata?.pageCount || Math.max(...chapters.map(ch => ch.pageEnd || 0)),
      extractionMethod: 'ai'
    }
  } catch (parseError) {
    console.error('❌ Failed to parse AI response:', parseError)
    return { chapters: [], totalPages: metadata?.pageCount || 1, extractionMethod: 'ai' }
  }
}

/**
 * Heuristic-based chapter extraction
 * Uses pattern matching to find chapter headers (e.g., "Chapter 1", "Section 2.1")
 */
function extractChaptersHeuristic(
  pdfText: string,
  metadata?: {
    fileName?: string
    pageCount?: number
  }
): ChapterExtractionResult {
  const chapters: Chapter[] = []

  // Common chapter patterns
  const patterns = [
    /(?:^|\n)\s*Chapter\s+(\d+)[:\s]+([^\n]{1,100})/gi,
    /(?:^|\n)\s*CHAPTER\s+(\d+)[:\s]+([^\n]{1,100})/g,
    /(?:^|\n)\s*(\d+)\.\s+([A-Z][^\n]{10,80})\n/g, // "1. Introduction"
    /(?:^|\n)\s*Section\s+(\d+)[:\s]+([^\n]{1,100})/gi,
  ]

  let matches: RegExpMatchArray | null = null
  let usedPattern = -1

  // Try each pattern until we find matches
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    const testMatches = pdfText.match(pattern)
    if (testMatches && testMatches.length > 0) {
      matches = testMatches
      usedPattern = i
      break
    }
  }

  if (!matches || matches.length === 0) {
    // No chapters found - return full document
    return {
      chapters: [{
        id: 'full-document',
        title: metadata?.fileName || 'Full Document',
        pageStart: 1,
        pageEnd: metadata?.pageCount,
        level: 1,
        selected: true
      }],
      totalPages: metadata?.pageCount || 1,
      extractionMethod: 'fallback'
    }
  }

  // Process matches
  matches.forEach((match, index) => {
    const parts = match.trim().split(/[:\s]+/, 3)
    const title = parts.length > 2 ? parts.slice(2).join(' ').trim() : parts[1]?.trim() || `Section ${index + 1}`

    chapters.push({
      id: `chapter-${index}`,
      title: title.replace(/\n.*/, '').substring(0, 100), // Clean title
      pageStart: Math.floor((index / matches.length) * (metadata?.pageCount || 100)) + 1, // Estimate page
      level: usedPattern <= 1 ? 1 : 2, // Chapter vs Section
      selected: false
    })
  })

  // Add page end estimates
  chapters.forEach((chapter, index) => {
    if (index < chapters.length - 1) {
      chapter.pageEnd = chapters[index + 1].pageStart - 1
    } else {
      chapter.pageEnd = metadata?.pageCount
    }
  })

  console.log(`✅ Heuristic extraction found ${chapters.length} chapters`)

  return {
    chapters: chapters.slice(0, 50), // Limit to 50 (increased for medical textbooks)
    totalPages: metadata?.pageCount || Math.max(...chapters.map(ch => ch.pageEnd || 0)),
    extractionMethod: 'heuristic'
  }
}

/**
 * Extract text for specific chapters from full PDF text
 * Uses page boundaries to slice the text
 */
export function extractChapterText(
  fullText: string,
  chapters: Chapter[],
  selectedChapterIds: string[]
): string {
  const selectedChapters = chapters.filter(ch => selectedChapterIds.includes(ch.id))

  if (selectedChapters.length === 0) {
    return fullText // Return all if none selected
  }

  // Simple approach: Estimate character positions based on page numbers
  // This is approximate but works well enough for RAG indexing
  const totalPages = Math.max(...chapters.map(ch => ch.pageEnd || 1))
  const charsPerPage = Math.floor(fullText.length / totalPages)

  let extractedText = ''

  selectedChapters.forEach(chapter => {
    const startChar = (chapter.pageStart - 1) * charsPerPage
    const endChar = chapter.pageEnd ? chapter.pageEnd * charsPerPage : fullText.length

    const chapterText = fullText.substring(startChar, Math.min(endChar, fullText.length))
    extractedText += `\n\n=== ${chapter.title} ===\n\n${chapterText}`
  })

  console.log(`📖 Extracted ${extractedText.length} characters from ${selectedChapters.length} chapters`)

  return extractedText.trim()
}
