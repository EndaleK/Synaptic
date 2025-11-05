/**
 * API Route: Document Topic Detection
 *
 * Uses AI to analyze document structure and extract topics/sections with page ranges
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getProviderForFeature } from '@/lib/ai'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    // 2. Fetch document from database
    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', profile.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 3. Check if document has extracted text
    if (!document.extracted_text || document.extracted_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document has no extracted text. Please ensure the document is processed first.' },
        { status: 400 }
      )
    }

    // 4. Check if topics are already cached in metadata
    if (document.metadata?.topics && Array.isArray(document.metadata.topics)) {
      console.log('📦 Using cached topics from metadata')
      return NextResponse.json({ topics: document.metadata.topics })
    }

    console.log(`🔍 Detecting topics for document: ${document.file_name}`)

    // 5. Use AI to detect topics
    // Truncate text if too long (max ~12K tokens = ~48K chars)
    const maxChars = 48000
    const textToAnalyze = document.extracted_text.length > maxChars
      ? document.extracted_text.substring(0, maxChars)
      : document.extracted_text

    const aiProvider = getProviderForFeature('chat') // Use chat provider for topic detection

    const prompt = `You are analyzing a document to extract its main topics, sections, or chapters.

Document Title: ${document.file_name}
Total Pages: ${document.metadata?.page_count || 'Unknown'}

Document Text (truncated if needed):
${textToAnalyze}

Please analyze this document and identify the main topics, sections, or chapters. For each topic:
1. Provide a clear, concise title
2. Estimate the page range where this topic appears (if page numbers are mentioned in the text)
3. Provide a brief 1-sentence description

IMPORTANT: Return your response as a valid JSON array in this EXACT format:
[
  {
    "id": "topic-1",
    "title": "Introduction to Statistics",
    "description": "Overview of statistical concepts and methods",
    "pageRange": { "start": 1, "end": 10 }
  },
  {
    "id": "topic-2",
    "title": "Probability Theory",
    "description": "Fundamental concepts of probability and distributions",
    "pageRange": { "start": 11, "end": 25 }
  }
]

Guidelines:
- Extract 3-8 main topics (not too many, not too few)
- If page numbers are not explicitly mentioned, make reasonable estimates based on document structure
- Use sequential IDs (topic-1, topic-2, etc.)
- Keep titles concise (3-7 words)
- Keep descriptions to one sentence
- Ensure page ranges don't overlap and cover the document logically
- Return ONLY the JSON array, no other text

JSON Response:`

    const response = await aiProvider.complete(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.3, // Lower temperature for more consistent structure
        maxTokens: 2000
      }
    )

    // 6. Parse AI response
    let topics: any[] = []
    try {
      // Extract JSON from response (handle cases where AI adds markdown code blocks)
      let jsonText = response.content.trim()

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim()
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').trim()
      }

      topics = JSON.parse(jsonText)

      // Validate structure
      if (!Array.isArray(topics)) {
        throw new Error('Response is not an array')
      }

      // Ensure all topics have required fields
      topics = topics.filter(topic =>
        topic.id &&
        topic.title &&
        topic.pageRange &&
        typeof topic.pageRange.start === 'number' &&
        typeof topic.pageRange.end === 'number'
      )

      console.log(`✅ Detected ${topics.length} topics`)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI Response:', response.content)

      // Return empty array if parsing fails
      return NextResponse.json({
        topics: [],
        warning: 'Failed to parse topics from AI response. Please try again or use page range selection.'
      })
    }

    // 7. Cache topics in document metadata
    try {
      const updatedMetadata = {
        ...document.metadata,
        topics,
        topics_detected_at: new Date().toISOString()
      }

      await supabase
        .from('documents')
        .update({ metadata: updatedMetadata })
        .eq('id', documentId)

      console.log('💾 Cached topics in document metadata')
    } catch (cacheError) {
      console.error('Failed to cache topics:', cacheError)
      // Non-fatal error, continue anyway
    }

    // 8. Return topics
    return NextResponse.json({
      topics,
      usage: response.usage
    })

  } catch (error) {
    console.error('Topic detection error:', error)
    return NextResponse.json(
      {
        error: 'Failed to detect topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
