/**
 * Content Orchestrator
 *
 * Coordinates automatic content generation based on:
 * - User's learning style (VARK model)
 * - Document analysis (complexity, content types)
 * - Existing content (avoid duplicates)
 *
 * Automatically queues the top 2 most relevant content types
 * for each document based on learning style priorities.
 */

import { createClient } from '@/lib/supabase/server'
import { getDocumentAnalysis, analyzeDocument } from '@/lib/document-analyzer'

// ============================================
// Types
// ============================================

export type ContentType = 'flashcards' | 'podcast' | 'mindmap' | 'exam' | 'study_guide'
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ContentGenerationJob {
  id: string
  documentId: string
  userId: string
  contentType: ContentType
  status: JobStatus
  progressPercent: number
  resultId?: string
  errorMessage?: string
  queuedAt: Date
  completedAt?: Date
}

export interface OrchestrationResult {
  documentId: string
  userId: string
  learningStyle: LearningStyle
  queuedJobs: ContentGenerationJob[]
  skippedTypes: { type: ContentType; reason: string }[]
  analysisId?: string
}

// ============================================
// Learning Style Content Priorities
// ============================================

/**
 * Priority order for content types based on learning style.
 * Higher priority = more effective for that learning style.
 */
const LEARNING_STYLE_PRIORITIES: Record<LearningStyle, ContentType[]> = {
  visual: ['mindmap', 'flashcards', 'exam', 'podcast', 'study_guide'],
  auditory: ['podcast', 'flashcards', 'mindmap', 'exam', 'study_guide'],
  kinesthetic: ['exam', 'flashcards', 'mindmap', 'podcast', 'study_guide'],
  reading_writing: ['flashcards', 'study_guide', 'exam', 'mindmap', 'podcast'],
  mixed: ['flashcards', 'mindmap', 'podcast', 'exam', 'study_guide'],
}

/**
 * Number of content types to auto-generate per document.
 * User preference was "Smart auto-generate top 2".
 */
const AUTO_GENERATE_COUNT = 2

// ============================================
// Job Management Functions
// ============================================

/**
 * Create a new content generation job record.
 */
export async function createGenerationJob(
  documentId: string,
  userId: string,
  contentType: ContentType
): Promise<ContentGenerationJob | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('content_generation_jobs')
    .insert({
      document_id: documentId,
      user_id: userId,
      content_type: contentType,
      status: 'pending',
      progress_percent: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[ContentOrchestrator] Error creating job:', error)
    return null
  }

  return {
    id: data.id,
    documentId: data.document_id,
    userId: data.user_id,
    contentType: data.content_type as ContentType,
    status: data.status as JobStatus,
    progressPercent: data.progress_percent,
    resultId: data.result_id,
    errorMessage: data.error_message,
    queuedAt: new Date(data.queued_at),
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  }
}

/**
 * Update job progress.
 */
export async function updateJobProgress(
  jobId: string,
  progressPercent: number,
  status?: JobStatus
): Promise<void> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {
    progress_percent: progressPercent,
  }

  if (status) {
    updates.status = status
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString()
    }
  }

  await supabase
    .from('content_generation_jobs')
    .update(updates)
    .eq('id', jobId)
}

/**
 * Mark job as completed with result reference.
 */
export async function completeJob(
  jobId: string,
  resultId: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('content_generation_jobs')
    .update({
      status: 'completed',
      progress_percent: 100,
      result_id: resultId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

/**
 * Mark job as failed with error message.
 */
export async function failJob(
  jobId: string,
  errorMessage: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('content_generation_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

/**
 * Get all jobs for a document.
 */
export async function getDocumentJobs(
  documentId: string
): Promise<ContentGenerationJob[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('content_generation_jobs')
    .select('*')
    .eq('document_id', documentId)
    .order('queued_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((job) => ({
    id: job.id,
    documentId: job.document_id,
    userId: job.user_id,
    contentType: job.content_type as ContentType,
    status: job.status as JobStatus,
    progressPercent: job.progress_percent,
    resultId: job.result_id,
    errorMessage: job.error_message,
    queuedAt: new Date(job.queued_at),
    completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
  }))
}

/**
 * Get pending/processing jobs for a user.
 */
export async function getActiveJobs(
  userId: string
): Promise<ContentGenerationJob[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('content_generation_jobs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .order('queued_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map((job) => ({
    id: job.id,
    documentId: job.document_id,
    userId: job.user_id,
    contentType: job.content_type as ContentType,
    status: job.status as JobStatus,
    progressPercent: job.progress_percent,
    resultId: job.result_id,
    errorMessage: job.error_message,
    queuedAt: new Date(job.queued_at),
    completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
  }))
}

// ============================================
// Content Existence Checks
// ============================================

/**
 * Check what content already exists for a document.
 */
async function getExistingContent(
  documentId: string,
  userId: string
): Promise<Set<ContentType>> {
  const supabase = await createClient()
  const existing = new Set<ContentType>()

  // Check flashcards
  const { data: flashcards } = await supabase
    .from('flashcards')
    .select('id')
    .eq('document_id', documentId)
    .limit(1)

  if (flashcards && flashcards.length > 0) {
    existing.add('flashcards')
  }

  // Check podcasts
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('id')
    .eq('document_id', documentId)
    .limit(1)

  if (podcasts && podcasts.length > 0) {
    existing.add('podcast')
  }

  // Check mindmaps
  const { data: mindmaps } = await supabase
    .from('mindmaps')
    .select('id')
    .eq('document_id', documentId)
    .limit(1)

  if (mindmaps && mindmaps.length > 0) {
    existing.add('mindmap')
  }

  // Check mock exams
  const { data: exams } = await supabase
    .from('mock_exams')
    .select('id')
    .eq('document_id', documentId)
    .limit(1)

  if (exams && exams.length > 0) {
    existing.add('exam')
  }

  return existing
}

/**
 * Check for pending/processing jobs for a document.
 */
async function getPendingJobTypes(
  documentId: string
): Promise<Set<ContentType>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('content_generation_jobs')
    .select('content_type')
    .eq('document_id', documentId)
    .in('status', ['pending', 'processing'])

  const pending = new Set<ContentType>()
  if (data) {
    for (const job of data) {
      pending.add(job.content_type as ContentType)
    }
  }

  return pending
}

// ============================================
// Main Orchestration Function
// ============================================

/**
 * Orchestrate content generation for a document.
 *
 * This function:
 * 1. Ensures document is analyzed
 * 2. Determines user's learning style
 * 3. Checks existing content and pending jobs
 * 4. Queues top 2 content types based on learning style
 *
 * @param documentId - The document to generate content for
 * @param userId - The Supabase user profile ID
 * @param options - Optional configuration
 * @returns OrchestrationResult with queued jobs and skipped types
 */
export async function orchestrateGeneration(
  documentId: string,
  userId: string,
  options?: {
    learningStyle?: LearningStyle
    maxJobs?: number
    contentTypes?: ContentType[] // Explicit types to generate
  }
): Promise<OrchestrationResult> {
  const supabase = await createClient()
  const result: OrchestrationResult = {
    documentId,
    userId,
    learningStyle: options?.learningStyle || 'mixed',
    queuedJobs: [],
    skippedTypes: [],
  }

  try {
    // 1. Get document with extracted text
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      console.error('[ContentOrchestrator] Document not found:', docError)
      return result
    }

    if (!document.extracted_text) {
      console.log('[ContentOrchestrator] Document has no extracted text, skipping')
      return result
    }

    // 2. Ensure document is analyzed
    let analysis = await getDocumentAnalysis(documentId)
    if (!analysis) {
      console.log('[ContentOrchestrator] Running document analysis...')
      analysis = await analyzeDocument(
        documentId,
        userId,
        document.extracted_text
      )
      result.analysisId = analysis.id
    }

    // 3. Get user's learning style if not provided
    if (!options?.learningStyle) {
      const { data: learningProfile } = await supabase
        .from('learning_profiles')
        .select('dominant_style')
        .eq('user_id', userId)
        .single()

      if (learningProfile?.dominant_style) {
        result.learningStyle = learningProfile.dominant_style as LearningStyle
      } else {
        // Fallback to user_profiles learning_style
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('learning_style')
          .eq('id', userId)
          .single()

        if (userProfile?.learning_style) {
          result.learningStyle = userProfile.learning_style as LearningStyle
        }
      }
    }

    // 4. Check existing content and pending jobs
    const existingContent = await getExistingContent(documentId, userId)
    const pendingJobs = await getPendingJobTypes(documentId)

    console.log('[ContentOrchestrator] Existing content:', [...existingContent])
    console.log('[ContentOrchestrator] Pending jobs:', [...pendingJobs])

    // 5. Determine which content types to generate
    const priorities = options?.contentTypes || LEARNING_STYLE_PRIORITIES[result.learningStyle]
    const maxJobs = options?.maxJobs ?? AUTO_GENERATE_COUNT

    let queuedCount = 0

    for (const contentType of priorities) {
      if (queuedCount >= maxJobs) break

      // Skip if content already exists
      if (existingContent.has(contentType)) {
        result.skippedTypes.push({
          type: contentType,
          reason: 'Content already exists',
        })
        continue
      }

      // Skip if job already pending/processing
      if (pendingJobs.has(contentType)) {
        result.skippedTypes.push({
          type: contentType,
          reason: 'Job already in progress',
        })
        continue
      }

      // Skip study_guide for now (not implemented)
      if (contentType === 'study_guide') {
        result.skippedTypes.push({
          type: contentType,
          reason: 'Not yet implemented',
        })
        continue
      }

      // Queue the job
      console.log(`[ContentOrchestrator] Queueing ${contentType} generation for ${document.file_name}`)
      const job = await createGenerationJob(documentId, userId, contentType)

      if (job) {
        result.queuedJobs.push(job)
        queuedCount++
      }
    }

    console.log(
      `[ContentOrchestrator] Queued ${result.queuedJobs.length} jobs for ${document.file_name}`,
      result.queuedJobs.map((j) => j.contentType)
    )

    return result
  } catch (error) {
    console.error('[ContentOrchestrator] Error:', error)
    return result
  }
}

/**
 * Get generation status summary for a document.
 */
export async function getGenerationStatus(
  documentId: string
): Promise<{
  jobs: ContentGenerationJob[]
  isComplete: boolean
  pendingCount: number
  failedCount: number
}> {
  const jobs = await getDocumentJobs(documentId)

  const pendingCount = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'processing'
  ).length

  const failedCount = jobs.filter((j) => j.status === 'failed').length

  return {
    jobs,
    isComplete: pendingCount === 0,
    pendingCount,
    failedCount,
  }
}

/**
 * Cancel a pending generation job.
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('content_generation_jobs')
    .update({
      status: 'failed',
      error_message: 'Cancelled by user',
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'pending') // Only cancel pending jobs

  return !error
}

/**
 * Get user's learning style from their profile.
 */
export async function getUserLearningStyle(
  userId: string
): Promise<LearningStyle> {
  const supabase = await createClient()

  // Try learning_profiles first (more detailed)
  const { data: learningProfile } = await supabase
    .from('learning_profiles')
    .select('dominant_style')
    .eq('user_id', userId)
    .single()

  if (learningProfile?.dominant_style) {
    return learningProfile.dominant_style as LearningStyle
  }

  // Fallback to user_profiles
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('learning_style')
    .eq('id', userId)
    .single()

  return (userProfile?.learning_style as LearningStyle) || 'mixed'
}
