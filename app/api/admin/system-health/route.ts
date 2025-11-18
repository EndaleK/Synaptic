import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/system-health
 * Fetch system health metrics (API, database, storage, AI providers)
 *
 * Requires: viewer role or higher
 */
export async function GET(req: NextRequest) {
  // Check admin access
  const adminOrResponse = await requireAdmin('viewer')
  if (adminOrResponse instanceof NextResponse) {
    return adminOrResponse
  }

  try {
    const supabase = await createClient()

    // Get database health (simple connection test)
    const dbHealthStart = Date.now()
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
      .single()
    const dbLatency = Date.now() - dbHealthStart

    // Mock metrics (In production, these would come from Sentry API or real monitoring)
    // For now, we'll use simple heuristics based on database response

    const metrics = {
      api: {
        status: dbLatency < 1000 ? 'healthy' : dbLatency < 3000 ? 'degraded' : 'down',
        avgLatency: Math.round(dbLatency * 0.8), // Approximate API latency
        errorRate: dbError ? 5.0 : 0.5,
        requestsPerMinute: Math.floor(Math.random() * 50) + 20, // Mock data
      },
      database: {
        status: !dbError && dbLatency < 500 ? 'healthy' : dbLatency < 2000 ? 'degraded' : 'down',
        avgQueryTime: Math.round(dbLatency),
        slowQueries: Math.floor(Math.random() * 5), // Mock data
        activeConnections: Math.floor(Math.random() * 20) + 5, // Mock data
      },
      storage: {
        status: 'healthy' as const, // Supabase storage is usually reliable
        uploadSuccess: 98 + Math.random() * 2, // 98-100%
        avgUploadTime: 2.5 + Math.random() * 1.5, // 2.5-4s
      },
      ai: {
        openai: {
          status: 'healthy' as const,
          avgLatency: 1200 + Math.floor(Math.random() * 800), // 1200-2000ms
        },
        deepseek: {
          status: 'healthy' as const,
          avgLatency: 800 + Math.floor(Math.random() * 600), // 800-1400ms
        },
      },
    }

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('System health check failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch system health',
        metrics: null,
      },
      { status: 500 }
    )
  }
}
