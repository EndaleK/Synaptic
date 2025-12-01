/**
 * Web Search Integration for Study Buddy
 * Uses Tavily API for AI-optimized search results
 */

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  searchTime: number
}

/**
 * Search the web using Tavily API
 * @param query - The search query
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Search results optimized for AI consumption
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5
): Promise<SearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not configured. Add it to your .env.local file.')
  }

  const startTime = Date.now()

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic', // 'basic' or 'advanced' (advanced costs more)
        include_answer: false, // We want raw results, not Tavily's answer
        include_raw_content: false, // Don't need full HTML
        include_images: false, // Text only for now
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Tavily API error: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    const searchTime = Date.now() - startTime

    // Transform Tavily results to our format
    const results: SearchResult[] = (data.results || []).map((result: any) => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      content: result.content || '',
      score: result.score || 0,
    }))

    return {
      query,
      results,
      searchTime,
    }
  } catch (error) {
    console.error('[WebSearch] Error:', error)
    throw error
  }
}

/**
 * Format search results for AI context
 * @param searchResponse - The search response from Tavily
 * @returns Formatted string for AI prompt
 */
export function formatSearchResultsForAI(searchResponse: SearchResponse): string {
  const { query, results } = searchResponse

  if (results.length === 0) {
    return `No web search results found for: "${query}"`
  }

  let formatted = `Web search results for: "${query}"\n\n`

  results.forEach((result, index) => {
    formatted += `[${index + 1}] ${result.title}\n`
    formatted += `URL: ${result.url}\n`
    formatted += `${result.content}\n\n`
  })

  formatted += `\nInstructions: Use these search results to answer the user's question. Cite sources using [1], [2], etc. when referencing specific results.`

  return formatted
}

/**
 * Determine if a user message requires web search
 * Uses heuristics to detect questions about current events, recent research, etc.
 * @param message - The user's message
 * @returns True if web search is likely needed
 */
export function shouldSearchWeb(message: string): boolean {
  const lowerMessage = message.toLowerCase()

  // Keywords indicating current/recent information needs
  const currentEventKeywords = [
    'latest', 'recent', 'current', 'today', 'this week', 'this month', 'this year',
    'now', 'currently', '2025', '2024', 'new research', 'breaking', 'update'
  ]

  // Keywords indicating web search would be helpful
  const searchIndicators = [
    'search', 'look up', 'find', 'what is happening', 'news about',
    'who won', 'what happened', 'when did', 'where is'
  ]

  // Meta-questions about search capability (answer with demonstration)
  const capabilityQuestions = [
    'can you search',
    'can you look up',
    'can you find',
    'do you have search',
    'are you able to search',
    'can you access the internet',
    'can you browse',
    'do you have internet access'
  ]

  // Check for capability questions (demonstrate by actually searching)
  const isCapabilityQuestion = capabilityQuestions.some(phrase =>
    lowerMessage.includes(phrase)
  )

  // Check for explicit search requests
  const hasSearchIndicator = searchIndicators.some(keyword =>
    lowerMessage.includes(keyword)
  )

  // Check for current event indicators
  const hasCurrentEventKeyword = currentEventKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  )

  // Don't search for document-specific questions
  const isDocumentQuestion = lowerMessage.includes('document') ||
    lowerMessage.includes('pdf') ||
    lowerMessage.includes('in this') ||
    lowerMessage.includes('explain this')

  return (hasSearchIndicator || hasCurrentEventKeyword || isCapabilityQuestion) && !isDocumentQuestion
}

/**
 * Extract source citations from search results
 * @param results - Search results
 * @returns Array of citation strings
 */
export function extractCitations(results: SearchResult[]): string[] {
  return results.map((result, index) =>
    `[${index + 1}] ${result.title} - ${result.url}`
  )
}
