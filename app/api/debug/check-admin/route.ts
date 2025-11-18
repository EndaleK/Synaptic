import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

/**
 * DEBUG ROUTE: Check admin access status
 * Visit this route to see your current Clerk metadata and admin status
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({
        error: 'Not authenticated',
        authenticated: false,
      })
    }

    // Get user from Clerk
    const client = await clerkClient()
    const user = await client.users.getUser(userId)

    // Get metadata
    const metadata = user.publicMetadata as any

    // Check admin status
    const isAdmin = metadata?.role === 'admin'
    const adminRole = metadata?.adminRole

    return NextResponse.json({
      authenticated: true,
      userId,
      email: user.emailAddresses[0]?.emailAddress || '',

      // Current metadata
      publicMetadata: metadata,

      // Admin status
      hasAdminRole: isAdmin,
      adminRoleValue: adminRole,

      // What's needed
      isValid: isAdmin && adminRole && ['viewer', 'editor', 'superadmin'].includes(adminRole),

      // Instructions
      instructions: {
        current: {
          role: metadata?.role || 'NOT SET',
          adminRole: metadata?.adminRole || 'NOT SET',
        },
        needed: {
          role: 'admin',
          adminRole: 'superadmin (or editor/viewer)',
        },
        howToFix: [
          '1. Go to https://dashboard.clerk.com',
          '2. Select your application',
          '3. Go to Users',
          `4. Find user: ${user.emailAddresses[0]?.emailAddress}`,
          '5. Scroll to "Public metadata"',
          '6. Click Edit and add:',
          '   { "role": "admin", "adminRole": "superadmin" }',
          '7. Save and refresh this page',
        ],
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Debug check admin error:', error)
    return NextResponse.json({
      error: 'Failed to check admin status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
