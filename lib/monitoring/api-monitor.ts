import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API Monitoring Metrics
 * Tracks performance and errors for API routes
 */
interface ApiMetrics {
  route: string
  method: string
  duration: number
  statusCode: number
  userId?: string
  error?: string
  timestamp: string
}

/**
 * Non-invasive API monitoring wrapper
 *
 * Automatically tracks:
 * - Request latency (sent to Sentry as measurements)
 * - Error rates (captured exceptions)
 * - Slow requests (>3s get flagged with breadcrumb)
 * - User context (if available)
 *
 * Usage:
 * ```typescript
 * // app/api/your-route/route.ts
 * import { withMonitoring } from '@/lib/monitoring/api-monitor'
 *
 * async function handleRequest(req: NextRequest) {
 *   // Your existing logic
 *   return NextResponse.json({ success: true })
 * }
 *
 * export const POST = withMonitoring(handleRequest, '/api/your-route')
 * ```
 *
 * @param handler - Your API route handler function
 * @param routeName - Readable route name for logging (e.g., '/api/generate-flashcards')
 * @returns Wrapped handler with monitoring
 */
export function withMonitoring<T>(
  handler: (req: NextRequest) => Promise<NextResponse>,
  routeName: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const method = req.method

    // Start a Sentry transaction for this request
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${method} ${routeName}`,
      tags: {
        route: routeName,
        method: method,
      },
    })

    // Extract user info from headers if available (Clerk sets x-clerk-user-id)
    const userId = req.headers.get('x-clerk-user-id') || undefined

    try {
      // Execute the actual handler
      const response = await handler(req)
      const duration = Date.now() - startTime
      const statusCode = response.status

      // Build metrics object
      const metrics: ApiMetrics = {
        route: routeName,
        method,
        duration,
        statusCode,
        userId,
        timestamp: new Date().toISOString(),
      }

      // Send measurement to Sentry for performance tracking
      Sentry.setMeasurement('api.duration', duration, 'millisecond')
      Sentry.setMeasurement('api.status_code', statusCode, 'none')

      // Add context to Sentry
      Sentry.setContext('api', {
        route: routeName,
        method,
        duration_ms: duration,
        status_code: statusCode,
      })

      // Set user context if available
      if (userId) {
        Sentry.setUser({ id: userId })
      }

      // Flag slow requests (>3 seconds) with a breadcrumb
      if (duration > 3000) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Slow API request: ${routeName}`,
          level: 'warning',
          data: metrics,
        })

        console.warn('⚠️  Slow API request detected:', {
          route: routeName,
          duration: `${duration}ms`,
          threshold: '3000ms',
        })
      }

      // Log successful request (info level for normal, warn for slow)
      if (process.env.NODE_ENV === 'development') {
        const emoji = duration > 3000 ? '🐌' : duration > 1000 ? '⏱️' : '⚡'
        console.log(`${emoji} API ${method} ${routeName} - ${duration}ms - ${statusCode}`)
      }

      // Finish transaction
      transaction.setStatus('ok')
      transaction.finish()

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Build error metrics
      const metrics: ApiMetrics = {
        route: routeName,
        method,
        duration,
        statusCode: 500,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }

      // Capture exception in Sentry with full context
      Sentry.captureException(error, {
        contexts: {
          api: {
            route: routeName,
            method,
            duration_ms: duration,
          },
        },
        tags: {
          route: routeName,
          method,
        },
        user: userId ? { id: userId } : undefined,
      })

      // Log error
      console.error('❌ API error:', {
        route: routeName,
        method,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Finish transaction with error status
      transaction.setStatus('internal_error')
      transaction.finish()

      // Re-throw the error so the API route can handle it
      throw error
    }
  }
}

/**
 * Utility to manually track custom metrics in API routes
 *
 * Usage:
 * ```typescript
 * trackApiMetric('ai.tokens_used', tokensUsed, 'none')
 * trackApiMetric('db.query_count', queryCount, 'none')
 * ```
 */
export function trackApiMetric(
  name: string,
  value: number,
  unit: 'millisecond' | 'byte' | 'none' = 'none'
) {
  Sentry.setMeasurement(name, value, unit)
}

/**
 * Add context to current API request for better debugging
 *
 * Usage:
 * ```typescript
 * addApiContext('document_processing', {
 *   document_id: documentId,
 *   file_size: fileSize,
 *   processing_mode: 'rag',
 * })
 * ```
 */
export function addApiContext(contextName: string, data: Record<string, any>) {
  Sentry.setContext(contextName, data)
}

/**
 * Mark a specific operation as slow for investigation
 *
 * Usage:
 * ```typescript
 * if (duration > threshold) {
 *   flagSlowOperation('PDF parsing', duration, 5000)
 * }
 * ```
 */
export function flagSlowOperation(
  operationName: string,
  duration: number,
  threshold: number
) {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `Slow operation: ${operationName}`,
    level: 'warning',
    data: {
      operation: operationName,
      duration_ms: duration,
      threshold_ms: threshold,
      exceeded_by_ms: duration - threshold,
    },
  })
}
