/**
 * Test API Route for Rate Limiting
 *
 * Tests both in-memory and Redis-based rate limiting
 * Visit this endpoint multiple times to trigger rate limit
 */

import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'
import { isRedisConfigured } from '@/lib/rate-limit-redis'

export async function GET(request: NextRequest) {
  // Apply strict rate limit for testing (5 requests per minute)
  const testConfig = {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Test rate limit exceeded. Wait 1 minute.',
  }

  const rateLimitResponse = await applyRateLimit(request, testConfig)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Get client IP for display
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

  return NextResponse.json({
    success: true,
    message: 'Rate limit test endpoint',
    ratelimit: {
      mode: isRedisConfigured() ? 'Redis (Distributed)' : 'In-Memory (Local)',
      configured: isRedisConfigured(),
      limit: testConfig.maxRequests,
      window: '60 seconds',
    },
    client: {
      ip,
    },
    timestamp: new Date().toISOString(),
  })
}
