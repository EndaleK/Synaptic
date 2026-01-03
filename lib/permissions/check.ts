// ============================================================================
// PERMISSION CHECKING UTILITIES
// Server-side functions to check user permissions against database
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type { OrganizationRole } from '@/lib/types/institutional'
import { roleHasPermission, canPerformAction, type Permission } from './roles'

// ============================================================================
// USER CONTEXT TYPES
// ============================================================================

export interface UserOrganizationContext {
  userId: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  schoolId: string | null
  schoolName: string | null
  role: OrganizationRole
  isActive: boolean
}

export interface UserContext {
  userId: string
  clerkUserId: string
  email: string
  fullName: string | null
  // Organization context (null if individual user)
  organization: UserOrganizationContext | null
  // Account type
  isInstitutional: boolean
}

// ============================================================================
// GET USER CONTEXT
// ============================================================================

/**
 * Get the full context for a user including their organization membership
 * Returns null if user not found
 */
export async function getUserContext(clerkUserId: string): Promise<UserContext | null> {
  const supabase = await createClient()

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, clerk_user_id, email, full_name')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (profileError || !profile) {
    return null
  }

  // Get organization membership (if any)
  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      school_id,
      role,
      is_active,
      organizations (
        id,
        name,
        slug
      ),
      schools (
        id,
        name
      )
    `)
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .single()

  let organizationContext: UserOrganizationContext | null = null

  if (membership && membership.organizations) {
    const org = membership.organizations as unknown as { id: string; name: string; slug: string }
    const school = membership.schools as unknown as { id: string; name: string } | null

    organizationContext = {
      userId: profile.id,
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      schoolId: school?.id || null,
      schoolName: school?.name || null,
      role: membership.role as OrganizationRole,
      isActive: membership.is_active,
    }
  }

  return {
    userId: profile.id,
    clerkUserId: profile.clerk_user_id,
    email: profile.email,
    fullName: profile.full_name,
    organization: organizationContext,
    isInstitutional: organizationContext !== null,
  }
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Check if a user has a specific permission
 * Returns false if user has no organization membership
 */
export async function checkPermission(
  clerkUserId: string,
  permission: Permission
): Promise<boolean> {
  const context = await getUserContext(clerkUserId)

  if (!context?.organization) {
    return false
  }

  return roleHasPermission(context.organization.role, permission)
}

/**
 * Check if a user can access a specific class
 */
export async function canAccessClass(
  clerkUserId: string,
  classId: string
): Promise<{ allowed: boolean; reason?: string; isOwner?: boolean; isEnrolled?: boolean }> {
  const context = await getUserContext(clerkUserId)

  if (!context) {
    return { allowed: false, reason: 'User not found' }
  }

  const supabase = await createClient()

  // Get class details
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select(`
      id,
      teacher_id,
      school_id,
      schools (
        organization_id
      )
    `)
    .eq('id', classId)
    .single()

  if (classError || !classData) {
    return { allowed: false, reason: 'Class not found' }
  }

  // Check if user is the teacher (owner)
  const isOwner = classData.teacher_id === context.userId

  if (isOwner) {
    return { allowed: true, isOwner: true, isEnrolled: false }
  }

  // Check if student is enrolled
  const { data: enrollment } = await supabase
    .from('class_enrollments')
    .select('id, status')
    .eq('class_id', classId)
    .eq('student_id', context.userId)
    .eq('status', 'active')
    .single()

  const isEnrolled = !!enrollment

  if (isEnrolled) {
    return { allowed: true, isOwner: false, isEnrolled: true }
  }

  // Check if user is an admin in the same organization
  if (context.organization) {
    const school = classData.schools as unknown as { organization_id: string } | null
    const sameOrg = school?.organization_id === context.organization.organizationId

    if (sameOrg && (context.organization.role === 'org_admin' || context.organization.role === 'school_admin')) {
      // Check if school admin is in the same school
      if (context.organization.role === 'school_admin') {
        const sameSchool = classData.school_id === context.organization.schoolId
        if (sameSchool) {
          return { allowed: true, isOwner: false, isEnrolled: false }
        }
      } else {
        // Org admin can access all classes in org
        return { allowed: true, isOwner: false, isEnrolled: false }
      }
    }
  }

  return { allowed: false, reason: 'Not authorized to access this class' }
}

/**
 * Check if a user can manage a specific class (edit, delete, manage students)
 */
export async function canManageClass(
  clerkUserId: string,
  classId: string,
  permission: Permission
): Promise<boolean> {
  const accessCheck = await canAccessClass(clerkUserId, classId)

  if (!accessCheck.allowed) {
    return false
  }

  const context = await getUserContext(clerkUserId)
  if (!context?.organization) {
    return false
  }

  return canPerformAction(context.organization.role, permission, {
    isOwner: accessCheck.isOwner,
    isEnrolled: accessCheck.isEnrolled,
  })
}

/**
 * Check if a user can view/grade a submission
 */
export async function canAccessSubmission(
  clerkUserId: string,
  submissionId: string
): Promise<{ allowed: boolean; canGrade: boolean }> {
  const context = await getUserContext(clerkUserId)

  if (!context) {
    return { allowed: false, canGrade: false }
  }

  const supabase = await createClient()

  // Get submission with assignment and class info
  const { data: submission, error } = await supabase
    .from('assignment_submissions')
    .select(`
      id,
      student_id,
      assignments (
        class_id,
        classes (
          teacher_id,
          school_id,
          schools (
            organization_id
          )
        )
      )
    `)
    .eq('id', submissionId)
    .single()

  if (error || !submission) {
    return { allowed: false, canGrade: false }
  }

  // Student can view their own submission
  if (submission.student_id === context.userId) {
    return { allowed: true, canGrade: false }
  }

  // Check teacher/admin access
  const assignment = submission.assignments as unknown as {
    class_id: string
    classes: {
      teacher_id: string
      school_id: string
      schools: { organization_id: string }
    }
  } | null

  if (!assignment) {
    return { allowed: false, canGrade: false }
  }

  // Teacher owns the class
  if (assignment.classes.teacher_id === context.userId) {
    return { allowed: true, canGrade: true }
  }

  // Admin access
  if (context.organization) {
    const sameOrg = assignment.classes.schools.organization_id === context.organization.organizationId

    if (sameOrg && context.organization.role === 'org_admin') {
      return { allowed: true, canGrade: true }
    }

    if (sameOrg && context.organization.role === 'school_admin') {
      const sameSchool = assignment.classes.school_id === context.organization.schoolId
      if (sameSchool) {
        return { allowed: true, canGrade: true }
      }
    }

    // Teaching assistant in same class can view but not grade
    if (context.organization.role === 'teaching_assistant') {
      // Would need additional check for TA assignment to class
      return { allowed: true, canGrade: false }
    }
  }

  return { allowed: false, canGrade: false }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an action for compliance/audit purposes
 */
export async function logAuditEvent(params: {
  clerkUserId: string
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  const context = await getUserContext(params.clerkUserId)

  if (!context) {
    console.error('Cannot log audit event: user not found')
    return
  }

  const supabase = await createClient()

  await supabase.from('audit_logs').insert({
    organization_id: context.organization?.organizationId,
    user_id: context.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    metadata: params.metadata,
  })
}

// ============================================================================
// HELPER: REQUIRE PERMISSION (throws if not authorized)
// ============================================================================

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Require a permission, throwing UnauthorizedError if not granted
 * Use in API routes for cleaner code
 */
export async function requirePermission(
  clerkUserId: string,
  permission: Permission,
  errorMessage?: string
): Promise<UserContext> {
  const context = await getUserContext(clerkUserId)

  if (!context) {
    throw new UnauthorizedError('User not found')
  }

  if (!context.organization) {
    throw new UnauthorizedError('Not a member of any organization')
  }

  if (!roleHasPermission(context.organization.role, permission)) {
    throw new UnauthorizedError(errorMessage || `Permission denied: ${permission}`)
  }

  return context
}

/**
 * Require class access, throwing UnauthorizedError if not granted
 */
export async function requireClassAccess(
  clerkUserId: string,
  classId: string
): Promise<{ context: UserContext; isOwner: boolean; isEnrolled: boolean }> {
  const context = await getUserContext(clerkUserId)

  if (!context) {
    throw new UnauthorizedError('User not found')
  }

  const access = await canAccessClass(clerkUserId, classId)

  if (!access.allowed) {
    throw new UnauthorizedError(access.reason || 'Not authorized to access this class')
  }

  return {
    context,
    isOwner: access.isOwner || false,
    isEnrolled: access.isEnrolled || false,
  }
}
