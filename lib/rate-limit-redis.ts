/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Production-ready rate limiter that works across all serverless instances
 * - Uses Upstash Redis for distributed state
 * - Sliding window algorithm
 * - Analytics tracking
 * - Automatic cleanup
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  message?: string
}

// Initialize Redis client from environment variables
let redis: Redis | null = null
const rateLimiters: Map<string, Ratelimit> = new Map()

/**
 * Initialize Redis client (lazy initialization)
 */
function getRedis(): Redis {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis credentials not configured')
    }

    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    logger.info('Upstash Redis initialized for rate limiting')
  }

  return redis
}

/**
 * Get or create rate limiter for specific configuration
 */
function getRateLimiter(config: RateLimitConfig): Ratelimit {
  const key = `${config.maxRequests}-${config.windowMs}`

  if (!rateLimiters.has(key)) {
    const redis = getRedis()
    const windowSeconds = Math.ceil(config.windowMs / 1000)

    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSeconds} s`),
      analytics: true,
      prefix: 'ratelimit:synaptic',
    })

    rateLimiters.set(key, limiter)
    logger.info('Created Upstash rate limiter', {
      maxRequests: config.maxRequests,
      windowSeconds,
    })
  }

  return rateLimiters.get(key)!
}

/**
 * Get client identifier from request
 */
function getClientId(req: NextRequest, userId?: string): string {
  // Prefer user ID if authenticated
  if (userId) return `user:${userId}`

  // Fallback to IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'

  return `ip:${ip}`
}

/**
 * Check if request should be rate limited (Redis-backed)
 */
export async function checkRateLimitRedis(
  clientId: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const limiter = getRateLimiter(config)
    const result = await limiter.limit(clientId)

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
    }
  } catch (error) {
    logger.error('Redis rate limit check failed', { error, clientId })
    // On error, allow request (fail open for availability)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    }
  }
}

/**
 * Apply rate limit to API route (Redis-backed)
 */
export async function applyRateLimitRedis(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  try {
    const clientId = getClientId(req, userId)
    const result = await checkRateLimitRedis(clientId, config)

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

      logger.warn('Rate limit exceeded (Redis)', {
        path: req.nextUrl.pathname,
        clientId,
        method: req.method,
      })

      return NextResponse.json(
        {
          error: config.message || 'Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    return null
  } catch (error) {
    logger.error('Redis rate limit application failed', { error })
    // On error, allow request (fail open for availability)
    return null
  }
}

/**
 * Add rate limit headers to response (Redis-backed)
 */
export async function addRateLimitHeadersRedis(
  response: NextResponse,
  clientId: string,
  config: RateLimitConfig
): Promise<NextResponse> {
  try {
    const result = await checkRateLimitRedis(clientId, config)

    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    return response
  } catch (error) {
    logger.error('Failed to add Redis rate limit headers', { error })
    return response
  }
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}
