import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

/**
 * DEBUG ROUTE: Set admin metadata programmatically
 *
 * This route will set the admin metadata for the current user.
 * Use this if setting metadata in Clerk dashboard doesn't work.
 *
 * Visit: /api/debug/set-admin?role=superadmin
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({
        error: 'Not authenticated',
        authenticated: false,
      }, { status: 401 })
    }

    // Get the role from query params (default to superadmin)
    const { searchParams } = new URL(request.url)
    const adminRole = searchParams.get('role') || 'superadmin'

    // Validate role
    if (!['viewer', 'editor', 'superadmin'].includes(adminRole)) {
      return NextResponse.json({
        error: 'Invalid role',
        validRoles: ['viewer', 'editor', 'superadmin'],
      }, { status: 400 })
    }

    // Update user metadata in Clerk
    const client = await clerkClient()
    const user = await client.users.updateUser(userId, {
      publicMetadata: {
        role: 'admin',
        adminRole: adminRole,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Admin metadata set successfully',
      userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      metadata: user.publicMetadata,
      nextSteps: [
        '1. Sign out completely',
        '2. Clear all browser cookies and storage for localhost',
        '3. Sign back in',
        '4. Visit /api/debug/check-admin to verify',
        '5. Access /admin',
      ],
    })
  } catch (error) {
    console.error('Set admin error:', error)
    return NextResponse.json({
      error: 'Failed to set admin metadata',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
