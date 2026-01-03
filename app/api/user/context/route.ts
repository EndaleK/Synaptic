import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserContext } from '@/lib/permissions'

/**
 * GET /api/user/context
 * Get the current user's context including organization membership
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const context = await getUserContext(userId)
    if (!context) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      userId: context.userId,
      email: context.email,
      fullName: context.fullName,
      organization: context.organization ? {
        organizationId: context.organization.organizationId,
        organizationName: context.organization.organizationName,
        schoolId: context.organization.schoolId,
        schoolName: context.organization.schoolName,
        role: context.organization.role,
      } : null,
    })
  } catch (error) {
    console.error('Error in GET /api/user/context:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
