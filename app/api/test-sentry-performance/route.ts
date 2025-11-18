import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Test route to verify Sentry performance monitoring
 * Visit: http://localhost:3000/api/test-sentry-performance
 *
 * Expected: Transaction appears in Sentry Performance tab
 *
 * Phase 0: Sentry performance verification test
 */
export async function GET() {
  // Start a transaction for performance tracking
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'Phase 0 - Sentry Performance Test',
    tags: {
      test: 'phase-0-verification',
      feature: 'performance-monitoring',
    },
  })

  try {
    // Simulate some work (1.5 second delay)
    const startTime = Date.now()
    await new Promise(resolve => setTimeout(resolve, 1500))
    const duration = Date.now() - startTime

    // Add custom measurements
    Sentry.setMeasurement('test.simulated_work', duration, 'millisecond')
    Sentry.setMeasurement('test.expected_duration', 1500, 'millisecond')

    // Add context
    Sentry.setContext('test_details', {
      note: 'This is a test transaction from Phase 0 setup',
      timestamp: new Date().toISOString(),
      expected_duration: '~1500ms',
    })

    // Finish transaction
    transaction.finish()

    return NextResponse.json({
      success: true,
      message: 'Performance test completed successfully',
      duration: `${duration}ms`,
      instructions: [
        '1. Check Sentry Dashboard → Performance',
        '2. Look for transaction: "Phase 0 - Sentry Performance Test"',
        '3. Verify duration: ~1500ms',
        '4. Check custom measurements in transaction details',
        '5. May take 2-3 minutes to appear',
      ],
    }, { status: 200 })
  } catch (error) {
    // Capture any errors
    Sentry.captureException(error)
    transaction.setStatus('internal_error')
    transaction.finish()

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
