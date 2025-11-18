import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Test route to verify Sentry error tracking
 * Visit: http://localhost:3000/api/test-sentry
 *
 * Expected: Error appears in Sentry dashboard within 1-2 minutes
 *
 * Phase 0: Sentry verification test
 */
export async function GET() {
  try {
    // Trigger a test error
    throw new Error('🧪 Sentry test error - This is expected!')
  } catch (error) {
    // Capture in Sentry with tags
    Sentry.captureException(error, {
      tags: {
        test: 'phase-0-verification',
        feature: 'sentry-setup',
        environment: process.env.NODE_ENV || 'development',
      },
      level: 'info', // Use 'info' level to avoid spamming error dashboard
      extra: {
        note: 'This is a test error from Phase 0 setup',
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Test error sent to Sentry successfully',
      error: error instanceof Error ? error.message : 'Unknown error',
      instructions: [
        '1. Check Sentry Dashboard → Issues',
        '2. Look for: "🧪 Sentry test error - This is expected!"',
        '3. Verify tags: test=phase-0-verification',
        '4. May take 30-60 seconds to appear',
      ],
    }, { status: 200 })
  }
}
