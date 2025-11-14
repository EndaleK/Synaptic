/**
 * Production-Safe Logging Utility
 *
 * This logger ensures sensitive data is never logged in production
 * and provides structured logging for better debugging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_SERVER = typeof window === 'undefined'

// Sensitive keys that should never be logged
const SENSITIVE_KEYS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'sessionId',
  'jwt',
  'bearer',
  'creditCard',
  'ssn',
  'api_key',
  'access_token',
  'refresh_token',
]

/**
 * Sanitize object to remove sensitive data
 */
function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj

  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(sanitize)
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    )

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Format log message with context
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  if (!context) {
    return `${prefix} ${message}`
  }

  const sanitizedContext = sanitize(context)
  return `${prefix} ${message} ${JSON.stringify(sanitizedContext)}`
}

/**
 * Logger class with production-safe methods
 */
class Logger {
  /**
   * Debug logs - only in development
   */
  debug(message: string, context?: LogContext) {
    if (!IS_PRODUCTION && IS_SERVER) {
      console.log(formatLog('debug', message, context))
    }
  }

  /**
   * Info logs - only in development or with explicit flag
   * Exception: Always log in production for critical operations
   */
  info(message: string, context?: LogContext) {
    if (IS_SERVER) {
      // In production, only log critical info messages
      if (IS_PRODUCTION) {
        // Log critical operations in production for debugging
        const criticalKeywords = ['failed', 'error', 'attempting', 'fallback', 'successful']
        const isCritical = criticalKeywords.some(keyword =>
          message.toLowerCase().includes(keyword)
        )
        if (isCritical) {
          console.log(formatLog('info', message, context))
        }
      } else {
        // Log everything in development
        console.log(formatLog('info', message, context))
      }
    }
  }

  /**
   * Warning logs - production safe
   */
  warn(message: string, context?: LogContext) {
    if (IS_SERVER) {
      console.warn(formatLog('warn', message, context))
    }
  }

  /**
   * Error logs - production safe, always logged
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (IS_SERVER) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: IS_PRODUCTION ? undefined : error.stack,
          name: error.name,
        } : String(error)
      }

      console.error(formatLog('error', message, errorContext))

      // In production, send to error tracking service (Sentry)
      if (IS_PRODUCTION && typeof window === 'undefined') {
        // Sentry will be initialized separately
        // This is where we'd call Sentry.captureException(error)
      }
    }
  }

  /**
   * API logs - structured logging for API routes
   */
  api(method: string, path: string, status: number, duration?: number, context?: LogContext) {
    const logMessage = `API ${method} ${path} - ${status}`
    const logContext = {
      method,
      path,
      status,
      duration: duration ? `${duration}ms` : undefined,
      ...sanitize(context || {}),
    }

    if (status >= 500) {
      this.error(logMessage, undefined, logContext)
    } else if (status >= 400) {
      this.warn(logMessage, logContext)
    } else if (!IS_PRODUCTION) {
      this.info(logMessage, logContext)
    }
  }

  /**
   * Cost tracking logs - for monitoring OpenAI usage
   */
  cost(service: string, tokens: number, estimatedCost: number, context?: LogContext) {
    const logContext = {
      service,
      tokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      ...sanitize(context || {}),
    }

    // Always log cost in server environments
    if (IS_SERVER) {
      console.log(formatLog('info', `Cost: ${service}`, logContext))
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Helper for timing operations
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    logger.debug(`${operation} completed`, { duration: `${duration}ms` })
    return result
  } catch (error) {
    const duration = Date.now() - start
    logger.error(`${operation} failed`, error, { duration: `${duration}ms` })
    throw error
  }
}
