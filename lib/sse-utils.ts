/**
 * Server-Sent Events (SSE) Utilities
 *
 * Provides helpers for streaming real-time progress updates from API routes to the frontend.
 * Used for podcast, mindmap, and flashcard generation to show progress as work happens.
 *
 * Usage Example:
 * ```typescript
 * const stream = createSSEStream(async (send) => {
 *   send({ type: 'progress', progress: 20, message: 'Parsing document...' })
 *   // ... do work ...
 *   send({ type: 'progress', progress: 60, message: 'Generating content...' })
 *   // ... more work ...
 *   send({ type: 'complete', data: result })
 * })
 * return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
 * ```
 */

export interface SSEProgressEvent {
  type: 'progress'
  progress: number // 0-100
  message: string
  details?: Record<string, any>
}

export interface SSECompleteEvent<T = any> {
  type: 'complete'
  data: T
}

export interface SSEErrorEvent {
  type: 'error'
  error: string
  details?: Record<string, any>
}

export type SSEEvent<T = any> = SSEProgressEvent | SSECompleteEvent<T> | SSEErrorEvent

/**
 * Format an SSE event for transmission
 * Follows the Server-Sent Events specification
 */
export function formatSSEEvent(event: SSEEvent): string {
  const data = JSON.stringify(event)
  return `data: ${data}\n\n`
}

/**
 * Create a ReadableStream for Server-Sent Events
 *
 * @param handler Async function that receives a `send` function to emit events
 * @returns ReadableStream compatible with Next.js Response
 *
 * @example
 * ```typescript
 * const stream = createSSEStream(async (send) => {
 *   send({ type: 'progress', progress: 0, message: 'Starting...' })
 *   await doWork()
 *   send({ type: 'complete', data: { result: 'success' } })
 * })
 *
 * return new Response(stream, {
 *   headers: {
 *     'Content-Type': 'text/event-stream',
 *     'Cache-Control': 'no-cache',
 *     'Connection': 'keep-alive',
 *   }
 * })
 * ```
 */
export function createSSEStream<T = any>(
  handler: (send: (event: SSEEvent<T>) => void) => Promise<void>
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      // Helper to send events
      const send = (event: SSEEvent<T>) => {
        const formatted = formatSSEEvent(event)
        controller.enqueue(encoder.encode(formatted))
      }

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch (e) {
          // Controller already closed, ignore
          clearInterval(heartbeat)
        }
      }, 15000) // Every 15 seconds

      try {
        // Execute handler
        await handler(send)

        // Clean up
        clearInterval(heartbeat)
        controller.close()
      } catch (error) {
        // Clean up heartbeat first
        clearInterval(heartbeat)

        // Send error event
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? { stack: error.stack } : undefined
        })
        controller.close()
      }
    }
  })
}

/**
 * Progress tracker for multi-step operations
 * Automatically calculates progress based on completed steps
 */
export class ProgressTracker {
  private currentStep = 0
  private readonly totalSteps: number
  private readonly stepNames: string[]
  private readonly sendFn: (event: SSEEvent) => void

  constructor(
    stepNames: string[],
    sendFn: (event: SSEEvent) => void
  ) {
    this.stepNames = stepNames
    this.totalSteps = stepNames.length
    this.sendFn = sendFn
  }

  /**
   * Mark a step as complete and send progress update
   */
  completeStep(stepIndex?: number, customMessage?: string) {
    if (stepIndex !== undefined) {
      this.currentStep = stepIndex
    } else {
      this.currentStep++
    }

    const progress = Math.round((this.currentStep / this.totalSteps) * 100)
    const message = customMessage || this.stepNames[this.currentStep - 1] || 'Processing...'

    this.sendFn({
      type: 'progress',
      progress,
      message,
      details: {
        currentStep: this.currentStep,
        totalSteps: this.totalSteps
      }
    })
  }

  /**
   * Send a progress update without completing a step
   */
  updateProgress(progress: number, message: string, details?: Record<string, any>) {
    this.sendFn({
      type: 'progress',
      progress,
      message,
      details
    })
  }

  /**
   * Get current progress percentage
   */
  getProgress(): number {
    return Math.round((this.currentStep / this.totalSteps) * 100)
  }
}

/**
 * Create SSE response headers
 * Includes Vercel-specific headers for proper streaming
 */
export function createSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
    'X-Vercel-Stream': 'true', // Enable Vercel streaming (critical for production)
  }
}

/**
 * Client-side hook for consuming SSE streams
 * (To be used in React components)
 */
export interface SSEClientOptions {
  onProgress?: (progress: number, message: string, details?: Record<string, any>) => void
  onComplete?: (data: any) => void
  onError?: (error: string, details?: Record<string, any>) => void
}

/**
 * Parse SSE message on client side
 */
export function parseSSEMessage(message: string): SSEEvent | null {
  try {
    // SSE messages are prefixed with "data: "
    const dataPrefix = 'data: '
    if (!message.startsWith(dataPrefix)) {
      return null
    }

    const jsonStr = message.substring(dataPrefix.length).trim()
    if (!jsonStr || jsonStr === ': heartbeat') {
      return null // Ignore heartbeats and empty messages
    }

    return JSON.parse(jsonStr) as SSEEvent
  } catch (error) {
    console.error('Failed to parse SSE message:', error, 'Raw message:', message)
    return null
  }
}
