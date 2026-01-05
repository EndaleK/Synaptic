/**
 * Self-Study Plan Generation API
 *
 * POST /api/self-study/generate
 *
 * Generates a self-study plan with curated resources.
 * Uses SSE for progress updates.
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSSEStream, createSSEHeaders, ProgressTracker } from '@/lib/sse-utils'
import { searchAllResources } from '@/lib/resource-apis'
import { generateSelfStudyPlan, saveCoursePlan } from '@/lib/course-plan-generator'
import type { SelfStudyInput, LearningStyle } from '@/lib/supabase/types'

export const maxDuration = 90 // 1.5 minutes for resource search + plan generation
export const runtime = 'nodejs'

interface GenerateRequest {
  input: SelfStudyInput
  createPlan?: boolean
  planOptions?: {
    startDate: string
    endDate: string
    dailyTargetMinutes: number
    includeWeekends: boolean
    learningStyle?: LearningStyle
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: GenerateRequest

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { input, createPlan, planOptions } = body

  if (!input?.subject || !input?.gradeLevel) {
    return new Response(
      JSON.stringify({ error: 'Subject and grade level are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create SSE stream
  const stream = createSSEStream(async (send) => {
    const tracker = new ProgressTracker(
      [
        'Searching for textbooks',
        'Finding video courses',
        'Gathering additional resources',
        'Creating study plan',
      ],
      send
    )

    try {
      // Step 1: Search for textbooks
      tracker.completeStep()
      send({
        type: 'progress',
        progress: 10,
        message: `Finding ${input.subject} textbooks...`,
      })

      const textbookResults = await searchAllResources({
        subject: input.subject,
        level: input.gradeLevel,
        topic: input.specificTopic,
        sources: ['openstax', 'openlibrary', 'google_books'],
        limit: 5,
      })

      send({
        type: 'progress',
        progress: 30,
        message: `Found ${textbookResults.resources.length} textbooks`,
      })

      // Step 2: Search for video courses
      tracker.completeStep()
      send({
        type: 'progress',
        progress: 40,
        message: 'Finding video courses...',
      })

      const courseResults = await searchAllResources({
        subject: input.subject,
        level: input.gradeLevel,
        topic: input.specificTopic,
        sources: ['khan_academy', 'mit_ocw', 'coursera'],
        limit: 5,
      })

      send({
        type: 'progress',
        progress: 60,
        message: `Found ${courseResults.resources.length} courses`,
      })

      // Combine all resources
      const allResources = [...textbookResults.resources, ...courseResults.resources]

      // Step 3: Compile resources
      tracker.completeStep()
      send({
        type: 'progress',
        progress: 70,
        message: 'Organizing resources...',
      })

      // Step 4: Generate study plan if requested
      tracker.completeStep()

      let planId: string | undefined

      if (createPlan && planOptions) {
        send({
          type: 'progress',
          progress: 80,
          message: 'Creating personalized study plan...',
        })

        const plan = await generateSelfStudyPlan(
          userId,
          input,
          allResources,
          {
            startDate: new Date(planOptions.startDate),
            endDate: new Date(planOptions.endDate),
            dailyTargetMinutes: planOptions.dailyTargetMinutes,
            includeWeekends: planOptions.includeWeekends,
            learningStyle: planOptions.learningStyle,
            resources: allResources,
          }
        )

        send({
          type: 'progress',
          progress: 90,
          message: 'Saving study plan...',
        })

        planId = await saveCoursePlan(plan, userId)

        send({
          type: 'progress',
          progress: 100,
          message: 'Study plan created!',
        })

        // Send complete with plan
        send({
          type: 'complete',
          data: {
            resources: allResources,
            plan: {
              id: planId,
              title: plan.title,
              totalHours: plan.totalEstimatedHours,
              sessionsCount: plan.sessionsTotal,
            },
          },
        })
      } else {
        // Just return resources without creating plan
        send({
          type: 'progress',
          progress: 100,
          message: 'Resources found!',
        })

        send({
          type: 'complete',
          data: {
            resources: allResources,
            plan: null,
          },
        })
      }
    } catch (error) {
      console.error('[Self-Study Generate] Error:', error)
      send({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate self-study plan',
      })
    }
  })

  return new Response(stream, { headers: createSSEHeaders() })
}
