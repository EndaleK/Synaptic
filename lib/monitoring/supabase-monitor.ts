import * as Sentry from '@sentry/nextjs'

/**
 * Supabase Query Performance Monitor
 *
 * Tracks database query performance and detects slow queries.
 * Non-invasive wrapper for Supabase operations.
 */

interface QueryMetrics {
  operation: string
  table: string
  duration: number
  success: boolean
  error?: string
  timestamp: string
}

/**
 * Track a Supabase query with performance monitoring
 *
 * Automatically:
 * - Measures query duration
 * - Detects slow queries (>500ms)
 * - Captures query errors
 * - Sends metrics to Sentry
 *
 * Usage:
 * ```typescript
 * const { data, error } = await trackSupabaseQuery(
 *   'SELECT',
 *   'documents',
 *   () => supabase
 *     .from('documents')
 *     .select('*')
 *     .eq('user_id', userId)
 * )
 * ```
 *
 * @param operation - Query type (SELECT, INSERT, UPDATE, DELETE, RPC)
 * @param table - Table name being queried
 * @param callback - Function that executes the Supabase query
 * @returns Query result from callback
 */
export async function trackSupabaseQuery<T>(
  operation: string,
  table: string,
  callback: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  // Start a Sentry span for this query
  const span = Sentry.startSpan({
    op: 'db.query',
    name: `${operation} ${table}`,
    attributes: {
      'db.operation': operation,
      'db.table': table,
    },
  })

  try {
    // Execute the query
    const result = await callback()
    const duration = Date.now() - startTime

    // Build metrics
    const metrics: QueryMetrics = {
      operation,
      table,
      duration,
      success: true,
      timestamp: new Date().toISOString(),
    }

    // Send measurement to Sentry
    Sentry.setMeasurement(`db.${operation.toLowerCase()}.duration`, duration, 'millisecond')

    // Flag slow queries (>500ms)
    if (duration > 500) {
      Sentry.addBreadcrumb({
        category: 'database',
        message: `Slow query: ${operation} on ${table}`,
        level: 'warning',
        data: {
          ...metrics,
          threshold_ms: 500,
          exceeded_by_ms: duration - 500,
        },
      })

      console.warn('🐌 Slow database query detected:', {
        operation,
        table,
        duration: `${duration}ms`,
        threshold: '500ms',
      })
    }

    // Log query in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = duration > 500 ? '🐌' : duration > 200 ? '⏱️' : '⚡'
      console.log(`${emoji} DB ${operation} ${table} - ${duration}ms`)
    }

    // Finish span
    span?.end()

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    // Build error metrics
    const metrics: QueryMetrics = {
      operation,
      table,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }

    // Capture exception in Sentry
    Sentry.captureException(error, {
      contexts: {
        database: {
          operation,
          table,
          duration_ms: duration,
        },
      },
      tags: {
        db_operation: operation,
        db_table: table,
      },
    })

    // Log error
    console.error('❌ Database query error:', {
      operation,
      table,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Finish span with error
    span?.end()

    // Re-throw the error
    throw error
  }
}

/**
 * Track multiple queries as a batch operation
 *
 * Usage:
 * ```typescript
 * const results = await trackBatchQuery('bulk_insert', 'flashcards', async () => {
 *   const inserts = items.map(item => supabase.from('flashcards').insert(item))
 *   return Promise.all(inserts)
 * })
 * ```
 */
export async function trackBatchQuery<T>(
  operationName: string,
  table: string,
  callback: () => Promise<T>,
  itemCount?: number
): Promise<T> {
  const startTime = Date.now()

  const span = Sentry.startSpan({
    op: 'db.batch',
    name: `Batch ${operationName} on ${table}`,
    attributes: {
      'db.operation': operationName,
      'db.table': table,
      'db.item_count': itemCount || 0,
    },
  })

  try {
    const result = await callback()
    const duration = Date.now() - startTime

    // Calculate per-item duration if count provided
    const perItemDuration = itemCount ? duration / itemCount : duration

    Sentry.setMeasurement('db.batch.duration', duration, 'millisecond')
    if (itemCount) {
      Sentry.setMeasurement('db.batch.per_item_duration', perItemDuration, 'millisecond')
    }

    // Flag slow batch operations (>2s total or >100ms per item)
    if (duration > 2000 || (itemCount && perItemDuration > 100)) {
      Sentry.addBreadcrumb({
        category: 'database',
        message: `Slow batch operation: ${operationName} on ${table}`,
        level: 'warning',
        data: {
          operation: operationName,
          table,
          duration_ms: duration,
          item_count: itemCount,
          per_item_ms: perItemDuration,
        },
      })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ DB Batch ${operationName} ${table} - ${duration}ms ${itemCount ? `(${itemCount} items, ${perItemDuration.toFixed(1)}ms each)` : ''}`)
    }

    span?.end()
    return result
  } catch (error) {
    const duration = Date.now() - startTime

    Sentry.captureException(error, {
      contexts: {
        database: {
          operation: operationName,
          table,
          duration_ms: duration,
          item_count: itemCount,
        },
      },
    })

    console.error('❌ Batch query error:', {
      operation: operationName,
      table,
      duration: `${duration}ms`,
      itemCount,
    })

    span?.end()
    throw error
  }
}

/**
 * Track RPC (Remote Procedure Call) function execution
 *
 * Usage:
 * ```typescript
 * const result = await trackRPCCall('calculate_stats', { user_id: userId })
 * ```
 */
export async function trackRPCCall<T>(
  functionName: string,
  params?: Record<string, any>,
  callback?: () => Promise<T>
): Promise<T | void> {
  const startTime = Date.now()

  const span = Sentry.startSpan({
    op: 'db.rpc',
    name: `RPC ${functionName}`,
    attributes: {
      'db.operation': 'rpc',
      'db.function': functionName,
    },
  })

  try {
    const result = callback ? await callback() : undefined
    const duration = Date.now() - startTime

    Sentry.setMeasurement('db.rpc.duration', duration, 'millisecond')

    // Flag slow RPC calls (>1s)
    if (duration > 1000) {
      Sentry.addBreadcrumb({
        category: 'database',
        message: `Slow RPC call: ${functionName}`,
        level: 'warning',
        data: {
          function: functionName,
          duration_ms: duration,
          params,
        },
      })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ DB RPC ${functionName} - ${duration}ms`)
    }

    span?.end()
    return result as T
  } catch (error) {
    const duration = Date.now() - startTime

    Sentry.captureException(error, {
      contexts: {
        database: {
          operation: 'rpc',
          function: functionName,
          duration_ms: duration,
          params,
        },
      },
    })

    console.error('❌ RPC call error:', { function: functionName, duration: `${duration}ms` })

    span?.end()
    throw error
  }
}

/**
 * Utility to track custom database metrics
 *
 * Usage:
 * ```typescript
 * trackDatabaseMetric('row_count', 1250)
 * trackDatabaseMetric('cache_hit_rate', 0.85)
 * ```
 */
export function trackDatabaseMetric(name: string, value: number) {
  Sentry.setMeasurement(`db.${name}`, value, 'none')
}
