/**
 * User Data Deletion API
 *
 * GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
 * Allows users to request complete deletion of their personal data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { deleteUserData, exportUserData, logDataAccess } from '@/lib/security/data-protection'
import { logger } from '@/lib/logger'
import { applyRateLimit, RateLimits } from '@/lib/rate-limit'

/**
 * DELETE /api/user/delete-data
 * Permanently delete all user data
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limit (prevent abuse)
    const rateLimitResponse = await applyRateLimit(request, RateLimits.default, userId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse confirmation
    const body = await request.json().catch(() => ({}))
    const { confirmDelete, reason } = body

    if (confirmDelete !== 'DELETE_ALL_MY_DATA') {
      return NextResponse.json(
        {
          error: 'Deletion not confirmed',
          message: 'To delete your data, send confirmDelete: "DELETE_ALL_MY_DATA"'
        },
        { status: 400 }
      )
    }

    // Log data access for audit
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await logDataAccess(userId, 'delete', 'all', ipAddress || undefined)

    logger.info('User data deletion requested', {
      userId,
      reason: reason || 'Not specified',
      ipAddress
    })

    // Perform deletion
    const result = await deleteUserData(userId)

    const duration = Date.now() - startTime
    logger.api('DELETE', '/api/user/delete-data', result.success ? 200 : 500, duration, {
      userId,
      deletedCounts: result.deletedCounts,
      errorCount: result.errors.length
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Some data could not be deleted. Please contact support.',
          deletedCounts: result.deletedCounts,
          errors: result.errors
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All your data has been permanently deleted.',
      deletedCounts: result.deletedCounts
    })

  } catch (error) {
    logger.error('Data deletion API error', error)
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/delete-data
 * Export all user data (GDPR Article 20 - Data Portability)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limit
    const rateLimitResponse = await applyRateLimit(request, RateLimits.default, userId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Log data access for audit
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    await logDataAccess(userId, 'export', 'all', ipAddress || undefined)

    logger.info('User data export requested', { userId })

    // Export data
    const result = await exportUserData(userId)

    const duration = Date.now() - startTime
    logger.api('GET', '/api/user/delete-data', result.success ? 200 : 500, duration, {
      userId,
      categories: result.data?.dataCategories
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      )
    }

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(result.data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="synaptic-data-export-${Date.now()}.json"`,
      }
    })

  } catch (error) {
    logger.error('Data export API error', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
