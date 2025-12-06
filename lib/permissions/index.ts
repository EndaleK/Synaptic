// ============================================================================
// PERMISSIONS MODULE
// Role-based access control for institutional features
// ============================================================================

// Role definitions and permission mappings
export {
  type Permissions,
  type Permission,
  ROLE_PERMISSIONS,
  roleHasPermission,
  getRolePermissions,
  canPerformAction,
  isRoleHigherThan,
  canManageUser,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  getRoleDisplayName,
  getRoleDescription,
} from './roles'

// Server-side permission checking
export {
  type UserOrganizationContext,
  type UserContext,
  getUserContext,
  checkPermission,
  canAccessClass,
  canManageClass,
  canAccessSubmission,
  logAuditEvent,
  UnauthorizedError,
  requirePermission,
  requireClassAccess,
} from './check'
