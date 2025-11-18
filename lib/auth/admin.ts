import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Admin Role Definitions
 *
 * Roles are stored in Clerk user publicMetadata:
 * {
 *   "role": "admin",
 *   "adminRole": "viewer" | "editor" | "superadmin"
 * }
 */

export type AdminRole = 'viewer' | 'editor' | 'superadmin'

export interface AdminUser {
  userId: string
  email: string
  role: AdminRole
  isAdmin: boolean
}

/**
 * Permission levels for different admin roles
 */
const PERMISSIONS = {
  viewer: {
    viewUsers: true,
    viewAnalytics: true,
    viewSystem: true,
    editUsers: false,
    editSystem: false,
    manageAdmins: false,
  },
  editor: {
    viewUsers: true,
    viewAnalytics: true,
    viewSystem: true,
    editUsers: true,
    editSystem: true,
    manageAdmins: false,
  },
  superadmin: {
    viewUsers: true,
    viewAnalytics: true,
    viewSystem: true,
    editUsers: true,
    editSystem: true,
    manageAdmins: true,
  },
} as const

/**
 * Check if the current user is an admin
 *
 * @returns AdminUser if user is admin, null otherwise
 */
export async function checkAdminAccess(): Promise<AdminUser | null> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    // Get user from Clerk
    const user = await clerkClient().users.getUser(userId)

    if (!user) {
      return null
    }

    // Check if user has admin role in publicMetadata
    const metadata = user.publicMetadata as any
    const isAdmin = metadata?.role === 'admin'
    const adminRole = metadata?.adminRole as AdminRole

    if (!isAdmin || !adminRole) {
      return null
    }

    // Validate admin role
    if (!['viewer', 'editor', 'superadmin'].includes(adminRole)) {
      console.warn(`Invalid admin role for user ${userId}: ${adminRole}`)
      return null
    }

    return {
      userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      role: adminRole,
      isAdmin: true,
    }
  } catch (error) {
    console.error('Error checking admin access:', error)
    return null
  }
}

/**
 * Check if admin has specific permission
 *
 * @param adminRole - The admin's role
 * @param permission - The permission to check
 * @returns true if admin has permission
 */
export function hasPermission(
  adminRole: AdminRole,
  permission: keyof typeof PERMISSIONS.viewer
): boolean {
  return PERMISSIONS[adminRole][permission]
}

/**
 * Require admin access for API routes
 * Returns 401 if not authenticated, 403 if not admin
 *
 * @param requiredRole - Optional minimum role required (viewer, editor, superadmin)
 */
export async function requireAdmin(requiredRole?: AdminRole): Promise<AdminUser | NextResponse> {
  const admin = await checkAdminAccess()

  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  // Check role hierarchy if required role specified
  if (requiredRole) {
    const roleHierarchy: AdminRole[] = ['viewer', 'editor', 'superadmin']
    const userRoleLevel = roleHierarchy.indexOf(admin.role)
    const requiredRoleLevel = roleHierarchy.indexOf(requiredRole)

    if (userRoleLevel < requiredRoleLevel) {
      return NextResponse.json(
        { error: `${requiredRole} role required` },
        { status: 403 }
      )
    }
  }

  return admin
}

/**
 * Check if email is whitelisted for admin access
 * Configured via ADMIN_EMAIL_WHITELIST environment variable
 *
 * @param email - Email to check
 * @returns true if email is whitelisted
 */
export function isEmailWhitelisted(email: string): boolean {
  const whitelist = process.env.ADMIN_EMAIL_WHITELIST?.split(',').map(e => e.trim()) || []

  if (whitelist.length === 0) {
    return true // If no whitelist configured, allow all
  }

  return whitelist.includes(email)
}

/**
 * Get all admin permissions for a role
 *
 * @param role - Admin role
 * @returns Object with all permissions
 */
export function getPermissions(role: AdminRole) {
  return PERMISSIONS[role]
}
