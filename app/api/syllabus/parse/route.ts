import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ParsedExam {
  name: string
  date: string | null  // ISO format YYYY-MM-DD
  weight: number | null  // Percentage of grade
  topics: string[]
}

interface ParsedTopic {
  name: string
  chapters: string[]
  weight: number | null
  estimatedHours: number | null
}

interface SyllabusParseResult {
  courseName: string | null
  instructor: string | null
  exams: ParsedExam[]
  topics: ParsedTopic[]
  assignmentDates: Array<{ name: string; date: string }>
  rawExtraction: string
}

/**
 * POST /api/syllabus/parse
 * Parse a syllabus document using AI to extract exam dates, topics, and schedule
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { documentId, text } = body

    if (!text && !documentId) {
      return NextResponse.json(
        { error: 'Either documentId or text is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get document text if documentId provided
    let syllabusText = text
    if (documentId && !text) {
      const { data: document } = await supabase
        .from('documents')
        .select('extracted_text, file_name')
        .eq('id', documentId)
        .eq('user_id', profile.id)
        .single()

      if (!document?.extracted_text) {
        return NextResponse.json(
          { error: 'Document not found or has no text' },
          { status: 404 }
        )
      }

      syllabusText = document.extracted_text
    }

    // Truncate text if too long (keep first ~30K chars for context)
    const maxChars = 30000
    if (syllabusText.length > maxChars) {
      syllabusText = syllabusText.substring(0, maxChars) + '\n\n[Content truncated...]'
    }

    // Parse syllabus using AI
    const result = await parseSyllabusWithAI(syllabusText)

    // Save parsed result to database
    if (documentId) {
      await supabase
        .from('parsed_syllabi')
        .upsert({
          user_id: profile.id,
          document_id: documentId,
          course_name: result.courseName,
          instructor: result.instructor,
          exam_dates: result.exams,
          topics: result.topics,
          assignment_dates: result.assignmentDates,
          parsed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,document_id'
        })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error parsing syllabus:', error)
    return NextResponse.json(
      { error: 'Failed to parse syllabus' },
      { status: 500 }
    )
  }
}

/**
 * Use OpenAI to extract structured data from syllabus text
 */
async function parseSyllabusWithAI(text: string): Promise<SyllabusParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const openai = new OpenAI({ apiKey })

  const currentYear = new Date().getFullYear()
  const systemPrompt = `You are an expert at parsing academic syllabi and course outlines. Extract structured information from the provided syllabus text.

Current year for date inference: ${currentYear}

Extract the following information in JSON format:
1. courseName: The course name/title
2. instructor: The instructor/professor name
3. exams: Array of exams with:
   - name: Exam name (e.g., "Midterm 1", "Final Exam")
   - date: Date in YYYY-MM-DD format (infer year if not specified, use ${currentYear} or ${currentYear + 1})
   - weight: Percentage of grade (null if not specified)
   - topics: Array of topics covered in this exam
4. topics: Array of course topics with:
   - name: Topic name
   - chapters: Related chapter numbers/names
   - weight: Estimated importance (null if not specified)
   - estimatedHours: Estimated study hours (null if not specified)
5. assignmentDates: Array of assignments/homework with name and date

Be thorough in extracting ALL exams and topics mentioned. If dates are relative (e.g., "Week 5"), try to calculate the actual date if possible, otherwise leave as null.

Return ONLY valid JSON, no additional text.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Parse this syllabus:\n\n${text}` }
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0]?.message?.content || '{}'

  try {
    const parsed = JSON.parse(content)
    return {
      courseName: parsed.courseName || null,
      instructor: parsed.instructor || null,
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      assignmentDates: Array.isArray(parsed.assignmentDates) ? parsed.assignmentDates : [],
      rawExtraction: content
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError)
    return {
      courseName: null,
      instructor: null,
      exams: [],
      topics: [],
      assignmentDates: [],
      rawExtraction: content
    }
  }
}
