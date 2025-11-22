/**
 * UUID Validation Utilities
 *
 * Validates UUID format to prevent SQL injection and malformed queries
 */

// RFC 4122 UUID v4 regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Check if a string is a valid UUID (v4)
 *
 * @param uuid - String to validate
 * @returns true if valid UUID v4 format
 *
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('invalid-uuid') // false
 * isValidUUID('') // false
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false
  }
  return UUID_V4_REGEX.test(uuid)
}

/**
 * Validate a UUID parameter and throw error if invalid
 *
 * Use this in API routes to validate ID parameters before database queries.
 * This prevents SQL errors and potential injection attacks.
 *
 * @param uuid - UUID string to validate
 * @param paramName - Name of the parameter for error messages (default: 'id')
 * @returns The validated UUID (same as input if valid)
 * @throws Error if UUID format is invalid
 *
 * @example
 * ```typescript
 * // In API route handler:
 * export async function GET(req: Request, { params }: { params: { id: string } }) {
 *   try {
 *     const documentId = validateUUIDParam(params.id)
 *     // Now safe to use in database query
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: 'Invalid document ID format' },
 *       { status: 400 }
 *     )
 *   }
 * }
 * ```
 */
export function validateUUIDParam(uuid: string, paramName: string = 'id'): string {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${paramName} format`)
  }
  return uuid
}

/**
 * Validate multiple UUID parameters at once
 *
 * @param uuids - Object mapping parameter names to UUID strings
 * @returns Object with validated UUIDs
 * @throws Error if any UUID is invalid
 *
 * @example
 * ```typescript
 * const { documentId, userId } = validateUUIDs({
 *   documentId: params.documentId,
 *   userId: params.userId
 * })
 * ```
 */
export function validateUUIDs(uuids: Record<string, string>): Record<string, string> {
  const validated: Record<string, string> = {}

  for (const [key, value] of Object.entries(uuids)) {
    validated[key] = validateUUIDParam(value, key)
  }

  return validated
}
