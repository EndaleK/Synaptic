/**
 * Syllabus Scraper
 *
 * Searches the web for course syllabi using Tavily API and generates
 * structured course outlines using AI.
 */

import { searchWeb, type SearchResult } from './web-search'
import type {
  CourseInput,
  GeneratedSyllabus,
  SyllabusSearchResult,
  WeeklyScheduleItem,
  SyllabusTextbook,
  SyllabusResource,
} from './supabase/types'

// ============================================================================
// Types
// ============================================================================

export interface SyllabusSearchOptions {
  maxResults?: number
  includeDomains?: string[] // e.g., ['.edu', '.ac.uk']
}

export interface WebContentResult {
  url: string
  title: string
  content: string
  success: boolean
  error?: string
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search for syllabi using Tavily API
 */
export async function searchForSyllabus(
  courseInput: CourseInput,
  options: SyllabusSearchOptions = {}
): Promise<SyllabusSearchResult[]> {
  const { maxResults = 5 } = options

  // Build search queries - try multiple variations for better coverage
  const queries = buildSearchQueries(courseInput)

  // Search with the primary query first
  const primaryQuery = queries[0]
  console.log(`[Syllabus Scraper] Searching: "${primaryQuery}"`)

  try {
    const searchResponse = await searchWeb(primaryQuery, maxResults)

    // Transform and score results
    const results: SyllabusSearchResult[] = searchResponse.results.map((result) => ({
      url: result.url,
      title: result.title,
      snippet: result.content.substring(0, 300),
      confidence: calculateConfidence(result, courseInput),
      source: classifySource(result.url),
    }))

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence)

    // If we don't have enough results, try secondary query
    if (results.length < 3 && queries.length > 1) {
      console.log(`[Syllabus Scraper] Trying secondary query: "${queries[1]}"`)
      try {
        const secondaryResponse = await searchWeb(queries[1], maxResults)
        const secondaryResults = secondaryResponse.results
          .filter((r) => !results.some((existing) => existing.url === r.url))
          .map((result) => ({
            url: result.url,
            title: result.title,
            snippet: result.content.substring(0, 300),
            confidence: calculateConfidence(result, courseInput) * 0.9, // Slight penalty for secondary
            source: classifySource(result.url),
          }))
        results.push(...secondaryResults)
        results.sort((a, b) => b.confidence - a.confidence)
      } catch (err) {
        console.warn('[Syllabus Scraper] Secondary search failed:', err)
      }
    }

    console.log(`[Syllabus Scraper] Found ${results.length} potential syllabi`)
    return results.slice(0, maxResults)
  } catch (error) {
    console.error('[Syllabus Scraper] Search error:', error)
    throw error
  }
}

/**
 * Build search queries from course input
 */
function buildSearchQueries(input: CourseInput): string[] {
  const queries: string[] = []

  // Primary query: university + course code + syllabus
  if (input.courseCode) {
    queries.push(`${input.university} ${input.courseCode} syllabus ${input.semester} ${input.year}`)
  }

  // Secondary: course name + university
  queries.push(`${input.university} "${input.courseName}" syllabus`)

  // Tertiary: just course name and syllabus (broader search)
  queries.push(`${input.courseName} syllabus course outline`)

  return queries
}

/**
 * Calculate confidence score for a search result
 */
function calculateConfidence(result: SearchResult, input: CourseInput): number {
  let score = result.score // Start with Tavily's score

  const urlLower = result.url.toLowerCase()
  const titleLower = result.title.toLowerCase()
  const contentLower = result.content.toLowerCase()
  const combinedText = `${titleLower} ${contentLower}`

  // Boost for .edu domains
  if (urlLower.includes('.edu')) score += 0.2

  // Boost for university name match
  const uniWords = input.university.toLowerCase().split(' ')
  const uniMatch = uniWords.filter((w) => combinedText.includes(w)).length / uniWords.length
  score += uniMatch * 0.15

  // Boost for course code match
  if (input.courseCode && combinedText.includes(input.courseCode.toLowerCase())) {
    score += 0.25
  }

  // Boost for syllabus keywords
  const syllabusKeywords = ['syllabus', 'course outline', 'schedule', 'learning objectives', 'textbook']
  const keywordMatches = syllabusKeywords.filter((k) => combinedText.includes(k)).length
  score += keywordMatches * 0.05

  // Boost for semester/year match
  if (input.semester && combinedText.includes(input.semester.toLowerCase())) score += 0.05
  if (input.year && combinedText.includes(input.year.toString())) score += 0.05

  // Penalty for generic course sites
  if (urlLower.includes('coursera.org') || urlLower.includes('udemy.com')) score -= 0.1
  if (urlLower.includes('ratemyprofessor')) score -= 0.15

  return Math.min(1, Math.max(0, score))
}

/**
 * Classify the source type of a URL
 */
function classifySource(url: string): SyllabusSearchResult['source'] {
  const urlLower = url.toLowerCase()

  if (urlLower.includes('.edu/') || urlLower.includes('.ac.uk/')) {
    if (urlLower.includes('/faculty/') || urlLower.includes('/~') || urlLower.includes('/professor')) {
      return 'professor_page'
    }
    if (urlLower.includes('/catalog/') || urlLower.includes('/courses/')) {
      return 'course_catalog'
    }
    return 'university_site'
  }

  return 'third_party'
}

// ============================================================================
// Content Fetching
// ============================================================================

/**
 * Fetch and extract content from syllabus URLs
 */
export async function fetchSyllabusContent(urls: string[]): Promise<WebContentResult[]> {
  const results: WebContentResult[] = []

  for (const url of urls) {
    try {
      console.log(`[Syllabus Scraper] Fetching: ${url}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SynapticBot/1.0 (+https://synaptic.study/bot)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        results.push({
          url,
          title: '',
          content: '',
          success: false,
          error: `HTTP ${response.status}`,
        })
        continue
      }

      const html = await response.text()

      // Extract content using a simple approach (avoid JSDOM for speed)
      const content = extractTextFromHtml(html)
      const title = extractTitleFromHtml(html)

      results.push({
        url,
        title,
        content: content.substring(0, 15000), // Limit content size
        success: true,
      })
    } catch (error) {
      results.push({
        url,
        title: '',
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Simple HTML text extraction (faster than full DOM parsing)
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

/**
 * Extract title from HTML
 */
function extractTitleFromHtml(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    return titleMatch[1].trim()
  }

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].trim()
  }

  return 'Untitled'
}

// ============================================================================
// AI Syllabus Generation
// ============================================================================

/**
 * Generate a structured syllabus from web content using AI
 */
export async function generateSyllabusFromWeb(
  courseInput: CourseInput,
  webContent: WebContentResult[]
): Promise<GeneratedSyllabus> {
  // Filter successful content
  const successfulContent = webContent.filter((c) => c.success && c.content.length > 500)

  if (successfulContent.length === 0) {
    // Generate from scratch if no web content available
    return generateSyllabusFromScratch(courseInput)
  }

  // Combine web content
  const combinedContent = successfulContent
    .map((c) => `--- Source: ${c.url} ---\n${c.content.substring(0, 8000)}`)
    .join('\n\n')
    .substring(0, 40000) // Limit total content

  const sourceUrls = successfulContent.map((c) => c.url)

  // Build the AI prompt
  const prompt = buildSyllabusGenerationPrompt(courseInput, combinedContent)

  // Call AI to generate structured syllabus
  const syllabus = await callAIForSyllabus(prompt, courseInput, sourceUrls)

  return syllabus
}

/**
 * Generate a syllabus from scratch when no web content is available
 */
async function generateSyllabusFromScratch(courseInput: CourseInput): Promise<GeneratedSyllabus> {
  const prompt = `Generate a realistic university course syllabus for the following course:

University: ${courseInput.university}
Course Code: ${courseInput.courseCode}
Course Name: ${courseInput.courseName}
Program: ${courseInput.program || 'Not specified'}
Semester: ${courseInput.semester} ${courseInput.year}

Create a comprehensive 14-week course syllabus based on typical academic standards for this subject.
Include realistic weekly topics, textbook recommendations, and learning objectives.

IMPORTANT: Since this is generated without real course data, set confidence score to 0.5 or lower.`

  return callAIForSyllabus(prompt, courseInput, [])
}

/**
 * Build the AI prompt for syllabus generation
 */
function buildSyllabusGenerationPrompt(courseInput: CourseInput, webContent: string): string {
  return `You are an expert at extracting and synthesizing course syllabus information.

TASK: Analyze the following web content scraped from university course pages and create a structured course syllabus.

COURSE INFO:
- University: ${courseInput.university}
- Course Code: ${courseInput.courseCode}
- Course Name: ${courseInput.courseName}
- Program: ${courseInput.program || 'Not specified'}
- Semester: ${courseInput.semester} ${courseInput.year}

WEB CONTENT:
${webContent}

INSTRUCTIONS:
1. Extract the weekly schedule, topics, readings, and assignments from the web content
2. If the content is incomplete, fill in reasonable topics based on the course name and typical curricula
3. Identify any textbooks or required materials mentioned
4. Extract learning objectives if present, or generate reasonable ones
5. Note the grading scheme if mentioned

OUTPUT FORMAT: Return a JSON object with this exact structure:
{
  "courseName": "string",
  "courseDescription": "string (2-3 sentences describing the course)",
  "learningObjectives": ["string array of 4-6 objectives"],
  "weeklySchedule": [
    {
      "week": 1,
      "topic": "string",
      "readings": ["string array"],
      "assignments": ["string array"],
      "learningObjectives": ["string array"]
    }
  ],
  "textbooks": [
    {
      "title": "string",
      "authors": ["string array"],
      "isbn": "string or null",
      "required": true/false
    }
  ],
  "gradingScheme": {
    "exams": 40,
    "assignments": 30,
    "participation": 10,
    "project": 20
  },
  "confidenceScore": 0.0-1.0
}

Set confidenceScore based on how much actual course data you found vs. generated:
- 0.8-1.0: Most content from actual syllabus
- 0.5-0.7: Mix of actual and generated content
- 0.2-0.4: Mostly generated based on course name
- 0.0-0.2: Entirely generated, minimal course info found

Return ONLY valid JSON, no markdown or explanation.`
}

/**
 * Call AI to generate the syllabus
 */
async function callAIForSyllabus(
  prompt: string,
  courseInput: CourseInput,
  sourceUrls: string[]
): Promise<GeneratedSyllabus> {
  // Use the AI provider system
  const { getProviderForFeature } = await import('./ai')

  try {
    const provider = getProviderForFeature('syllabus')

    const response = await provider.generateCompletion(prompt, {
      temperature: 0.3, // Lower temperature for more structured output
      maxTokens: 4000,
    })

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Transform to our type
    const syllabus: GeneratedSyllabus = {
      courseName: parsed.courseName || courseInput.courseName,
      courseDescription: parsed.courseDescription || '',
      learningObjectives: parsed.learningObjectives || [],
      weeklySchedule: (parsed.weeklySchedule || []).map((w: any): WeeklyScheduleItem => ({
        week: w.week || 1,
        topic: w.topic || '',
        readings: w.readings || [],
        assignments: w.assignments || [],
        learningObjectives: w.learningObjectives || [],
      })),
      textbooks: (parsed.textbooks || []).map((t: any): SyllabusTextbook => ({
        title: t.title || '',
        authors: t.authors || [],
        isbn: t.isbn,
        required: t.required ?? true,
      })),
      additionalResources: [], // Will be populated from resource APIs
      gradingScheme: parsed.gradingScheme || {},
      sourceUrls,
      confidenceScore: parsed.confidenceScore || 0.5,
    }

    // Ensure we have at least some weekly content
    if (syllabus.weeklySchedule.length === 0) {
      syllabus.weeklySchedule = generateDefaultWeeklySchedule(courseInput.courseName)
      syllabus.confidenceScore = Math.min(syllabus.confidenceScore, 0.3)
    }

    return syllabus
  } catch (error) {
    console.error('[Syllabus Scraper] AI generation error:', error)

    // Return a minimal fallback syllabus
    return {
      courseName: courseInput.courseName,
      courseDescription: `A comprehensive course covering ${courseInput.courseName} at ${courseInput.university}.`,
      learningObjectives: [
        `Understand fundamental concepts of ${courseInput.courseName}`,
        'Apply theoretical knowledge to practical problems',
        'Analyze and evaluate complex scenarios',
        'Communicate findings effectively',
      ],
      weeklySchedule: generateDefaultWeeklySchedule(courseInput.courseName),
      textbooks: [],
      additionalResources: [],
      gradingScheme: {
        'Midterm Exam': 25,
        'Final Exam': 35,
        Assignments: 25,
        Participation: 15,
      },
      sourceUrls,
      confidenceScore: 0.2,
    }
  }
}

/**
 * Generate a default weekly schedule when no data is available
 */
function generateDefaultWeeklySchedule(courseName: string): WeeklyScheduleItem[] {
  const weeks: WeeklyScheduleItem[] = []

  const genericTopics = [
    'Course Introduction and Overview',
    'Foundational Concepts',
    'Core Principles I',
    'Core Principles II',
    'Applications and Case Studies',
    'Advanced Topics I',
    'Midterm Review and Exam',
    'Advanced Topics II',
    'Specialized Topics',
    'Research Methods',
    'Current Trends and Developments',
    'Integration and Synthesis',
    'Final Project Presentations',
    'Course Review and Final Exam',
  ]

  for (let i = 0; i < 14; i++) {
    weeks.push({
      week: i + 1,
      topic: genericTopics[i] || `Week ${i + 1} Topics`,
      readings: [`Chapter ${i + 1}`],
      assignments: i % 2 === 0 ? [`Assignment ${Math.floor(i / 2) + 1}`] : [],
      learningObjectives: [],
    })
  }

  return weeks
}

// ============================================================================
// Main Search and Generate Function
// ============================================================================

/**
 * Complete syllabus search and generation pipeline
 */
export async function searchAndGenerateSyllabus(
  courseInput: CourseInput,
  onProgress?: (step: string, progress: number) => void
): Promise<GeneratedSyllabus> {
  onProgress?.('Searching for syllabi...', 10)

  // Step 1: Search for syllabi
  const searchResults = await searchForSyllabus(courseInput)

  if (searchResults.length === 0) {
    onProgress?.('No syllabi found, generating from course info...', 50)
    return generateSyllabusFromScratch(courseInput)
  }

  onProgress?.(`Found ${searchResults.length} potential syllabi, fetching content...`, 30)

  // Step 2: Fetch content from top results
  const topUrls = searchResults.slice(0, 3).map((r) => r.url)
  const webContent = await fetchSyllabusContent(topUrls)

  onProgress?.('Analyzing content and generating syllabus...', 60)

  // Step 3: Generate structured syllabus
  const syllabus = await generateSyllabusFromWeb(courseInput, webContent)

  onProgress?.('Syllabus generated!', 100)

  return syllabus
}
