/**
 * Educational Resource APIs
 *
 * Integrates with multiple educational resource providers:
 * - OpenLibrary (free textbook metadata)
 * - Google Books (book search and previews)
 * - MIT OCW (open courseware)
 * - Khan Academy (free courses)
 * - OpenStax (free textbooks)
 * - Coursera (online courses - via web search fallback)
 */

import type {
  EducationalResource,
  EducationalLevel,
  ResourceSource,
  ResourceType,
} from './supabase/types'

// ============================================================================
// Types
// ============================================================================

export interface ResourceSearchParams {
  subject: string
  level?: EducationalLevel
  topic?: string
  sources?: ResourceSource[]
  limit?: number
}

export interface ResourceSearchResult {
  resources: EducationalResource[]
  totalFound: number
  sources: ResourceSource[]
}

// ============================================================================
// OpenLibrary API
// Free, no API key required
// ============================================================================

async function searchOpenLibrary(
  subject: string,
  limit: number = 5
): Promise<EducationalResource[]> {
  try {
    const query = encodeURIComponent(subject)
    const url = `https://openlibrary.org/search.json?subject=${query}&limit=${limit}`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'SynapticStudy/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`[OpenLibrary] HTTP ${response.status}`)
      return []
    }

    const data = await response.json()

    return (data.docs || []).slice(0, limit).map((doc: any): EducationalResource => ({
      id: `ol-${doc.key}`,
      external_id: doc.key || doc.cover_edition_key || '',
      source: 'openlibrary',
      title: doc.title || 'Untitled',
      authors: doc.author_name || [],
      description: doc.first_sentence?.[0] || '',
      url: `https://openlibrary.org${doc.key}`,
      thumbnail_url: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : undefined,
      subject,
      level: undefined, // OpenLibrary doesn't provide level
      topics: doc.subject?.slice(0, 5) || [],
      resource_type: 'textbook',
      rating: undefined,
      reviews_count: undefined,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  } catch (error) {
    console.error('[OpenLibrary] Error:', error)
    return []
  }
}

// ============================================================================
// Google Books API
// Works without API key (limited quota)
// ============================================================================

async function searchGoogleBooks(
  query: string,
  limit: number = 5
): Promise<EducationalResource[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${limit}&printType=books`

    // Add API key if available for higher quota
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    if (apiKey) {
      url += `&key=${apiKey}`
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`[Google Books] HTTP ${response.status}`)
      return []
    }

    const data = await response.json()

    return (data.items || []).slice(0, limit).map((item: any): EducationalResource => {
      const volumeInfo = item.volumeInfo || {}
      return {
        id: `gb-${item.id}`,
        external_id: item.id,
        source: 'google_books',
        title: volumeInfo.title || 'Untitled',
        authors: volumeInfo.authors || [],
        description: volumeInfo.description?.substring(0, 500) || '',
        url: volumeInfo.infoLink || `https://books.google.com/books?id=${item.id}`,
        thumbnail_url: volumeInfo.imageLinks?.thumbnail,
        subject: volumeInfo.categories?.[0] || '',
        level: undefined,
        topics: volumeInfo.categories || [],
        resource_type: 'textbook',
        rating: volumeInfo.averageRating,
        reviews_count: volumeInfo.ratingsCount,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }
    })
  } catch (error) {
    console.error('[Google Books] Error:', error)
    return []
  }
}

// ============================================================================
// MIT OpenCourseWare
// Scrapes course listings from MIT OCW
// ============================================================================

async function searchMITOCW(
  subject: string,
  limit: number = 5
): Promise<EducationalResource[]> {
  try {
    // Use Tavily to search MIT OCW (more reliable than scraping)
    const { searchWeb } = await import('./web-search')

    const searchQuery = `site:ocw.mit.edu ${subject} course materials`
    const searchResponse = await searchWeb(searchQuery, limit)

    return searchResponse.results.map((result, index): EducationalResource => ({
      id: `mitocw-${index}-${Date.now()}`,
      external_id: result.url,
      source: 'mit_ocw',
      title: result.title.replace(' | MIT OpenCourseWare', '').trim(),
      authors: ['MIT Faculty'],
      description: result.content.substring(0, 500),
      url: result.url,
      thumbnail_url: undefined,
      subject,
      level: 'undergraduate', // MIT courses are typically undergrad/grad level
      topics: [subject],
      resource_type: 'open_course',
      rating: undefined,
      reviews_count: undefined,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  } catch (error) {
    console.error('[MIT OCW] Error:', error)
    return []
  }
}

// ============================================================================
// Khan Academy
// Public API for topic tree
// ============================================================================

async function searchKhanAcademy(
  topic: string,
  level?: EducationalLevel,
  limit: number = 5
): Promise<EducationalResource[]> {
  try {
    // Khan Academy's topic tree is large, so we search their website instead
    const { searchWeb } = await import('./web-search')

    const searchQuery = `site:khanacademy.org ${topic} ${level || ''} course`
    const searchResponse = await searchWeb(searchQuery, limit)

    return searchResponse.results.map((result, index): EducationalResource => ({
      id: `ka-${index}-${Date.now()}`,
      external_id: result.url,
      source: 'khan_academy',
      title: result.title.replace(' | Khan Academy', '').trim(),
      authors: ['Khan Academy'],
      description: result.content.substring(0, 500),
      url: result.url,
      thumbnail_url: undefined,
      subject: topic,
      level: level || 'high_school',
      topics: [topic],
      resource_type: 'video_course',
      rating: undefined,
      reviews_count: undefined,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  } catch (error) {
    console.error('[Khan Academy] Error:', error)
    return []
  }
}

// ============================================================================
// OpenStax
// Free, peer-reviewed textbooks
// ============================================================================

async function searchOpenStax(
  subject: string,
  limit: number = 5
): Promise<EducationalResource[]> {
  try {
    // OpenStax has a limited catalog, so we search their website
    const { searchWeb } = await import('./web-search')

    const searchQuery = `site:openstax.org ${subject} textbook`
    const searchResponse = await searchWeb(searchQuery, limit)

    return searchResponse.results
      .filter((r) => r.url.includes('openstax.org/details/books/'))
      .map((result, index): EducationalResource => ({
        id: `os-${index}-${Date.now()}`,
        external_id: result.url,
        source: 'openstax',
        title: result.title.replace(' - OpenStax', '').trim(),
        authors: ['OpenStax'],
        description: result.content.substring(0, 500),
        url: result.url,
        thumbnail_url: undefined,
        subject,
        level: 'undergraduate',
        topics: [subject],
        resource_type: 'ebook',
        rating: undefined,
        reviews_count: undefined,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }))
  } catch (error) {
    console.error('[OpenStax] Error:', error)
    return []
  }
}

// ============================================================================
// Coursera
// Uses web search (partner API requires agreement)
// ============================================================================

async function searchCoursera(
  subject: string,
  level?: EducationalLevel,
  limit: number = 5
): Promise<EducationalResource[]> {
  try {
    const { searchWeb } = await import('./web-search')

    const levelText = level ? getLevelText(level) : ''
    const searchQuery = `site:coursera.org ${subject} ${levelText} course`
    const searchResponse = await searchWeb(searchQuery, limit)

    return searchResponse.results
      .filter((r) => r.url.includes('coursera.org/learn/') || r.url.includes('coursera.org/specializations/'))
      .map((result, index): EducationalResource => ({
        id: `coursera-${index}-${Date.now()}`,
        external_id: result.url,
        source: 'coursera',
        title: result.title.replace(' | Coursera', '').trim(),
        authors: [], // Coursera courses have various instructors
        description: result.content.substring(0, 500),
        url: result.url,
        thumbnail_url: undefined,
        subject,
        level: level || 'undergraduate',
        topics: [subject],
        resource_type: 'video_course',
        rating: undefined,
        reviews_count: undefined,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }))
  } catch (error) {
    console.error('[Coursera] Error:', error)
    return []
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLevelText(level: EducationalLevel): string {
  switch (level) {
    case 'elementary':
      return 'elementary kids'
    case 'middle_school':
      return 'middle school'
    case 'high_school':
      return 'high school'
    case 'undergraduate':
      return 'undergraduate college'
    case 'graduate':
      return 'graduate masters PhD'
    case 'professional':
      return 'professional certification'
    default:
      return ''
  }
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Search all configured educational resource APIs
 */
export async function searchAllResources(
  params: ResourceSearchParams
): Promise<ResourceSearchResult> {
  const {
    subject,
    level,
    topic,
    sources = ['openlibrary', 'google_books', 'mit_ocw', 'khan_academy', 'openstax', 'coursera'],
    limit = 5,
  } = params

  const searchQuery = topic ? `${subject} ${topic}` : subject
  const allResources: EducationalResource[] = []
  const searchedSources: ResourceSource[] = []

  // Run searches in parallel for speed
  const searchPromises: Promise<EducationalResource[]>[] = []

  if (sources.includes('openlibrary')) {
    searchedSources.push('openlibrary')
    searchPromises.push(searchOpenLibrary(searchQuery, limit))
  }

  if (sources.includes('google_books')) {
    searchedSources.push('google_books')
    searchPromises.push(searchGoogleBooks(searchQuery, limit))
  }

  if (sources.includes('mit_ocw')) {
    searchedSources.push('mit_ocw')
    searchPromises.push(searchMITOCW(searchQuery, limit))
  }

  if (sources.includes('khan_academy')) {
    searchedSources.push('khan_academy')
    searchPromises.push(searchKhanAcademy(topic || subject, level, limit))
  }

  if (sources.includes('openstax')) {
    searchedSources.push('openstax')
    searchPromises.push(searchOpenStax(searchQuery, limit))
  }

  if (sources.includes('coursera')) {
    searchedSources.push('coursera')
    searchPromises.push(searchCoursera(subject, level, limit))
  }

  // Wait for all searches to complete
  const results = await Promise.allSettled(searchPromises)

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allResources.push(...result.value)
    }
  })

  // Deduplicate by URL
  const uniqueResources = Array.from(
    new Map(allResources.map((r) => [r.url, r])).values()
  )

  // Sort by source priority and quality
  const sortedResources = uniqueResources.sort((a, b) => {
    // Prioritize sources with ratings
    if (a.rating && !b.rating) return -1
    if (!a.rating && b.rating) return 1
    if (a.rating && b.rating) return b.rating - a.rating

    // Then by source type preference
    const sourcePriority: Record<ResourceSource, number> = {
      openstax: 1,     // Free, high quality
      mit_ocw: 2,      // Free, prestigious
      openlibrary: 3,  // Free books
      khan_academy: 4, // Free courses
      google_books: 5, // May require purchase
      coursera: 6,     // Often paid
    }

    return (sourcePriority[a.source] || 10) - (sourcePriority[b.source] || 10)
  })

  return {
    resources: sortedResources,
    totalFound: sortedResources.length,
    sources: searchedSources,
  }
}

/**
 * Search for textbooks specifically
 */
export async function searchTextbooks(
  subject: string,
  limit: number = 10
): Promise<EducationalResource[]> {
  const results = await searchAllResources({
    subject,
    sources: ['openstax', 'openlibrary', 'google_books'],
    limit,
  })

  return results.resources.filter(
    (r) => r.resource_type === 'textbook' || r.resource_type === 'ebook'
  )
}

/**
 * Search for video courses specifically
 */
export async function searchCourses(
  subject: string,
  level?: EducationalLevel,
  limit: number = 10
): Promise<EducationalResource[]> {
  const results = await searchAllResources({
    subject,
    level,
    sources: ['mit_ocw', 'khan_academy', 'coursera'],
    limit,
  })

  return results.resources.filter(
    (r) => r.resource_type === 'video_course' || r.resource_type === 'open_course'
  )
}

/**
 * Get recommended resources for a course syllabus
 */
export async function getResourcesForSyllabus(
  courseName: string,
  topics: string[],
  level: EducationalLevel = 'undergraduate'
): Promise<EducationalResource[]> {
  const allResources: EducationalResource[] = []

  // Search for course-level resources
  const courseResources = await searchAllResources({
    subject: courseName,
    level,
    limit: 5,
  })
  allResources.push(...courseResources.resources)

  // Search for topic-specific resources (limit to first 3 topics to avoid rate limits)
  for (const topic of topics.slice(0, 3)) {
    try {
      const topicResources = await searchAllResources({
        subject: courseName,
        topic,
        level,
        sources: ['openstax', 'khan_academy'],
        limit: 2,
      })
      allResources.push(...topicResources.resources)
    } catch (error) {
      console.warn(`[Resource APIs] Failed to search for topic "${topic}":`, error)
    }
  }

  // Deduplicate
  return Array.from(new Map(allResources.map((r) => [r.url, r])).values())
}
