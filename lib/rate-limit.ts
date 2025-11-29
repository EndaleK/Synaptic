/**
 * Rate Limiting Utility
 *
 * Automatically uses Upstash Redis when configured, falls back to in-memory
 * - Production: Distributed rate limiting with Redis
 * - Development: In-memory rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'
import {
  applyRateLimitRedis,
  isRedisConfigured,
  checkRateLimitRedis,
  addRateLimitHeadersRedis,
} from './rate-limit-redis'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  message?: string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (will reset on server restart - acceptable for MVP)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

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
 * Check if request should be rate limited
 */
export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(clientId)

  // No existing entry or window expired
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(clientId, newEntry)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Increment counter
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    logger.warn('Rate limit exceeded', {
      clientId,
      count: entry.count,
      limit: config.maxRequests,
    })

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  userId?: string
) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const clientId = getClientId(req, userId)
    const result = checkRateLimit(clientId, config)

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    }

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

      return NextResponse.json(
        {
          error: config.message || 'Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    // Return null to indicate request should proceed
    // The calling function should add these headers to the response
    return null
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimits = {
  // General API requests
  standard: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please wait a moment.',
  },

  // OpenAI endpoints (expensive)
  ai: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'AI request limit reached. Please wait before generating more content.',
  },

  // Authentication endpoints
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },

  // Document upload (resource intensive)
  upload: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Upload limit reached. Please try again in an hour.',
  },
} as const

/**
 * Helper to apply rate limit to API route handler
 * Automatically uses Redis if configured, falls back to in-memory
 */
export async function applyRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  // Use Redis if configured (production), otherwise use in-memory (development)
  if (isRedisConfigured()) {
    return applyRateLimitRedis(req, config, userId)
  }

  // Fallback to in-memory rate limiting
  const clientId = getClientId(req, userId)
  const result = checkRateLimit(clientId, config)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

    logger.warn('Rate limit exceeded in API route (in-memory)', {
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
}

/**
 * Add rate limit headers to response
 * Automatically uses Redis if configured, falls back to in-memory
 */
export async function addRateLimitHeaders(
  response: NextResponse,
  clientId: string,
  config: RateLimitConfig
): Promise<NextResponse> {
  // Use Redis if configured (production)
  if (isRedisConfigured()) {
    return addRateLimitHeadersRedis(response, clientId, config)
  }

  // Fallback to in-memory
  const entry = rateLimitStore.get(clientId)

  if (entry) {
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set(
      'X-RateLimit-Remaining',
      Math.max(0, config.maxRequests - entry.count).toString()
    )
    response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())
  }

  return response
}
