/**
 * Course Syllabus Search API
 *
 * POST /api/course-syllabus/search
 *
 * Searches the web for course syllabi and generates a structured
 * course outline using AI. Uses SSE for progress updates.
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSSEStream, createSSEHeaders, ProgressTracker } from '@/lib/sse-utils'
import { searchForSyllabus, fetchSyllabusContent, generateSyllabusFromWeb } from '@/lib/syllabus-scraper'
import { getResourcesForSyllabus } from '@/lib/resource-apis'
import type { CourseInput, SyllabusSearchResult } from '@/lib/supabase/types'

export const maxDuration = 120 // 2 minutes for web search + AI generation
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let courseInput: CourseInput

  try {
    courseInput = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate required fields
  if (!courseInput.university || !courseInput.courseName) {
    return new Response(
      JSON.stringify({ error: 'University and course name are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create SSE stream
  const stream = createSSEStream(async (send) => {
    const tracker = new ProgressTracker(
      [
        'Searching for syllabi',
        'Fetching course pages',
        'Analyzing content',
        'Generating syllabus',
        'Finding resources',
      ],
      send
    )

    try {
      // Step 1: Search for syllabi
      tracker.completeStep()
      send({
        type: 'progress',
        progress: 10,
        message: `Searching for ${courseInput.courseName} syllabi...`,
      })

      console.log('[Course Syllabus Search] Starting search for:', courseInput.courseName)
      let searchResults: SyllabusSearchResult[] = []
      try {
        searchResults = await searchForSyllabus(courseInput)
        console.log('[Course Syllabus Search] Search completed, found:', searchResults.length, 'results')
      } catch (searchError) {
        console.error('[Course Syllabus Search] Search failed:', searchError)
        // On search error, continue with empty results to allow AI generation
        searchResults = []
        send({
          type: 'progress',
          progress: 20,
          message: 'Web search encountered issues, generating from course info...',
        })
      }

      if (searchResults.length > 0) {
        send({
          type: 'progress',
          progress: 25,
          message: `Found ${searchResults.length} potential syllabi`,
        })
      } else {
        send({
          type: 'progress',
          progress: 25,
          message: 'No syllabi found online, will generate from course information',
        })
      }

      // Step 2: Fetch content from top results (skip if no results)
      tracker.completeStep()

      let webContent: Awaited<ReturnType<typeof fetchSyllabusContent>> = []
      let successfulFetches = 0

      if (searchResults.length > 0) {
        send({
          type: 'progress',
          progress: 35,
          message: 'Fetching course page content...',
        })

        const topUrls = searchResults.slice(0, 3).map((r) => r.url)
        webContent = await fetchSyllabusContent(topUrls)
        successfulFetches = webContent.filter((c) => c.success).length

        send({
          type: 'progress',
          progress: 50,
          message: `Successfully fetched ${successfulFetches} pages`,
        })
      } else {
        send({
          type: 'progress',
          progress: 50,
          message: 'Preparing to generate syllabus...',
        })
      }

      // Step 3: Analyze content
      tracker.completeStep()
      send({
        type: 'progress',
        progress: 60,
        message: 'Analyzing syllabus content...',
      })

      // Step 4: Generate structured syllabus
      tracker.completeStep()
      send({
        type: 'progress',
        progress: 70,
        message: 'Generating course syllabus...',
      })

      const syllabus = await generateSyllabusFromWeb(courseInput, webContent)

      send({
        type: 'progress',
        progress: 85,
        message: `Generated ${syllabus.weeklySchedule.length}-week syllabus`,
        details: {
          weekCount: syllabus.weeklySchedule.length,
          confidenceScore: syllabus.confidenceScore,
        },
      })

      // Step 5: Find recommended resources
      tracker.completeStep()
      send({
        type: 'progress',
        progress: 90,
        message: 'Finding recommended resources...',
      })

      const topics = syllabus.weeklySchedule.slice(0, 5).map((w) => w.topic)
      const resources = await getResourcesForSyllabus(
        courseInput.courseName,
        topics,
        'undergraduate'
      )

      send({
        type: 'progress',
        progress: 100,
        message: 'Complete!',
      })

      // Send final result
      send({
        type: 'complete',
        data: {
          syllabus,
          resources: resources.slice(0, 10),
          searchResults: searchResults.slice(0, 5),
        },
      })
    } catch (error) {
      console.error('[Course Syllabus Search] Error:', error)
      send({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate syllabus',
      })
    }
  })

  return new Response(stream, { headers: createSSEHeaders() })
}
