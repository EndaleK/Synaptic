// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC) FOR INSTITUTIONAL FEATURES
// ============================================================================

import type { OrganizationRole } from '@/lib/types/institutional'

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export interface Permissions {
  // Organization
  'org:view': boolean
  'org:edit': boolean
  'org:manage_billing': boolean
  'org:manage_members': boolean
  'org:view_audit_logs': boolean

  // School
  'school:view': boolean
  'school:edit': boolean
  'school:create': boolean
  'school:delete': boolean
  'school:manage_teachers': boolean

  // Class
  'class:create': boolean
  'class:edit': boolean
  'class:delete': boolean
  'class:archive': boolean
  'class:view_students': boolean
  'class:manage_students': boolean
  'class:view_analytics': boolean

  // Content
  'content:create': boolean
  'content:share_to_class': boolean
  'content:share_to_school': boolean
  'content:share_to_org': boolean
  'content:approve_curriculum': boolean

  // Assignments
  'assignment:create': boolean
  'assignment:edit': boolean
  'assignment:delete': boolean
  'assignment:grade': boolean
  'assignment:view_submissions': boolean

  // Analytics
  'analytics:view_class': boolean
  'analytics:view_school': boolean
  'analytics:view_org': boolean
  'analytics:export': boolean
}

export type Permission = keyof Permissions

// ============================================================================
// ROLE PERMISSION MAPPINGS
// ============================================================================

export const ROLE_PERMISSIONS: Record<OrganizationRole, Partial<Permissions>> = {
  org_admin: {
    // Full organization access
    'org:view': true,
    'org:edit': true,
    'org:manage_billing': true,
    'org:manage_members': true,
    'org:view_audit_logs': true,
    // Full school access
    'school:view': true,
    'school:edit': true,
    'school:create': true,
    'school:delete': true,
    'school:manage_teachers': true,
    // Full class access (org admins can create/manage classes too)
    'class:create': true,
    'class:edit': true,
    'class:delete': true,
    'class:archive': true,
    'class:view_students': true,
    'class:manage_students': true,
    'class:view_analytics': true,
    // Full assignment management
    'assignment:create': true,
    'assignment:edit': true,
    'assignment:delete': true,
    'assignment:grade': true,
    'assignment:view_submissions': true,
    // Content management
    'content:create': true,
    'content:share_to_class': true,
    'content:share_to_school': true,
    'content:share_to_org': true,
    'content:approve_curriculum': true,
    // Full analytics
    'analytics:view_class': true,
    'analytics:view_school': true,
    'analytics:view_org': true,
    'analytics:export': true,
  },

  school_admin: {
    // Organization view only
    'org:view': true,
    // School management for their school
    'school:view': true,
    'school:edit': true,
    'school:manage_teachers': true,
    // Class oversight
    'class:view_students': true,
    'class:view_analytics': true,
    // Content
    'content:create': true,
    'content:share_to_class': true,
    'content:share_to_school': true,
    'content:approve_curriculum': true,
    // School-level analytics
    'analytics:view_class': true,
    'analytics:view_school': true,
    'analytics:export': true,
  },

  teacher: {
    // Organization view only
    'org:view': true,
    // School view only
    'school:view': true,
    // Full class management for their classes
    'class:create': true,
    'class:edit': true,
    'class:delete': true,
    'class:archive': true,
    'class:view_students': true,
    'class:manage_students': true,
    'class:view_analytics': true,
    // Content creation and class sharing
    'content:create': true,
    'content:share_to_class': true,
    // Full assignment management
    'assignment:create': true,
    'assignment:edit': true,
    'assignment:delete': true,
    'assignment:grade': true,
    'assignment:view_submissions': true,
    // Class-level analytics
    'analytics:view_class': true,
  },

  teaching_assistant: {
    // Organization view only
    'org:view': true,
    // School view only
    'school:view': true,
    // Limited class access
    'class:view_students': true,
    'class:view_analytics': true,
    // Content creation only
    'content:create': true,
    // View submissions only (no grading by default)
    'assignment:view_submissions': true,
    // View class analytics
    'analytics:view_class': true,
  },

  parent: {
    // Organization view only (for homeschool co-ops/umbrella schools)
    'org:view': true,
    // School view only
    'school:view': true,
    // View linked students' class information (read-only)
    'class:view_students': true,
    'class:view_analytics': true,
    // View assignments and submissions for linked students (no editing/grading)
    'assignment:view_submissions': true,
    // View analytics for linked students
    'analytics:view_class': true,
    'analytics:export': true, // Allow exporting progress reports
  },

  student: {
    // Minimal organization awareness
    'org:view': true,
    'school:view': true,
    // Create their own content
    'content:create': true,
  },
}

// ============================================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: OrganizationRole,
  permission: Permission
): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions?.[permission] === true
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: OrganizationRole): Partial<Permissions> {
  return ROLE_PERMISSIONS[role] || {}
}

/**
 * Check if a role can perform an action on a resource
 * This is a higher-level check that considers resource ownership
 */
export function canPerformAction(
  role: OrganizationRole,
  permission: Permission,
  context?: {
    isOwner?: boolean           // User owns the resource (e.g., teacher owns the class)
    isEnrolled?: boolean        // Student is enrolled in the class
    sameSchool?: boolean        // Resource is in user's school
    sameOrganization?: boolean  // Resource is in user's organization
  }
): boolean {
  // First check base role permission
  if (!roleHasPermission(role, permission)) {
    return false
  }

  // For student role, additional context checks
  if (role === 'student') {
    // Students can only access content if enrolled
    if (permission.startsWith('class:') && !context?.isEnrolled) {
      return false
    }
  }

  // For teacher role, ownership checks for class-specific actions
  if (role === 'teacher') {
    const classSpecificPermissions: Permission[] = [
      'class:edit',
      'class:delete',
      'class:archive',
      'class:manage_students',
      'assignment:create',
      'assignment:edit',
      'assignment:delete',
      'assignment:grade',
      'assignment:view_submissions',
    ]

    if (classSpecificPermissions.includes(permission) && !context?.isOwner) {
      return false
    }
  }

  // For school_admin, check school scope
  if (role === 'school_admin') {
    const schoolScopedPermissions: Permission[] = [
      'school:edit',
      'school:manage_teachers',
      'analytics:view_school',
    ]

    if (schoolScopedPermissions.includes(permission) && !context?.sameSchool) {
      return false
    }
  }

  return true
}

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  org_admin: 100,
  school_admin: 80,
  teacher: 60,
  parent: 50,             // Between teacher and TA - can view but not modify
  teaching_assistant: 40,
  student: 20,
}

/**
 * Check if one role is higher than another in the hierarchy
 */
export function isRoleHigherThan(
  role1: OrganizationRole,
  role2: OrganizationRole
): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

/**
 * Check if a user can manage another user based on role hierarchy
 */
export function canManageUser(
  managerRole: OrganizationRole,
  targetRole: OrganizationRole
): boolean {
  // Only org_admin and school_admin can manage users
  if (managerRole !== 'org_admin' && managerRole !== 'school_admin') {
    return false
  }

  // Can only manage users of lower rank
  return isRoleHigherThan(managerRole, targetRole)
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

export const ROLE_DISPLAY_NAMES: Record<OrganizationRole, string> = {
  org_admin: 'Organization Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  parent: 'Parent/Guardian',
  teaching_assistant: 'Teaching Assistant',
  student: 'Student',
}

export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  org_admin: 'Full access to all organization settings, schools, and users',
  school_admin: 'Manage school settings, teachers, and view all classes',
  teacher: 'Create and manage classes, assignments, and grade students',
  parent: 'View linked students\' progress, assignments, and analytics (read-only)',
  teaching_assistant: 'View classes and submissions, create content',
  student: 'Access enrolled classes and complete assignments',
}

export function getRoleDisplayName(role: OrganizationRole): string {
  return ROLE_DISPLAY_NAMES[role] || role
}

export function getRoleDescription(role: OrganizationRole): string {
  return ROLE_DESCRIPTIONS[role] || ''
}
