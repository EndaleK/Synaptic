/**
 * Citation Metadata Fetching API
 * Automatically extracts citation information from DOI or URL
 * Uses CrossRef API (free) and fallback to OpenAI for web scraping
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import type { Citation } from '@/lib/supabase/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Fetch metadata from DOI using CrossRef API
 * CrossRef is a free, official DOI registration agency
 */
async function fetchFromDOI(doi: string): Promise<Partial<Citation> | null> {
  try {
    // Clean DOI (remove https://doi.org/ if present)
    const cleanDOI = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')

    // Fetch from CrossRef API (free, no API key needed!)
    const response = await fetch(`https://api.crossref.org/works/${cleanDOI}`, {
      headers: {
        'User-Agent': 'SynapticAI/1.0 (mailto:support@synaptic.ai)' // Polite user agent
      }
    })

    if (!response.ok) {
      console.error('CrossRef API error:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    const work = data.message

    if (!work) {
      return null
    }

    // Extract authors (CrossRef format is complex)
    const authors = work.author
      ? work.author.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).join(', ')
      : 'Unknown Author'

    // Extract publication date
    const pubDate = work.published?.['date-parts']?.[0]
    const publicationDate = pubDate
      ? pubDate.length === 1
        ? String(pubDate[0])
        : pubDate.join('-')
      : undefined

    // Extract publisher
    const publisher = work.publisher || work['container-title']?.[0] || undefined

    // Extract pages
    const pages = work.page || undefined

    // Build citation object
    const citation: Partial<Citation> = {
      author: authors,
      title: work.title?.[0] || 'Untitled',
      publication_date: publicationDate,
      publisher: publisher,
      doi: cleanDOI,
      pages: pages,
      url: `https://doi.org/${cleanDOI}`
    }

    return citation
  } catch (error) {
    console.error('Error fetching from DOI:', error)
    return null
  }
}

/**
 * Extract citation metadata from URL using OpenAI
 * Fetches the webpage and uses AI to extract bibliographic information
 */
async function fetchFromURL(url: string): Promise<Partial<Citation> | null> {
  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SynapticAI/1.0)'
      }
    })

    if (!response.ok) {
      console.error('URL fetch error:', response.status, response.statusText)
      return null
    }

    const html = await response.text()

    // Use OpenAI to extract citation metadata from HTML
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a citation metadata extractor. Extract bibliographic information from the provided HTML. Return JSON with format: {
  "author": "Author Name(s)",
  "title": "Article/Page Title",
  "publication_date": "YYYY-MM-DD or YYYY",
  "publisher": "Publisher/Website Name",
  "url": "original URL",
  "access_date": "YYYY-MM-DD"
}

Look for meta tags (og:title, citation_title, author, etc.), schema.org data, and visible content. Be accurate and conservative - return null for fields you're not confident about.`
        },
        {
          role: 'user',
          content: `Extract citation metadata from this webpage:\n\nURL: ${url}\n\nHTML (first 5000 chars):\n${html.substring(0, 5000)}`
        }
      ],
      temperature: 0.1, // Low temperature for factual extraction
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      return null
    }

    const citation = JSON.parse(result)

    // Add access date if not present
    if (!citation.access_date) {
      citation.access_date = new Date().toISOString().split('T')[0]
    }

    return citation
  } catch (error) {
    console.error('Error fetching from URL:', error)
    return null
  }
}

/**
 * POST /api/citations/fetch-metadata
 * Fetch citation metadata from DOI or URL
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { doi, url } = await request.json()

    if (!doi && !url) {
      return NextResponse.json(
        { error: 'Either doi or url is required' },
        { status: 400 }
      )
    }

    let citation: Partial<Citation> | null = null

    // Try DOI first (more reliable)
    if (doi) {
      citation = await fetchFromDOI(doi)

      if (!citation) {
        return NextResponse.json(
          {
            error: 'Failed to fetch citation from DOI',
            details: 'The DOI may be invalid or not registered with CrossRef'
          },
          { status: 404 }
        )
      }
    }
    // Try URL
    else if (url) {
      citation = await fetchFromURL(url)

      if (!citation) {
        return NextResponse.json(
          {
            error: 'Failed to extract citation from URL',
            details: 'The webpage may be inaccessible or does not contain citation metadata'
          },
          { status: 404 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      citation
    })
  } catch (error: any) {
    console.error('Citation metadata fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch citation metadata',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
