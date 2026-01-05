/**
 * Educational Resources Search API
 *
 * GET /api/resources/search
 *
 * Searches multiple educational resource APIs and returns
 * curated results with caching.
 *
 * Query params:
 * - subject: Required. The subject to search for
 * - level: Optional. Educational level (elementary, middle_school, high_school, undergraduate, graduate, professional)
 * - topic: Optional. Specific topic within the subject
 * - sources: Optional. Comma-separated list of sources to search
 * - limit: Optional. Max results per source (default: 5)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { searchAllResources, searchTextbooks, searchCourses } from '@/lib/resource-apis'
import type { EducationalLevel, ResourceSource, EducationalResource } from '@/lib/supabase/types'

export const maxDuration = 60 // 1 minute for multiple API calls

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const subject = searchParams.get('subject')
  const level = searchParams.get('level') as EducationalLevel | null
  const topic = searchParams.get('topic')
  const sourcesParam = searchParams.get('sources')
  const limitParam = searchParams.get('limit')
  const typeParam = searchParams.get('type') // 'textbooks' | 'courses' | 'all'

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 5
  const sources = sourcesParam
    ? (sourcesParam.split(',') as ResourceSource[])
    : undefined

  try {
    // Check cache first
    const supabase = await createClient()
    const cacheKey = `${subject}-${level || 'any'}-${topic || 'any'}-${typeParam || 'all'}`

    const { data: cachedResources } = await supabase
      .from('educational_resources')
      .select('*')
      .eq('subject', subject)
      .gt('expires_at', new Date().toISOString())
      .limit(limit * 6) // Allow for multiple sources

    // If we have enough cached results, return them
    if (cachedResources && cachedResources.length >= limit) {
      console.log(`[Resources API] Returning ${cachedResources.length} cached results`)
      return NextResponse.json({
        resources: cachedResources.slice(0, limit * 2),
        fromCache: true,
      })
    }

    // Fetch fresh results based on type
    let results: EducationalResource[]

    if (typeParam === 'textbooks') {
      results = await searchTextbooks(subject, limit)
    } else if (typeParam === 'courses') {
      results = await searchCourses(subject, level || undefined, limit)
    } else {
      const searchResult = await searchAllResources({
        subject,
        level: level || undefined,
        topic: topic || undefined,
        sources,
        limit,
      })
      results = searchResult.resources
    }

    // Cache new results (upsert to handle duplicates)
    if (results.length > 0) {
      const toCache = results.map((r) => ({
        external_id: r.external_id,
        source: r.source,
        title: r.title,
        authors: r.authors,
        description: r.description,
        url: r.url,
        thumbnail_url: r.thumbnail_url,
        subject,
        level: r.level,
        topics: r.topics,
        resource_type: r.resource_type,
        rating: r.rating,
        reviews_count: r.reviews_count,
      }))

      // Upsert (insert or update on conflict)
      await supabase
        .from('educational_resources')
        .upsert(toCache, { onConflict: 'source,external_id' })
        .select()
    }

    return NextResponse.json({
      resources: results,
      totalFound: results.length,
      fromCache: false,
    })
  } catch (error) {
    console.error('[Resources API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search resources' },
      { status: 500 }
    )
  }
}
